/**
 * Basic Media database
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
// const fs = require('fs');
// const util = require('util');
// const crypto = require('crypto');
require("./cycle.js"); // For Json Unparsing
const BasicZone = require("./basiczone.js");

/**
 * Represents a basic media DB.
 * @class
 *
 * @classdesc The basic media DB manage the list and the access of basic media ({BasicFileEntry}).
 * It is initialized by the path of the media directory, and by an optional CSV file name. If undefined
 * it as to be located in the media directory (list.csv).
 *
 * @param {string} mediaDir - The media directory path
 * @param {object} logger   - The logging interface
 * @param {object} mongodb  - The mongo database interface
 */
function BasicFileDB(mediaDir, acldb, logger, mongodb, timeout) {
    this.mediaDir = mediaDir;
    this.acldb = acldb;
    this.syslog = logger;
    this.logid = "db";
    this.connectorTimeout = timeout;
    this.mongodb = mongodb;

    this.zone_db = {};
    this.storageId = {};
    this.db = {};

    this.default_zone = "zone1";
};

/* eslint-disable no-multi-spaces */
/**
 * Generate a logger context.
 *
 * @param {object}    data - The error message.
 */
BasicFileDB.prototype.convertContext = function(opname, cid, aclStatus) {
    const context = aclStatus && aclStatus.context;
    const auth    = context && context.auth ? Object.assign({}, context.auth) : { userId: -1, userName: "-", reqIP: "-", access:"---" };
    const source  = (context && context.source !== undefined) ? opname +":"+ context.source : opname;
    const id      = (cid !== undefined)            ? cid                         : "-";
    auth.clientApp = "media/db";
    return { auth: auth, operation: { opType:source, statusCode: 200, id:id  } };
};
/* eslint-enable no-multi-spaces */

/**
 * Interface the error logger
 *
 * @param {string}    message - The error message.
 */
BasicFileDB.prototype.error = function(message, context = null) { this.syslog.error(message, this.logid, context); };
BasicFileDB.prototype.warn = function(message, context = null) { this.syslog.warn(message, this.logid, context); };
BasicFileDB.prototype.info = function(message, context = null) { this.syslog.info(message, this.logid, context); };
BasicFileDB.prototype.notice = function(message, context = null) { this.syslog.notice(message, this.logid, context); };
BasicFileDB.prototype.debug = function(message, context = null) { this.syslog.info(message, this.logid, context); };

/**
 * Interface the error logger with contexts.
 *
 * @param {string}    message - The error message.
 * @param {string}    context - The context.
 */
BasicFileDB.prototype.errorCtx = function(message, name, cid, aclStatus) {
    this.syslog.error(message, this.logid, this.convertContext(name, cid, aclStatus), undefined);
};

/* eslint-disable no-multi-spaces */
/**
 * Interface the data info logger in order to describe data sets.
 *
 * @param {object}    data - The error message.
 */
BasicFileDB.prototype.logReq = function(aclStatus, data) {
    let header = "do="+data.operation+" zone="+data.zone+" uuid="+data.uuid;
    if (data.uuid != data.ref) header += " ref="+data.ref;
    let extra = "";
    let context = undefined;
    if (data.operation === "add_media"    || data.operation === "stage_media" ||
        data.operation === "commit_media" || data.operation === "list_media"  || data.operation === "delete_media") {
        if ("url" in data.value) extra = " url="+data.value.url;
        else                     extra = " file="+data.value.filename;
        context = this.convertContext(data.operation, data.uuid, aclStatus);
    }
    else if (data.operation === "check_entry" || data.operation === "new_conn" || data.operation === "del_conn") {
        context = this.convertContext(data.operation, data.uuid, aclStatus);
    }
    else if (data.operation === "acc_conn") {
        context = this.convertContext(data.operation, data.uuid, aclStatus);
    }
    this.syslog.info(header+extra, this.logid, context, data.operation, data);
};
/* eslint-enable no-multi-spaces */

/* eslint-disable guard-for-in */
/**
 * Initialize the file database with existing zones.
 *
 * @param {list}      media_files - The list of files/zones to load.
 * @param {function=} none        - An callback with the error if problems while closing.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.init = function(zones, withmongo, none, done) {
    if (!withmongo) this.mongodb = null;

    let defzone = null;
    if (typeof zones == "string") zones = [ zones ];
    for (zoneDesc of zones) {
        if (typeof zoneDesc == "string") zoneDesc = { name: zoneDesc };
        const nzone = new BasicZone(this.acldb, this.mediaDir, zoneDesc);
        this.warn(`[${nzone.name}]: csv=${nzone.csv} dir=${nzone.dirname}`);
        this.zone_db[nzone.name] = nzone;
        if (!defzone) defzone = nzone.name;
    }
    if (defzone) this.default_zone = defzone;
    else {
        const zoneConf = { name:this.default_zone, csv:this.default_csvFile };
        this.zone_db[this.default_zone] = new BasicZone(this.acldb, this.mediaDir, zoneConf);
    }

    // Initialize all zones.
    const entrycb = function(aclStatus, zone, entry) {
        this.bfdb.recordEntry(aclStatus, zone, entry);
    }.bind({bfdb:this});
    const initFct = function(resolve, reject) {
        this.zone.init(entrycb, reject, resolve);
    };

    const pl = [];
    for (zi in this.zone_db) {
        pl.push(new Promise(initFct.bind({zone:this.zone_db[zi]})));
    }
    Promise.all(pl).then(null, function(err) {
        throw new Error("Could not open Zone: "+err);
    });
};

/**
 * Close the file database, and flush all pending events.
 *
 * @param {function=} none        - An callback with the error if problems while closing.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.close = function(none, done) {
    const errFct = function(err) {
        this.service.error("Could not close DB: "+err);
        if (none) none("Could not close file database: "+err);
    }.bind({service:this});

    const closeAllZones = function(none, done) {
        const pl = [];
        for (zi in this.zone_db) {
            const zone = this.zone_db[zi];
            pl.push(new Promise(function(resolve, reject) {
                this.service.warn("Close zone "+this.zone.name);
                this.zone.close(reject, resolve);
            }.bind({service:this.service, zone: zone})));
        }
        Promise.all(pl).then(function() {
            this.service.warn("All zone closed");
            if (this.done) this.done();
        }.bind({service:this.service, done:this.done}), function(err) {
            this.service.error("Could not close all zones: "+err);
            if (this.none) this.none("Could not close all zones: "+err);
        }.bind({service:this.service, none:this.none}));
    }.bind({zone_db:this.zone_db, service:this, none:none, done:done});

    const sId = Object.keys(this.storageId);
    if (sId.length > 0) {
        const pl = [];
        for (fileid of sId) {
            pl.push(new Promise(function(resolve, reject) {
                this.service.deleleteFileId(this.fileid, { source: "interruption" }, reject, resolve);
            }.bind({service:this, fileid:fileid})));
        }
        Promise.all(pl).then(closeAllZones, errFct);
    }
    else closeAllZones(none, done);
};
/* eslint-enable guard-for-in */

/**
 * Low level append a new basic media entry.
 *
 * @private
 * @param {string}    zone        - The name of the storage and access control zone.
 * @param {object}    context     - The request context.
 * @param {function=} entry       - The media entry to add.
 * @param {function=} none        - An callback with the error if meta-data are malformed.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.recordEntry = function(aclStatus, zone, entry, none, done) {
    try {
        const opdesc = { operation: "add_media", uuid: entry.uuid, ref: entry.uuid, zone: zone.name, context: aclStatus.context.toJson(), value: entry.toJson() };
        const doneFct = function(entry) {
            this.service.db[entry.uuid] = entry;
            this.service.logReq(aclStatus, opdesc);
            if (done) done(opdesc);
        }.bind({service:this});

        const errFct = function(err) {
            this.service.warn("Could not update DB (init add): "+err+"; with "+JSON.safeStringify(opdesc));
            doneFct(entry); // We stand at a warning level for Mongo up to now.
        }.bind({service:this});
        if (this.mongodb) {
            this.mongodb.addMedia(entry.toJson(), errFct, function(mongodb) {
                this.mongodb.addEvent(opdesc, errFct, function(mongodb) {
                    doneFct(entry);
                });
            }.bind({service:this, mongodb:this.mongodb}));
        }
        else doneFct(entry);
    }
    catch (err) {
        this.errorCtx("Invalid media entry: "+err+" entry: "+entry.toJson(), "add_media", "-", aclStatus);
        if (none) none(err);
    }
};

/**
 * Add a new basic media entry.
 *
 * @param {json}      metadata,   - The meta-data dictionary
 * @param {buffer}    filecontent - The raw file content
 * @param {function=} none        - An optional callback with the error if meta-data are malformed
 * @param {function=} done        - An optional callback with the entry when done.
 */
BasicFileDB.prototype.addEntry = function(metadata, aclStatus, filecontent, none, done) {
    if (!("media_type" in metadata)) {
        this.errorCtx("(ignored) Missing media type: "+ JSON.safeStringify(metadata), "add_media", "-", aclStatus);
        metadata.media_type = "FILE";
    }
    if (!("media_id" in metadata)) {
        this.errorCtx("Missing media UUID: "+ JSON.safeStringify(metadata), "add_media", "-", aclStatus);
        if (none) none("Missing media UUID", 400);
        return;
    }
    if (!("access_date" in metadata)) metadata.access_date = new Date();
    else {
        metadata.access_date = parseInt(metadata.access_date)*1000;
        metadata.access_date = new Date(metadata.access_date);
    }
    if (("file_size" in metadata) && (filecontent.length != metadata.file_size)) {
        this.errorCtx("(ignored) inconsistent provided file size: "+metadata.file_size+" received: "+filecontent.length, "add_media", metadata.media_id, aclStatus);
    }
    if (Object.keys(this.zone_db).length <= 0) {
        this.errorCtx("DB not ready", "add_media", metadata.media_id, aclStatus);
        if (none) none("DB not ready", 400);
        return;
    }

    const zone = this.zone_db[this.default_zone];
    const errFct = function(err, code) {
        this.service.errorCtx("could not add entry: "+err, "add_media", metadata.media_id, aclStatus);
        if (none) none(err, code);
    }.bind({service:this});
    const addStepEntry = function(message) {
        this.service.notice("[add_media]:"+message);
    }.bind({service:this});
    const addDone = function(entry, commitId = null) {
        this.service.notice("new file: name="+entry.uuid+" size="+entry.size+" ("+filecontent.length+") hash="+entry.md5);
        let logType = "stage_media";
        if (!commitId) {
            logType = "add_media";
            this.service.db[entry.uuid] = entry;
        }
        const zname = this.zone.name;
        const finalDone = function() { if (this.done) this.done(zname, commitId); }.bind({done:done});
        this.service.logEntry(zone, logType, aclStatus, entry, none, finalDone);
    }.bind({service:this, zone:zone});
    zone.newBasicEntryFromMetadata(metadata, filecontent, aclStatus, errFct, addStepEntry, addDone);
};

BasicFileDB.prototype.commit = function(zoneName, commitId, aclStatus, none, done) {
    if (Object.keys(this.zone_db).length <= 0) {
        this.errorCtx("DB not ready", "commit_media", zoneName, aclStatus);
        if (none) none("DB not ready", 400);
        return;
    }

    if (!(zoneName in this.zone_db)) {
        this.errorCtx("Zone "+zoneName+" not found", "commit_media", zoneName, aclStatus);
        if (none) none("Zone "+zoneName+" not found", 404);
        return;
    }
    const zone = this.zone_db[zoneName];

    const commitDone = function(staging) {
        const entry = staging.entry;
        this.service.notice("commit file: name="+entry.uuid);
        this.service.db[entry.uuid] = entry;
        this.service.logEntry(zone, "commit_media", aclStatus, entry, none, done);
    }.bind({service:this});

    zone.commitEntry(aclStatus, commitId, function(err, code) {
        this.service.errorCtx(err, "commit_media", zoneName, aclStatus);
        if (none) none(err, code);
    }.bind({service:this}), commitDone);
};


BasicFileDB.prototype.mdelete = function(uuid, aclStatus, none, done) {
    if (!(uuid in this.db)) {
        const errstr = "media "+uuid+" not found";
        this.errorCtx(errstr, "delete_media", uuid, aclStatus);
        if (none) none(errstr, 404);
        return;
    }
    const entry = this.db[uuid];
    const zone = entry.zone;
    const deleteDone = function(entry) {
        delete this.service.db[entry.uuid];
        this.service.notice("delete file: name="+entry.uuid);
        this.service.logEntry(zone, "delete_media", aclStatus, entry, none, done);
    }.bind({service:this});

    zone.deleteEntry(aclStatus, uuid, function(err, code) {
        this.service.errorCtx(err, "delete_media", uuid, aclStatus);
        if (none) none(err, code);
    }.bind({service:this}), deleteDone);
};

/**
 * Low level append a new basic media entry.
 *
 * @private
 * @param {string}    zone        - The name of the storage and access control zone.
 * @param {object}    context     - The request context.
 * @param {function=} entry       - The media entry to add.
 * @param {function=} none        - An callback with the error if meta-data are malformed.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.logEntry = function(zone, type, aclStatus, entry, none, done) {
    try {
        const context = aclStatus.context;
        const opdesc = { operation: type, uuid: entry.uuid, ref: entry.uuid, zone: zone.name, context: context.toJson(), value: entry.toJson() };
        const doneFct = function(entry) {
            this.service.logReq(aclStatus, opdesc);
            if (done) done();
        }.bind({service:this});
        const errFct = function(err) {
            this.service.warn("Could not update DB (add): "+err+" with "+JSON.safeStringify(opdesc));
            doneFct(entry); // We stand at a warning level for Mongo up to now.
        }.bind({service:this});
        if (this.mongodb) {
            this.mongodb.addMedia(entry.toJson(), errFct, function(mongodb) {
                this.mongodb.addEvent(opdesc, errFct, function(mongodb) {
                    doneFct(entry);
                });
            }.bind({service:this, mongodb:this.mongodb}));
        }
        else doneFct(entry);
    }
    catch (err) {
        this.errorCtx("Invalid media entry: "+err+" entry: "+entry.getCSVline(), "add_media", "-", aclStatus);
        if (none) none(err);
    }
};

/* eslint-disable guard-for-in */
BasicFileDB.prototype.list = function(aclStatus) {
    const mediaList = {};
    let count = 0, total = 0, errors = 0;
    for (zoneName in this.zone_db) {
        const zone = this.zone_db[zoneName];
        try {
            count += 1;
            const content = zone.listMedias(aclStatus);
            this.notice("list medias: count="+Object.keys(content).length);
            this.debug("list medias: name="+JSON.safeStringify(content));
            mediaList[zoneName] = {
                "list": content, "status": "OK"
            };
            total += content.length;
        }
        catch (err) {
            errors += 1;
            this.errorCtx(err.toString(), "list_media", zoneName, aclStatus);
            mediaList[zoneName] = {
                "list": [], "status": err.toString()
            };
        }
    }
    mediaList["count"] = count;
    mediaList["total"] = total;
    mediaList["errors"] = errors;
    return mediaList;
};
/* eslint-enable guard-for-in */

/**
 * Require an access to a media, and returns a connector ID if the access is granted.
 * This function creates a unique connector, and a timer to remove it on time.
 *
 * @param   {string}   uuid  - The media UUID.
 * @returns {string}         - A unique connector ID.
 */
BasicFileDB.prototype.get = function(uuid, aclStatus) {
    if (!(uuid in this.db)) return null;
    const media = nid = this.db[uuid];
    try {
        const niddesc = media.generateFileId();
        let connectorTimeout = this.connectorTimeout;
        if ("timeout" in niddesc) {
            connectorTimeout = niddesc["timeout"];
        }
        this.storageId[niddesc.fileid] = niddesc;
        const opdesc = { operation: "new_conn", uuid: niddesc.fileid, ref: uuid, zone: niddesc.zone, context: aclStatus.context.toJson() };
        this.logReq(aclStatus, opdesc);

        const errFct = function(err) {
            this.service.error("Could not update DB (new): "+err+" with "+JSON.safeStringify(this.desc));
        }.bind({service:this, desc:opdesc});
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, errFct, function(mongodb) {});
        }

        setTimeout(function() {
            this.bfdb.deleleteFileId(this.fileid, aclStatus, errFct, function(mongodb) {});
        }.bind({bfdb:this, fileid: niddesc.fileid}), connectorTimeout * 1000);
        return niddesc.fileid;
    }
    catch (err) {
        const e = "Could not process media with "+uuid+" "+aclStatus.context;
        this.error(e +": "+err);
        if (none) none(e);
        return null;
    }
};

/**
 * Delete a storage connector.
 *
 * @private
 * @param   {string}   fileid  - The file UUID.
 */
BasicFileDB.prototype.deleleteFileId = function(fileid, aclStatus, none, done) {
    if (fileid in this.storageId) {
        const niddesc = this.storageId[fileid];
        delete this.storageId[fileid];
        const opdesc = { operation: "del_conn", uuid: niddesc.fileid, ref: niddesc.ref, zone: niddesc.zone, context: aclStatus.context.toJson(), value: niddesc };
        this.logReq(aclStatus, opdesc);
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, none.bind({service:this, desc:opdesc}), done);
        }
    }
};

/**
 * Send the media content using a connector ID.
 * This function records the access and provide the necessary information to load the data.
 *
 * @param   {string}   uuid - The connector UUID.
 * @param {function=} none   - An optional callback with the error.
 * @param {function}  done   - An callback with the media content, the name, and the mime type.
 */
BasicFileDB.prototype.find = function(fileid, aclStatus, none, done) {
    if (!(fileid in this.storageId)) {
        const errmsg = "media connector id \""+fileid+"\" not found";
        this.errorCtx(errmsg, "get_media", fileid, aclStatus);
        if (none) none(errmsg, 404);
        return;
    }
    const now = new Date();
    const iddesc = this.storageId[fileid];
    const accessEntry = { date:now, client: aclStatus.context.toJson()};
    const opdesc = { operation: "acc_conn", uuid: iddesc.fileid, ref:iddesc.ref, zone: iddesc.zone, context: accessEntry };
    this.logReq(aclStatus, opdesc);
    const errFct = function(err) {
        this.service.error("Could not update DB (get): "+err+" with "+JSON.safeStringify(opdesc));
    }.bind({service:this});
    if (this.mongodb) {
        this.mongodb.addEvent(opdesc, errFct, function(mongodb) {});
    }
    iddesc.count += 1;
    iddesc.access.push(accessEntry);

    // Load the data asynchronously
    const media = this.db[iddesc.ref];
    media.getFile(iddesc, function(err, code) {
        this.service.errorCtx("could not load file: "+err, "get_media", fileid, aclStatus);
        if (none) none(err, code);
    }.bind({service:this}), done);
};

/**
 * Require check the real content of a media, and returns its updated MD5 value.
 *
 * @param  {string}   uuid  - The media UUID.
 * @return {string}         - The MD5 value.
 */
BasicFileDB.prototype.check = function(uuid, aclStatus, none, done) {
    if (!(uuid in this.db)) return none("media uuid not found", 404);
    const media = this.db[uuid];
    try {
        const opdesc = { operation: "check_entry", uuid: "-", ref: media.uuid, zone: media.zone.name, context: aclStatus.context.toJson() };
        this.logReq(aclStatus, opdesc);
        media.getRealMd5(none, done);

        const errFct = function(err) {
            this.service.error("Could not update DB (check): "+err+" with "+JSON.safeStringify(opdesc));
        }.bind({service:this});
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, errFct, function(mongodb) {});
        }
        return media.md5;
    }
    catch (err) {
        const e = "Could not process media: with "+uuid+" "+aclStatus.context;
        this.error(e +": "+err);
        if (none) none(e, 500);
        return null;
    }
};

/**
 * Generate a Json Schema for an *event* with the proper registering URL.
 *
 * @param {string}     contextRef - The name of the context schema.
 * @returns {string}              - The name Json schema.
 */
BasicFileDB.eventSchema = function(contextRef) {
    return {
        "title": "The RUDI media DB event Schema",
        "description": "The descriptor of an event associated to a RUDI media DB access.",
        "type": "object",
        "properties": {
            "operation": {
                "description": "The operation done",
                "type": "string",
                "enum": [ "add_media", "stage_media", "commit_media", "check_entry", "new_conn", "del_conn", "acc_conn" ]
            },
            "uuid": {
                "description": "The open storage access uuid",
                "type": "string",
                "format": "uuid"
            },
            "ref": {
                "description": "The media-id",
                "type": "string",
                "format": "uuid"
            },
            "zone": {
                "description": "The storage zone",
                "type": "string"
            },
            "value": {
                "description": "The object manipulated by the operation",
                "type": "object"
            },
            "context": {"description":"The creaction context", "$ref":contextRef }
        },
        "required": [ "operation", "uuid", "ref" ]
    };
};

module.exports = BasicFileDB;
