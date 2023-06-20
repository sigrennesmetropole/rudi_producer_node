/**
 * Mongo DB interface.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */

// const util = require('util');
// const BasicFileEntry = require('./basicfile.js');
// const basicdb = require('./basicdb.js');
const mongodb = require("mongodb");

/**
 * Basic interface for the storage of LOG events MongoDB.
 *
 * @class
 * @param {json}        config       - The DB configuration with the MongoDB URL and its name.
 * @param {object}      schemaSet    - the schemas DB
 * @param {string}      mediaSchema  - the name of the media schema
 * @param {string}      eventSchema  - the name of the event schema
 */
function MongoService(config, schemaSet, mediaSchema, urlSchema, eventSchema) {
    this.disabled = (config.disabled !== undefined) && (config.disabled == true);
    this.mongoClient = mongodb.MongoClient;
    this.schemaSet = schemaSet;
    this.mediaSchema = mediaSchema;
    this.urlSchema = urlSchema;
    this.eventSchema = eventSchema;
    this.mongoServerURL = (config.db_url === undefined ? "mongodb://localhost:27017/" : config.db_url);
    this.dbname = (config.db_name === undefined ? "rudi_media" : config.db_name);
    this.mongoOptions = (config.db_options === undefined ? {} : config.db_options);
    this.mediaCollName = "media";
    this.urlCollName = "url";
    this.eventCollName = "media_events";
    this.mongodb = null;
    this.db = null;
    this.mediaColl = null;
    this.urlColl = null;
    this.eventColl = null;
    this.currentError = null;
}

/* eslint-disable no-multi-spaces, indent */
/**
 * Open the Mongo DB using the class level parameters
 * A first collection is create for medias, and a second one for events.
 *
 * Has race conditions (#RC). In case njs starts to get (//) one day.
 *
 * @param {function}   errcb     - the error callback
 * @param {function}   done      - the success callback
 */
MongoService.prototype.open = function(errcb, done) {
    try {
        if (typeof this.mongoOptions == "string") {
            const so = this.mongoOptions;
            this.mongoOptions = {};
            this.mongoOptions = JSON.parse(so);
        }
    }
    catch (err) { errcb(this, err); }
    if (this.disabled) errcb(this, "Connexion disabled");

    this.mongoClient.connect(this.mongoServerURL, this.mongoOptions, function(err, db) {
        if (err) { this.service.currentError = err; if (errcb) errcb(this.service, err); return; }
        const errFct = function(reason) {
            if (!this.cb) return;
            this.service.currentError = reason;
            this.cb(this.service, reason); // #RC
            this.cb = null;
        }.bind({service:this, cb:errcb});
        const doneFct = function() {
            if (!this.cb) return;
            this.cb(this.service); // #RC
            this.cb = null;
        }.bind({service:this, cb:done});

        this.service.mongodb = db;
        this.service.db = db.db(this.service.dbname);
        this.service.db.listCollections().toArray(async function(err, colList) {
            if (err) { errFct(err); return; }
            let hasMedia = false, hasUrl = false, hasEvents = false;
            for (c of colList) {
                hasMedia  |= (c.name == this.service.mediaCollName);
                hasUrl    |= (c.name == this.service.urlCollName);
                hasEvents |= (c.name == this.service.eventCollName);
            }
            try {
                if (hasMedia) {
                    this.service.mediaColl = this.service.db.collection(this.service.mediaCollName);
                    await this.service.mediaColl.drop();
                }
                if (hasUrl) {
                    this.service.urlColl = this.service.db.collection(this.service.urlCollName);
                    await this.service.urlColl.drop();
                }
                if (hasEvents) {
                    this.service.eventColl = this.service.db.collection(this.service.eventCollName);
                    await this.service.eventColl.drop();
                }
            }
            catch (err) { errFct(err); }

            // Command CollMod returns nothing according to the doc....
            // console.log(this.service.schemaSet.toBson(this.service.mediaSchema));
            // this.service.mediaColl = this.service.db.collection(this.service.mediaCollName);
            this.service.db.createCollection(this.service.mediaCollName, function(err, col) {
                if (err) { errFct(err); return; }
                this.service.mediaColl = col;
                this.service.mediaColl.createIndex({ "uuid":1 });
                this.service.mediaColl.createIndex({ "zone":1, "uuid":1 });
                this.service.db.command({ collMod: this.service.mediaCollName,
                                          validator: { "$jsonSchema": this.service.schemaSet.toBson(this.service.mediaSchema) },
                                          validationLevel: "strict",
                                          validationAction: "error" }).then(doneFct, errFct);
            }.bind({service:this.service}));

            this.service.db.createCollection(this.service.urlCollName, function(err, col) {
                if (err) { errFct(err); return; }
                this.service.urlColl = col;
                this.service.urlColl.createIndex({ "uuid":1 });
                this.service.urlColl.createIndex({ "zone":1, "uuid":1 });
                this.service.db.command({ collMod: this.service.urlCollName,
                                          validator: { "$jsonSchema": this.service.schemaSet.toBson(this.service.urlSchema) },
                                          validationLevel: "strict",
                                          validationAction: "error" }).then(doneFct, errFct);
            }.bind({service:this.service}));

            // this.service.eventColl = this.service.db.collection(this.service.eventCollName);
            this.service.db.createCollection(this.service.eventCollName, function(err, col) {
                if (err) { errFct(err); return; }
                this.service.eventColl = col;
                this.service.eventColl.createIndex({ "uuid":1 });
                this.service.eventColl.createIndex({ "uuid":1, "date":1 });
                this.service.db.command({ collMod: this.service.eventCollName,
                                          validator: { "$jsonSchema": this.service.schemaSet.toBson(this.service.eventSchema) },
                                          validationLevel: "strict",
                                          validationAction: "error" }).then(doneFct, errFct);
            }.bind({service:this.service}));
        }.bind({service:this.service}));
    }.bind({service:this}));
};
/**
 * Add a new media
 * The media must be an already initialized @BasicFileEntry object.
 *
 * @param {BasicFileEntry}   media   - a fileEntry object.
 * @param {function}         err     - the error callback
 * @param {function}         done    - the success callback
 */
MongoService.prototype.addMedia = async function(media, err, done) {
    if (!this.mediaColl || !this.eventColl) { err("Collections not initialized"); return; }
    const errFct  = function(reason) { if (err) err("Media insertion error: "+reason, this.service); }.bind({service:this});
    const doneFct = function()       { if (done) done(this.service); }.bind({service:this});

    if (!("uuid" in media) || !("zone" in media)) { errFct("Malformed media descriptor"); return; }

    try {
        if ("url" in media) {
            const emedia =  await this.urlColl.findOne({ "uuid": media.uuid });
            // if (!emedia) console.log('URL add '+util.inspect(media));
            if (!emedia) this.urlColl.insertOne(media).then(doneFct, errFct);
            else         this.urlColl.updateOne({ "uuid": media.uuid }, { "$set": media }).then(doneFct, errFct);
        }
        else {
            const emedia =  await this.mediaColl.findOne({ "uuid": media.uuid });
            // if (!emedia) console.log('MEDIA add '+util.inspect(media));
            if (!emedia) this.mediaColl.insertOne(media).then(doneFct, errFct);
            else         this.mediaColl.updateOne({ "uuid": media.uuid }, { "$set": media }).then(doneFct, errFct);
        }
    }
    catch (err) { errFct(err); }
};

/**
 * Add a new event
 * The event must reference an object.
 *
 * @param {BasicFileEntry}   opdesc  - an operation description.
 * @param {function}         err     - the error callback
 * @param {function}         done    - the success callback
 * @param {function}         update  - update fields, by defaulf off
 */
MongoService.prototype.addEvent = async function(opdesc, err, done, update) {
    if (!this.mediaColl || !this.eventColl) { err("Collections not initialized"); return; }
    const errFct = function(reason) { if (err) err("Media event error: "+reason, this.service); }.bind({service:this});
    const doneFct = function()      { if (done) done(this.service); }.bind({service:this});

    if (!("uuid" in opdesc) || !("zone" in opdesc)) { errFct("Malformed operation descriptor"); return; }

    // const emedia = false;
    if (!(update === undefined)) {
        this.eventColl.findOne({ "uuid": opdesc.uuid }, function(err, emedia) {
            if (err) { errFct(err); }
            else if (!emedia) this.eventColl.insertOne(opdesc).then(doneFct, errFct);
            else              this.eventColl.updateOne({ "uuid": opdesc.uuid }, { "$set": opdesc }).then(doneFct, errFct);
        });
        // if (!emedia) console.log('MEDIA update '+emedia);
    }
    else this.eventColl.insertOne(opdesc).then(doneFct, errFct);
};
/* eslint-enable no-multi-spaces, indent */

/**
 * Close the DB interface
 *
 * @param {function}   errcb    - the error callback
 */
MongoService.prototype.close = function(errcb, done) {
    if (!this.db) { if (errcb) errcb(this, "DB not initialized"); return; }
    this.mongodb.close();
    if (done) done(this);
};

module.exports = MongoService;
