/**
 * Basic Media database
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
const fs = require('fs');
const util = require('util');
const crypto = require('crypto'); 
const BasicFileEntry = require('./basicfile.js');
const BasicUrlEntry = require('./basicurl.js');
const magic = require('magic-bytes.js');

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
function BasicFileDB(mediaDir, logger, mongodb, timeout) {
    this.mediaDir = mediaDir;
    this.syslog = logger;
    this.logid = 'db';
    this.connectorTimeout = timeout;

    this.default_zone = 'zone1';
    this.default_csvFile = '_file.csv';
    fs.mkdirSync(this.mediaDir + '/' + this.default_zone, { recursive: true });

    this.storageId = {};
    this.db = {};
    this.by_zone_db = {};
    this.by_zone_db[this.default_zone] = {};
    this.mongodb = mongodb;
}

/**
 * Generate a logger context.
 *
 * @param {object}    data - The error message.
 */
BasicFileDB.prototype.convertContext = function(opname, cid, context) {
    const source  = (context.source !== undefined) ? opname +':'+ context.source : opname;
    const optype  = (context.access !== undefined) ? source +':'+ context.access : source;
    const user    = (context.user !== undefined)   ? context.user                : '-';
    const rip     = (context.ip !== undefined)     ? context.ip                  : '-';
    const id      = (cid !== undefined)            ? cid                         : '-';
    return {
        auth: { clientApp:'-', userId: user, reqIP: rip },
        operation: { opType:source, statusCode: 200, id:id  }
    };
}

/**
 * Interface the error logger
 *
 * @param {string}    message - The error message.
 */
BasicFileDB.prototype.error = function(message) {
    this.syslog.error(message, this.logid);
}

/**
 * Interface the error logger with contexts.
 *
 * @param {string}    message - The error message.
 * @param {string}    context - The context.
 */
BasicFileDB.prototype.errorCtx = function(message, name, cid, ctx) {
    this.syslog.error(message, this.logid, this.convertContext(name, cid, ctx), undefined);
}

/**
 * Interface the data info logger in order to describe data sets.
 *
 * @param {object}    data - The error message.
 */
BasicFileDB.prototype.logReq = function(data) {
    const header = 'do='+data.operation+' uuid='+data.uuid+' ref='+data.ref;
    var extra = '';
    var context = undefined;
    if (data.operation === 'add_media') {
        if ('url' in data.value) extra = ' url='+data.value.url;
        else                     extra = ' file='+data.value.filename;
        context = this.convertContext(data.operation, data.uuid, data.context);
    }
    else  if (data.operation === 'check_entry' || data.operation === 'new_conn' || data.operation === 'del_conn') {
        context = this.convertContext(data.operation, data.uuid, data.context);
    }
    else if (data.operation === 'acc_conn') {
        context = this.convertContext(data.operation, data.uuid, data.context.client);
    }
    this.syslog.info(header+extra, this.logid, context, undefined, data);
}

/**
 * Initialize the file database with existing zones.
 *
 * @param {list}      media_files - The list of files/zones to load.
 * @param {function=} none        - An callback with the error if problems while closing.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.init = function(media_files, withmongo, none, done) {
    if (!withmongo) this.mongodb = null;
    const errFct = function(err) {
        this.service.error('Could not initialize DB: '+err);
        if (none) none('Could not load initial file database: '+err);
    }.bind({service:this});
    if (typeof media_files == 'string') media_files = [ media_files ];
    for (filen in media_files) {
        if (media_files[filen]) this.loadCSV(media_files[filen], '', errFct);
    }
    for (zone in this.by_zone_db) {
        const path = this.getPathFromConnector(this.default_csvFile, zone);
        //this.syslog.debug('Load ZONE '+zone+' => '+path, this.logid);
        this.loadCSV(path, zone, errFct, done);
    }
}

/**
 * Close the file database, and flush all pending events.
 *
 * @param {function=} none        - An callback with the error if problems while closing.
 * @param {function=} done        - An callback with the entry when done.
 */
BasicFileDB.prototype.close = function(none, done) {
    const errFct = function(err) {
        this.service.error('Could not close DB: '+err);
        if (none) none('Could not close file database: '+err);
    };
    //this.saveCSV(this.default_csvFile);
    if (Object.keys(this.storageId).length > 0) {
        var pl = [];
        for (fileid in this.storageId) {
            pl.push(new Promise(function(resolve, reject) {
                this.service.deleleteFileId(this.fileid, { source: 'interruption' }, reject, resolve);
            }.bind({service:this, fileid:fileid})));
        }
        Promise.all(pl).then(done, errFct.bind({service:this}));
    }
    else done();
}

/**
 * Compute the real file path from the file and the zone.
 *
 * @private
 * @param {string}    filename,   - The media base filename.
 * @param {string}    zone        - The name of the zone. Currently a subdirectory.
 */
BasicFileDB.prototype.getPathFromConnector = function(filename, zone) {
    if (zone === undefined) zone = '';
    return this.mediaDir + (zone == '' ?  '/' :  '/'+zone+'/' ) + filename;
}

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
BasicFileDB.prototype.buildEntry = function(zone, context, entry, none, done) {
    try {
        if (!(zone in this.by_zone_db)) { this.by_zone_db[zone] = {}; }
        const opdesc = { operation: 'add_media', uuid: entry.uuid, ref: entry.uuid, zone: zone, context: context, value: entry };
        const doneFct = function(entry) {
            this.service.db[entry.uuid] = entry;
            this.service.by_zone_db[zone][entry.uuid] = entry;
            this.service.logReq(opdesc);

            if ('source' in context && context.source == 'API') {
                this.service.saveZoneCSV(zone, this.service.default_csvFile);
            }
            if (done) done(opdesc);
        }.bind({service:this});

        const errFct = function(err) {
            this.service.syslog.warn('Could not update DB: '+err+' with '+JSON.stringify(this.desc));
            doneFct(entry); // We stand at a warning level for Mongo up to now.
        };
        if (this.mongodb) {
            this.mongodb.addMedia(entry, errFct.bind({service:this,desc:entry}), function(mongodb) {
                this.mongodb.addEvent(opdesc, errFct.bind({service:this.service,desc:opdesc}), function(mongodb) {
                    doneFct(entry);
                }.bind({service:this.service}));
            }.bind({service:this,mongodb:this.mongodb}));
        }
        else doneFct(entry);
    }
    catch(err) {
        this.errorCtx('Invalid media entry: '+err+' metadata: '+metadata, 'add_media', '-', context);
        if (none) none(err);
    }
}

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
                "enum": [ "add_media", "check_entry", "new_conn", "del_conn", "acc_conn" ]
            },
            "uuid": {
                "description": "The open storage access uuid",
                "type": "string",
            },
            "ref": {
                "description": "The media-id",
                "type": "string",
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
    }
}

/**
 * Add a new basic media entry.
 *
 * @param {json}      metadata,   - The meta-data dictionary
 * @param {buffer}    filecontent - The raw file content
 * @param {function=} none        - An optional callback with the error if meta-data are malformed
 * @param {function=} done        - An optional callback with the entry when done.
 */
BasicFileDB.prototype.addEntry = function(metadata, context, filecontent, none, done) {
    if (!('media_type' in metadata)) {
        this.errorCtx('(ignored) Missing media type: '+ JSON.stringify(metadata), 'add_media', '-', context);
        //if (none) none('Missing media type');
        //return;
        metadata.media_type = "FILE";
    }
    if (!('media_id' in metadata)) {
        this.errorCtx('Missing media UUID: '+ JSON.stringify(metadata), 'add_media', '-', context);
        if (none) none('Missing media UUID');
        return;
    }
    if (!('file_type' in metadata)) {
        metadata.file_type = 'application/octet-stream';
        const info = magic.filetypeinfo(filecontent);
        //this.syslog.debug('Filetype: '+ JSON.stringify(info, null, 4), this.logid);
        if (info.length) { // Take the 1st matching.
            if ('mime' in info[0]) metadata.file_type = info[0].mime;
            else if ('typename' in info[0]) metadata.file_type = 'application/' + info[0].typename;
        }
        /* TODO: Clean-up json/csv analysis.
         *
         * For sure, the following code is full of "magic-values". The
         * purpose of this code is to provide a content basic analysis
         * for demos.
         */
        else if (Buffer.isBuffer(filecontent)) {
            const itecur = function (s,p) {var i=0,c=-1;while(i>=0&&c<10){i=s.indexOf(p,i)+1;c++;}; return c;}

            const contheader = filecontent.slice(0,filecontent.indexOf('\n')).slice(0,500);
            if (itecur(contheader,';') > 3 || itecur(contheader,',') > 3) { metadata.file_type = 'text/csv'; }
            var jsoncontent = '';
            if (filecontent.length < 5000) {
                try { jsoncontent = JSON.parse(filecontent); } catch(e) {}
            }
            else {
                const s = filecontent.slice(0,500);
                jsoncontent =  (itecur(s,'{') > 3 && itecur(s,'}') > 3 && itecur(s,',') > 3) ? s : '' ;
            }
            if (jsoncontent.length > 0) {
                if (jsoncontent.includes('Feature') && jsoncontent.includes('geometry'))
                    metadata.file_type = 'application/geo+json';
                else
                    metadata.file_type = 'application/json';
            }
        }
    }
    if (!('charset' in metadata))     {
        /* TODO: Clean-up charset analysis.
         *
         * The following code is limited to small files. The purpose
         *  of this code is to provide a basic charset analysis for
         *  demos.
         */
        metadata.charset = '';
        if (Buffer.isBuffer(filecontent) && filecontent.length < 120000) {
            if      (metadata.charset == '') try { filecontent.toString('base64'); metadata.charset = 'charset=us-ascii'; } catch(e) {}
            else if (metadata.charset == '') try { filecontent.toString('utf8');   metadata.charset = 'charset=utf-8'; }    catch(e) {}
            else if (metadata.charset == '') try { filecontent.toString('ascii');  metadata.charset = 'charset=us-ascii'; } catch(e) {}
        }
        else metadata.charset = 'charset=binary';
    }
    if (!('access_date' in metadata)) { metadata.access_date = new Date(); }
    else {
        metadata.access_date = parseInt(metadata.access_date)*1000;
        metadata.access_date = new Date(metadata.access_date);
    }
    const name = ('media_name' in metadata) ? metadata.media_name : 'media';

    if (metadata.media_type == "FILE") {
        const hash = crypto.createHash('md5').update(filecontent).digest('hex');
        const size = ('file_size' in metadata) ? metadata.file_size : filecontent.length;
        const uuid = metadata.media_id;
        const mimetype = metadata.file_type;
        const encoding = metadata.charset;
        const date = metadata.access_date;
        const filename = name;
        const zone = this.default_zone;

        if (filecontent.length != size) {
            this.errorCtx('(ignored) inconsistent provided file size: '+size+' received: '+filecontent.length, 'add_media', metadata.media_id, context);
        }
        const path = this.getPathFromConnector(metadata.media_id + '_' + filename, zone);
        this.syslog.debug('new file: size='+size+' ('+filecontent.length+') hash='+hash, 'core');
        fs.writeFile(path, filecontent, { flag:'w'}, function(err, data) {
            if (err) {
                this.service.errorCtx('could not write file: '+path, 'add_media', metadata.media_id, context);
                if (none) none(err);
                return;
            }
            const entry = new BasicFileEntry(zone, context, filename, uuid, mimetype, encoding, size, hash, date, metadata);
            this.service.buildEntry(zone, context, entry, none, done);
        }.bind({service:this}));
    }
    else if (metadata.media_type == "INDIRECT") {
        if (!('url' in metadata)) {
            this.errorCtx('Missing media URL: '+ metadata, 'add_media', '-', context);
            if (none) none('Missing media URL');
            return;
        }
        const zone = this.default_zone;
        const uuid = metadata.media_id;
        const url = metadata.url;
        const date = metadata.access_date;
        const expire = 'expire_date' in metadata ? new Date(parseInt(metadata.expire_date)*1000) : 0;
        const entry = new BasicUrlEntry(zone, context, name, uuid, url, date, expire, metadata);
        this.buildEntry(zone, context, entry, none, done);
    }
    else {
        this.errorCtx('Incorrect media type: '+ metadata.media_type, 'add_media', '-', context);
        if (none) none('Not supported media type');
        return;
    }
}

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
BasicFileDB.prototype.newBasicEntry = function(descline, zone, context) {
    try {
        var [ urlmd5, uuid, filetype, encoding, date, sizedate] = descline.split(';');
        var [ filename, mimetype ] = filetype.split(':');
        if (sizedate === undefined) throw new Error('Could not parse '+descline);
        date = new Date(parseInt(date)*1000);

        mimetype=mimetype.trim();
        if (mimetype == 'text/uri-list') {
            var [ name, mime ] = filetype.split(':');
            const url = urlmd5;
            const expire = new Date(parseInt(sizedate)*1000);
            return new BasicUrlEntry(zone, context, filename, uuid, url, date, expire, null);
        }
        else {
            const md5 = urlmd5;
            encoding=encoding.trim();
            const size=parseInt(sizedate);
            return new BasicFileEntry(zone, context, filename, uuid, mimetype, encoding, size, md5, date, null);
        }
    }
    catch(err) { throw new Error('invalid meta-data: '+err+' value: '+descline); return null; }
}

/**
 * Load a CSV describing the media found in the directory.
 * Errors are ignored if a line within the CSV is incorrect.
 *
 * @param {string}    csvFile - The filename of the CSV file. The format must be parsable by {BasicFileEntry} entries.
 * @param {string}    zone    - The zone used to store the dataset.
 * @param {function=} none    - An optional callback with the error if no CSV was found.
 * @param {function=} done    - An optional callback with the DB when done.
 */
BasicFileDB.prototype.loadCSV = function(csvFile, zone, none, done) {
    fs.stat(csvFile, function(err,stats) {
        if (err) return;
        fs.readFile(csvFile, { encoding:"utf8", flag:'r'}, function(err, data) {
            if (err) {
                this.service.error('could not open CSV file: '+csvFile);
                if (none) none(err);
                return;
            }

            const context = { source:'CSV', filename:csvFile, user:'<admin>', access:'rwx' };
            const entries = data.split('\n');
            for (var index in entries) {
                const line = entries[index];
                if (!line || line == '') continue;
                const entry = this.service.newBasicEntry(line, zone, context);
                this.service.buildEntry(zone, context, entry, none, done);
            }
            if (done) { if (done) done(this.service.db); return; }
        }.bind({service:this.service}));
    }.bind({service:this}));
}

/**
 * Save in a CSV all the media registered for the zone.
 *
 * @param {string}   zone    - The zone name
 * @param {string}   csvFile - The filename of the CSV file. The format must be parsable by {BasicFileEntry} entries.
 */
BasicFileDB.prototype.saveZoneCSV = function(zone, csvFile) {
    if (!(zone in this.by_zone_db)) {
        this.syslog.warn('zone not found: '+zone, this.logid);
        return;
    }
    //this.syslog.debug('**** PROCESS ZONE : '+zone+' *********', this.logid);
    const path = this.getPathFromConnector(csvFile, zone);
    const elist = this.by_zone_db[zone];
    var content = '';
    for (uuid in elist) {
        const entry = elist[uuid];
        //if ('source' in entry.context && entry.context.source == 'CSV') continue;
        //this.syslog.debug('entry: '+entry.getCSVline()+'\n'+util.inspect(entry), this.logid);
        content += entry.getCSVline() + '\n';
    }

    if (content != '') {
        fs.writeFile(path, content, { encoding:"utf8", flag:'w'}, function(err, data) {
            if (err) { this.syslog.warn('Could not save DB file '+this.path+' for zone '+zone+': '+err, 'db'); }
            else this.syslog.debug('saved: '+path, 'db');
        }.bind({syslog:this.syslog, path:path, content:content, zone:zone}));
        //this.syslog.debug('content: '+content);
    }
}

/**
 * Save in all zone CSV.
 *
 * @param {string}   csvFile - The filename of the CSV file.
 */
BasicFileDB.prototype.saveCSV = function(csvFile) {
    for (zone in this.by_zone_db) {
        this.saveZoneCSV(zone, csvFile);
    }
}

/**
 * Require an access to a media, and returns a connector ID if the access is granted.
 * This function creates a unique connector, and a timer to remove it on time.
 * 
 * @param   {string}   uuid  - The media UUID.
 * @returns {string}         - A unique connector ID.
 */
BasicFileDB.prototype.get = function(uuid, context) {
    //console.log('Check:'+uuid);
    if (!(uuid in this.db)) return null;
    const media = nid = this.db[uuid];
    try {
        var niddesc = media.generateFileId();
        niddesc.context = context;
        if (niddesc.basefile) {
            niddesc.source = this.getPathFromConnector(niddesc.basefile, niddesc.zone);
        }
        var connectorTimeout = this.connectorTimeout;
        if ('timeout' in niddesc) {
            connectorTimeout = niddesc['timeout'];
        }
        this.storageId[niddesc.fileid] = niddesc;
        const opdesc = { operation: 'new_conn', uuid: niddesc.fileid, ref: uuid, zone: niddesc.zone, context: context };
        this.logReq(opdesc);

        const errFct = function(err) { this.service.error('Could not update DB: '+err+' with '+JSON.stringify(this.desc)); };
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, errFct.bind({service:this,desc:opdesc}), function(mongodb) {});
        }

        setTimeout(function() {
            this.db.deleleteFileId(this.fileid, context, errFct, function(mongodb) {});
        }.bind({db:this, fileid: niddesc.fileid}), connectorTimeout * 1000);
        return niddesc.fileid;
    }
    catch(err) {
        const e = 'Could not process media with '+uuid+' '+JSON.stringify(context);
        this.error(e +': '+err);
        if (none) none(new Error(e));
        return null;
    }
}

/**
 * Delete a storage connector.
 * 
 * @private
 * @param   {string}   fileid  - The file UUID.
 */
BasicFileDB.prototype.deleleteFileId = function(fileid, context, none, done) {
    if (fileid in this.storageId) {
        const niddesc = this.storageId[fileid];
        delete this.storageId[fileid];
        const opdesc = { operation: 'del_conn', uuid: niddesc.fileid, ref: niddesc.ref, zone: niddesc.zone, context: context, value: niddesc };
        this.logReq(opdesc);
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, none.bind({service:this,desc:opdesc}), done);
        }
    }
}

/**
 * Send the media content using a connector ID.
 * This function records the access and provide the necessary information to load the data.
 * 
 * @param   {string}   uuid - The connector UUID.
 * @param {function=} none   - An optional callback with the error.
 * @param {function}  done   - An callback with the media content, the name, and the mime type.
 */
BasicFileDB.prototype.find = function(fileid, context, none, done) {
    if (!(fileid in this.storageId)) {
        const errmsg = 'media connector id "'+fileid+'" not found';
        //+' request context: '+JSON.stringify(context)
        this.errorCtx(errmsg, 'get_media', fileid, context);
        if (none) none(new Error(errmsg));
        return;
    }
    const now = new Date();
    const iddesc = this.storageId[fileid];
    const accessEntry = { date:now, client: context};
    const opdesc = { operation: 'acc_conn', uuid: iddesc.fileid, ref:iddesc.ref, zone: iddesc.zone, context: accessEntry };
    this.logReq(opdesc);
    const errFct = function(err) { this.service.error('Could not update DB: '+err+' with '+JSON.stringify(this.desc)); };
    if (this.mongodb) {
        this.mongodb.addEvent(opdesc, errFct.bind({service:this,desc:opdesc}), function(mongodb) {});
    }
    iddesc.count += 1;
    iddesc.access.push(accessEntry);

    // Load the data asynchronously
    const media = this.db[iddesc.ref];
    media.getFile(iddesc, context, function(err) {
        // +' request context: '+JSON.stringify(context)
        this.service.errorCtx('could not load file: '+err, 'get_media', fileid, context);
        if (none) none(err);
    }.bind({service:this}), done);
}

/**
 * Require check the real content of a media, and returns its updated MD5 value.
 *
 * @param  {string}   uuid  - The media UUID.
 * @return {string}         - The MD5 value.
 */
BasicFileDB.prototype.check = function(uuid, context, none, done) {
    if (!(uuid in this.db)) return none(new Error("media uuid not found"));
    const media = this.db[uuid];
    try {
        const opdesc = { operation: 'check_entry', uuid: '-', ref: media.uuid, zone: media.zone, context: context };
        this.logReq(opdesc);
        if (media.mimetype == 'text/uri-list') {
            media.getRealMd5(media.url, context, none, done);
        }
        else {
            const source = this.getPathFromConnector(media.uuid + '_' + media.filename, media.zone);
            media.getRealMd5(source, context, none, done);
        }

        const errFct = function(err) { this.service.error('Could not update DB: '+err+' with '+JSON.stringify(this.desc)); };
        if (this.mongodb) {
            this.mongodb.addEvent(opdesc, errFct.bind({service:this,desc:opdesc}), function(mongodb) {});
        }
        return media.md5;
    }
    catch(err) {
        const e = 'Could not process media: with '+uuid+' '+JSON.stringify(context);
        this.error(e +': '+err);
        if (none) none(new Error(e));
        return null;
    }
}

module.exports = BasicFileDB;
