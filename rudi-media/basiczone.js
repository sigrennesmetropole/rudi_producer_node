/**
 * Basic storage Zone descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
// const util = require('util');
// const acl = require('./acl.js');
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("@aqmo.org/rudi_logger");
const BasicFileEntry = require("./basicfile.js");
const BasicUrlEntry = require("./basicurl.js");

/**
 * An authorization processing unit.
 * @class
 */
function ZoneContext(acldb, user, ztype) {
    this.acldb = acldb;
    this.user = (user != null) ? user : { name: "<anonymous>", uuid: -1 };
    this.source = "zone";
    this.opType = ztype;
    this.auth = { clientApp:"media/zone", userId: this.user.uuid, userName: this.user.name, reqIP: "-", access:"---" };
};
ZoneContext.prototype.validApi = function() { return true; };
ZoneContext.prototype.errContext = function(code = 0, cid = "") {
    return { auth: this.auth, operation: { opType:this.opType, statusCode:code, id: cid } };
};
ZoneContext.prototype.process = function(name, uuid, access, accError) {
    this.auth.userName = name;
    this.auth.userId = uuid;
    this.auth.access = access;
    const [ message ] = this.acldb.errDesc(accError);
    const sev = accError ? logger.Severity.Warning : logger.Severity.Informational;
    this.acldb.log(sev, "["+this.auth.userName+"]:"+this.opType+": "+message, this.errContext(0));
};
ZoneContext.prototype.toJson = function() {
    return { source:this.source, ip: this.auth.reqIP, user:this.auth.userName, access:this.auth.access };
};
ZoneContext.prototype.toString = function() {
    return JSON.stringify(this.toJson());
};

/* eslint-disable no-multi-spaces */
/**
 * Represents a basic zone descriptor.
 * @class
 *
 */
function BasicZone(acldb, parent, zoneconf) {
    this.acldb     = acldb;
    this.parent    = parent;
    this.name      = zoneconf.name;
    this.csv       = "csv" in zoneconf && zoneconf.csv ? zoneconf.csv : "_file.csv";
    this.abspath   = "abspath" in zoneconf && zoneconf.abspath ? zoneconf.abspath : false;
    this.db        = {};
    if (!("path" in zoneconf)) {
        const basedir    = !parent ? "" : (typeof parent == "object" ? parent.dirname() : ""+parent);
        this.dirname   = basedir + "/" + this.name;
    }
    else this.dirname = zoneconf.path;
    this.zoneAcl = acldb.newAcl({
        "core": [ "admin", "producer", "rwx", "rw-", "---" ],
        "users": {},
        "groups": { "auth": "rwx", "admin": "rwx" }
    });
    this.staging_timeout = "staging_time" in zoneconf ? zoneconf.staging_time : 5;
    this.destroy_timeout = "destroy_time" in zoneconf ? zoneconf.destroy_time : 10;
    this.staged_prefix = ".staged_";
    this.staging_db = {};
    this.staging_trash = {};
};
/* eslint-enable no-multi-spaces */

BasicZone.prototype.init = function(entrycb, none, done) {
    try {
        fs.mkdirSync(this.dirname, { recursive: true });
    }
    catch (err) {
        if (none) { none(`[${this.name}]: could not create storage dir`); }
        return;
    }
    // For the time being, the operator is static.
    const aclStatus = this.acldb.findUser("admin");
    if (aclStatus.accError) {
        const errd = this.acldb.errDesc(aclStatus.accError);
        if (none) { none(`[${this.name}][rudiprod] user not initialied: ${errd.accessMsg}`); }
    }
    this.user = aclStatus.user;
    this.loadCSV(entrycb, none, done);
};

BasicZone.prototype.close = function(none, done) {
    if (done) done();
};

/**
 */
BasicZone.prototype.getStorageName = function() {
    return this.csv;
};
BasicZone.prototype._absPath = function(path) {
    return (this.dirname == "" ? "" : this.dirname+"/" ) + path;
};

/* eslint-disable no-multi-spaces */
/**
 * Compute the real file path from the file.
 *
 * @private
 * @param {string}    filename,   - The media base filename.
 */
BasicZone.prototype.getPathFromConnector = function(media, staged = false) {
    let storageName = media.getStorageName();
    if      (storageName[0] == "/") return storageName;
    else if (storageName[0] == "#") return storageName.slice(1);
    if (staged) {
        storageName = this.staged_prefix + storageName;
    }
    return this._absPath(storageName);
};
BasicZone.prototype.commitPath = function(media) {
    let storageName = media.getStorageName();
    if      (storageName[0] == "/") return storageName;
    else if (storageName[0] == "#") return storageName.slice(1);
    const stagedName = this._absPath(this.staged_prefix + storageName);
    storageName = this._absPath(storageName);
    try { fs.renameSync(stagedName, storageName); }
    catch (err) { console.log("Error: critical failure: could not move "+stagedName+" -> "+storageName); }
    return storageName;
};
BasicZone.prototype.commitClear = function(media) {
    const storageName = media.getStorageName();
    if (storageName[0] == "/" || storageName[0] == "#") return false;
    const stagedName = this._absPath(this.staged_prefix + storageName);
    try { fs.rmSync(stagedName); }
    catch (err) { console.log("Error: critical failure: could not remove "+stagedName); }
    return true;
};
BasicZone.prototype.destroyMedia = function(media, staged) {
    if (staged) return false;
    const storageName = media.getStorageName();
    if (storageName[0] == "/" || storageName[0] == "#") return false;
    const path = this._absPath(storageName);
    try { fs.rmSync(path); }
    catch (err) { console.log("Error: critical failure: could not remove "+path); }
    return true;
};

BasicZone.prototype.stageEntry = function(entry, process) {
    const suid = uuidv4();
    this.staging_db[suid] = { suid: suid, entry: entry, date:new Date(), process:process };
    setTimeout(function() {
        if (!(this.suid in this.zone.staging_db)) return; // Commited
        const staged = this.zone.staging_db[this.suid];
        delete         this.zone.staging_db[this.suid];
        this.zone.staging_trash[this.suid] = staged;
        staged.entry.clear(staged);
        setTimeout(function() {
            const staged = this.zone.staging_trash[this.suid];
            delete         this.zone.staging_trash[this.suid];
            staged.entry.destroy(staged);
        }.bind({zone:this.zone, suid: this.suid}), this.staging_timeout * 1000);
    }.bind({zone:this, suid: suid}), this.destroy_timeout * 1000);
    return suid;
};

BasicZone.prototype.commitEntry = function(aclStatus, suid, none, done) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, "zone_commit");
    aclStatus.setContext(ctx);
    aclStatus.setAcl(this.zoneAcl);
    if (aclStatus.refused("--x")) { none("Access denied", 401); return; }

    if (!(suid in this.staging_db)) {
        if (suid in this.staging_trash) none("could not commit file: time exceeded.", 400);
        else                            none("could not commit file: entry not found.", 404);
    }
    else {
        const stg = this.staging_db[suid];
        delete this.staging_db[suid];
        this.db[suid] = stg.entry;
        stg.entry.commit(stg);
        this.saveZoneCSV(none, (path) => {
            done(stg);
        });
    }
};
/* eslint-enable no-multi-spaces */

BasicZone.prototype.deleteEntry = function(aclStatus, uuid, none, done) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, "zone_delete");
    aclStatus.setContext(ctx);
    aclStatus.setAcl(this.zoneAcl);
    if (aclStatus.refused("-wx")) { none("Access denied", 401); return; }

    if (!(uuid in this.db)) {
        none("could not delete file: entry not found.", 404);
    }
    else {
        const entry = this.db[uuid];
        delete this.db[uuid];
        entry.destroy();
        this.saveZoneCSV(none, (path) => {
            done(entry);
        });
    }
};

/* eslint-disable guard-for-in */
BasicZone.prototype.listMedias = function(aclStatus) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, "zone_list");
    aclStatus.setContext(ctx);
    aclStatus.setAcl(this.zoneAcl);
    if (aclStatus.refused("r--")) throw Error("Access denied");

    const content = [];
    for (const ei in this.db) {
        const entry = this.db[ei];
        content.push(entry.toJson());
    }
    return content;
};
/* eslint-enable guard-for-in */

BasicZone.prototype.newBasicEntryFromMetadata = function(metadata, filecontent, aclStatus, none, step, done) {
    try {
        if (!("media_type" in metadata)) { none("Missing media type"); return; }

        let needValidation = false;
        if (!aclStatus.user) none("Authentication required", 401);
        const ctx = new ZoneContext(this.acldb, aclStatus.user, "zone_add");
        aclStatus.setContext(ctx);
        aclStatus.setAcl(this.zoneAcl);
        if (aclStatus.refused("-w-")) none("Access denied", 401);
        ctx.opType = "zone_commit";
        if (aclStatus.refused("--x")) needValidation = true;

        const recordEntry = function(entry, none, done) {
            this.zone.db[entry.uuid] = entry;
            this.zone.saveZoneCSV(none, (path) => {
                this.step("saved: "+path);
                this.done(entry);
            });
        }.bind({zone:this, step:step, done:done});

        const recordOrStageEntry = function(entry) {
            if (!needValidation) { this.recordEntry(entry, this.none, this.done); }
            else {
                const suid = this.zone.stageEntry(entry, this.step);
                this.done(entry, suid);
            }
        }.bind({zone:this, recordEntry:recordEntry, needValidation:needValidation, none:none, step:step, done:done});

        if (metadata.media_type == "FILE") {
            const entry = new BasicFileEntry(metadata, filecontent, this, aclStatus);
            if (this.abspath) entry.abspath = true;
            const path = this.getPathFromConnector(entry, needValidation);
            fs.writeFile(path, filecontent, { flag:"w"}, function(err, data) {
                if (err) none("could not write file: "+path, 500);
                this.recordOrStageEntry(entry);
            }.bind({recordOrStageEntry:recordOrStageEntry}));
        }
        else if (metadata.media_type == "INDIRECT") {
            if (!("url" in metadata)) { none("Missing media URL", 400); return; }
            const entry = new BasicUrlEntry(metadata, this, aclStatus);
            this.recordOrStageEntry(entry);
        }
        else none("Unsupported Media Type: "+metadata.media_type, 400);
    }
    catch (err) { none("invalid meta-data: "+err+" value: "+JSON.stringify(metadata), 400); }
};

/**
 * Add a new basic media entry from a description line.
 *
 *  The media entry is constructed with the following format:
 *  <md5sum>;<uuid>;<filename>: <mimetype>; <encoding>;<creation date>;<size>
 *
 * @private
 * @param {string}    descline    - The description line from a CSV file.
 * @param {string}    zone        - The name of the storage and access control zone.
 * @param {object}    context     - The request context.
 */
BasicZone.prototype.newBasicEntryFromCsv = function(descline, aclStatus) {
    let entry = null;
    try {
        let [ urlmd5, uuid, filetype, encoding, date, sizedate ] = descline.split(";");
        let [ filename, mimetype ] = filetype.split(":");
        if (sizedate === undefined) throw Error("Could not parse "+descline);
        date = new Date(parseInt(date)*1000);

        // let needValidation = false;
        aclStatus.setAcl(this.zoneAcl);
        aclStatus.context.opType = "zone_add";
        if (aclStatus.refused("-w-")) throw Error("Access denied");
        aclStatus.context.opType = "zone_commit";
        // if (aclStatus.refused('-wx')) needValidation = true;

        // TODO: read ACL from filesystem
        mimetype=mimetype.trim();
        if (mimetype == "text/uri-list") {
            const url = urlmd5;
            const expire = new Date(parseInt(sizedate)*1000);
            entry = new BasicUrlEntry(null, this, aclStatus, filename, uuid, url, date, expire);
        }
        else {
            const md5 = urlmd5;
            encoding=encoding.trim();
            const size=parseInt(sizedate);
            entry = new BasicFileEntry(null, null, this, aclStatus, filename, uuid, mimetype, encoding, size, md5, date);
            if (this.abspath) entry.abspath = true;
        }
        this.db[entry.uuid] = entry;
    }
    catch (err) { throw Error("invalid meta-data: "+err+" value: "+descline); }
    return entry;
};

/**
 * Load a CSV describing the media found in the directory.
 * Errors are ignored if a line within the CSV is incorrect.
 *
 * @param {string}    csvFile - The filename of the CSV file. The format must be parsable by {BasicFileEntry} entries.
 * @param {string}    zone    - The zone used to store the dataset.
 * @param {function=} none    - An optional callback with the error if no CSV was found.
 * @param {function=} done    - An optional callback with the DB when done.
 */
BasicZone.prototype.loadCSV = function(entrycb, none, done) {
    const path = this.getPathFromConnector(this);
    const aclStatus = this.acldb.newUserAclStatus(this.user);
    aclStatus.setContext(new ZoneContext(this.acldb, this.user, "csv_import"));
    fs.stat(path, function(err, stats) {
        if (err) return;
        fs.readFile(path, { encoding:"utf8", flag:"r"}, function(err, data) {
            if (err) {
                if (none) none(Error("could not open CSV file: "+path));
                return;
            }
            // const context = { source:'CSV', filename:path, user:'<admin>', access:'rwx' };
            const entries = data.split("\n");
            for (const line of entries) {
                if (!line || line == "") continue;
                const entry = this.zone.newBasicEntryFromCsv(line, aclStatus);
                if (entrycb) entrycb(aclStatus, this.zone, entry);
            }
            if (done) done();
        }.bind({zone:this.zone}));
    }.bind({zone:this}));
};

/* eslint-disable guard-for-in */
/**
 * Save in a CSV all the media registered for the zone.
 *
 * @param {string}   zone    - The zone name
 * @param {string}   csvFile - The filename of the CSV file. The format must be parsable by {BasicFileEntry} entries.
 */
BasicZone.prototype.saveZoneCSV = function(none, done) {
    const path = this.getPathFromConnector(this);
    let content = "";
    for (const ei in this.db) {
        const entry = this.db[ei];
        content += entry.getCSVline() + "\n";
    }

    if (content != "") {
        fs.writeFile(path, content, { encoding:"utf8", flag:"w"}, function(err, data) {
            if (err) none(Error("Could not save DB file "+this.path+" for zone "+this.zone.name+": "+err));
            else done(path);
        }.bind({path:path, zone:this}));
    }
};
/* eslint-enable guard-for-in */

module.exports = BasicZone;
