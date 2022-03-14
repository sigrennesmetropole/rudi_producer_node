/**
 * RUDI media access driver for media data.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
const express = require('express');
const process = require('process');
const fs = require('fs');
const util = require('util');
const ini = require('ini');
const argv = require('minimist')(process.argv.slice(2));
const zlib = require('zlib');

//var WebLogger = require('./weblogger.js');
const logger = require('@aqmo.org/rudi_logger');
const AccessControl = require('./access.js');
const BasicFileEntry = require('./basicfile.js');
const BasicUrlEntry = require('./basicurl.js');
const basicdb = require('./basicdb.js');
const mongodb = require('./db.js');
const schemaSet = require('./schema.js');
const DEFAULT_CONF = require('./configuration.js');

/**
 * The code express based HTTP server.
 * The web server creates the media db, and serves:
 *  - a route for requesting a connector for a media UUID 
 *  - a route for loading the data loaded from a media UUID.
 *
 * The configuration used:
 * @class 
 * @param {object}  configuration - The listening port.
 */
function HttpService(configuration) {
    this.port = configuration.server.listening_port;
    this.netInterface = configuration.server.listening_address;
    this.server = configuration.server.server_url;
    this.httpPrefix = configuration.server.server_prefix;
    this.authorizedVersion = JSON.parse(JSON.stringify(configuration.server.authorized_version));
    this.authorizedUsers = JSON.parse(JSON.stringify(configuration.server.authorized_users));
    this.revision = configuration.logging.revision

    if (!this.httpPrefix || this.httpPrefix == '' || this.httpPrefix[0] != '/' ) {
        console.log("Error: the http prefix cannot be null and shall start with '/'");
        process.exit(-1);
    }

    this.httpServer = express();

    const schemaURL  = this.server+this.httpPrefix+'schema';
    const schemaBase = configuration.schemas.schema_basename;
    console.log('Base URL: '+schemaURL+' schema base: '+schemaBase);
    const contextRef = schemaBase + configuration.schemas.schema_context;
    const metaRef    = schemaBase + configuration.schemas.schema_meta;
    const eventRef   = schemaBase + configuration.schemas.schema_event;
    const fileRef    = schemaBase + configuration.schemas.schema_file;
    const urlRef     = schemaBase + configuration.schemas.schema_url;
    this.schemaSet = new schemaSet(schemaURL);
    this.schemaSet.addSchema(contextRef, HttpService.contextSchema());
    this.schemaSet.addSchema(metaRef, HttpService.metaSchema());
    this.schemaSet.addSchema(eventRef, basicdb.eventSchema(contextRef));
    this.schemaSet.addSchema(fileRef, BasicFileEntry.fileSchema(contextRef, metaRef));
    this.schemaSet.addSchema(urlRef, BasicUrlEntry.urlSchema(contextRef, metaRef));

    //this.wl = new WebLogger(configuration.logging.app_name, configuration.logging.log_dir, null);
    this.syslog = new logger.RudiLogger(configuration.logging.app_name, this.revision, configuration);
    this.logweb = this.syslog.getWebInterface();
    this.ac = new AccessControl(this.authorizedVersion, this.authorizedUsers, this.syslog);
    if (this.logweb) this.logweb.setWebAccessControlInterface(this.ac);
    //this.wl.setWebAccessControlInterface(this.ac);
    this.icon = new Buffer.from('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACe7OkFqNqYQ6jZlKWo2ZTjpdiR+5bQgvuc04Pj5PWgovv/qED4/6cEAAAAAAAAAAAAAAAAAAAAAAAAAACb7/wSm+/7h6Hlyeyo2pb/qNmU/6XYkv+W0IL/ndOD/+n4of/5/6fq+P+ng/j/pxAAAAAAAAAAAAAAAACa7/sQm+/7oZvv+/2b7/j/ouTG/6jalv+m2JH/ltCC/53Tg//p+KH/+f+n//j/p/34/6eb+P+mDgAAAACf7voBm+/7e5vv+/yb7/v/m+/8/5vu+P+i5MX/pdiT/5bQgv+d04P/6fih//n/p//4/6f/+P+n+/j9p3UAAAAAnPD7MZvw++Cb7/v/m+/7/5vv+/+b8Pz/nO/4/5/iwv+V0IT/ndOD/+n4of/5/6f/+P+n//j7qP/35qvc9tStLJPl+YWV5/n+lef5/5Xn+f+V5/n/lef5/5bo+viY7PbSj9mq053Tg/jp96H/+f+n//j8p//35av/9tat/fbWrX1+yfPEfsnz/37J8/9+yfP/fsr0/37K9PqAy/SHkOj/FITcuhWk14eN6vii+/n9qP/35av/9tat//bWrf/21q28fMfz33zH8/98x/P/fMfz/3zF8/+AqOvYgpDmGgAAAAAAAAAA4/efHfb7p9z35qv/9tat//bWrf/21q3/9tat2HzH8958x/P/fMfz/3zG8/+BoOr/iXTf2Z173hwAAAAAAAAAAPnuqh/346vd9tet//bWrf/21q3/9tat//bWrdh8x/PCfMfz/3zH8/+Boer/h3Lf/5R43/vJpOOP5a3TGuWTrhvzya2S9M6t/PTOrf/0zq3/9M6t//TOrf/00K26fMfzgnzH8/6Bour/iHPf/4du3v+Ved//zqjk+dup2Nnfg7La4oit+uKKrf/iiq3/4oqt/+KKrf/iiq3944+te3zK8y6Boerdh3Tf/4hu3v+Hbt7/lXnf/86o5P/TqeP/0YnI/917rv/eeq3/3nqt/956rf/eeq3/3nqt2t55rSoAAAAAiHDedohu3vuIb97/h27e/5V53//OqOT/0qrj/8SS3v/Phcf/3Xyu/957rf/ee63/3nut+t57rXAAAAAAAAAAAIdu3g2Ib96aiG/e/Idu3v+Ved//zqjk/9Kq4//Ekt//wo7d/9CFxv/dfK7/3nut/N57rZXee60MAAAAAAAAAAAAAAAAiG7eD4hv3n+Hbt7nlXnf/86o5P/SqeP/xJLf/8KP3v/Dj93/0YXF5d57rXvfeqwOAAAAAAAAAADT0c4F09HOBeHjyASwotIGjHXdQJp/357PquPd0qrj+MST3/jCkN7dw5LencSV3D7Tr8cG0N/VBNPRzgXT0c4F+B8AAOAHAADAAwAAwAMAAIABAAAAAQAAAYAAAAPAAAADwAAAAYAAAAABAACAAQAAwAMAAMADAADwDwAA+B8AAA==', 'base64');

    this.syslog.warn('Media file system: '+configuration.storage.media_dir, 'core');
    this.mongodb = new mongodb(configuration.database.db_url, configuration.database.db_name, this.schemaSet, fileRef, urlRef, eventRef);
    this.db = new basicdb(configuration.storage.media_dir, this.syslog, this.mongodb, configuration.storage.acc_timeout);

    this.mongodb.open(function(service, err) {
        this.syslog.error('DB initialization failed: '+err, 'core');
        this.db.init(configuration.storage.media_files, false);
    }.bind({syslog:this.syslog,db:this.db}), function(db) {
        this.syslog.info('DB initialized', 'core');
        this.db.init(configuration.storage.media_files, true);
    }.bind({syslog:this.syslog,db:this.db}));

    this.httpServer.get(this.httpPrefix+'favicon.ico', function(req, res) { service.favicon(req,res); }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'revision', function(req, res) { service.getRevision(req,res); }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'', function(req, res) { service.root(req, res) }.bind({'service':this}));
    if (this.logweb) {
        this.httpServer.get(this.httpPrefix+'logs', function(req, res) { service.logweb.logContent(req, res) }.bind({'service':this}));
        this.httpServer.get(this.httpPrefix+'logs/:name', function(req, res) { service.logweb.logFile(req, res) }.bind({'service':this}));
    }
    this.httpServer.get(this.httpPrefix+'storage/:fileid', function(req, res) { service.fileService(req, res) }.bind({'service':this}));
    this.httpServer.post(this.httpPrefix+'post', function(req, res) { service.postFile(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'post', function(req, res) { service.postFile(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'schema/:name', function(req, res) { service.schemas(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'check/:uuid', function(req, res) { service.checkFile(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'download/:uuid', function(req, res) { service.direct(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+'zdownload/:uuid', function(req, res) { service.compress(req, res) }.bind({'service':this}));
    this.httpServer.get(this.httpPrefix+':uuid', function(req, res) { service.media(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+'storage/:fileid', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+'post', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+'check/:uuid', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+'download/:uuid', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+'zdownload/:uuid', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));
    this.httpServer.options(this.httpPrefix+':uuid', function(req, res) { service.optionCors(req, res) }.bind({'service':this}));

    //this.httpServer.use(function(req, res) { this.syslog.info('unserved access: '+JSON.stringify(req.url), 'core'); res.status(404).end(); }.bind({'syslog':this.syslog}));
    this.listen = this.httpServer.listen(this.port, this.netInterface);
}

/**
 * Flush and stop the database, and close the server.
 *
 */
HttpService.prototype.close = function(err, done) {
    const closeFileDB = function() {
        const closeMongoDB = function() {
            this.service.mongodb.close(this.err, this.done);
        }
        this.service.db.close(this.err, closeMongoDB.bind({service:service, done:this.done, err:this.err}));
    }
    this.listen.close(closeFileDB.bind({service:service, done:done, err:err}));
}

/**
 * Serves a favicon. For fun because I like it (CC Licence).
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.favicon = function(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Length', this.favicon.length);
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader("Cache-Control", "public, max-age=2592000");                // expiration: after a month
    res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());
    res.end(this.icon);
}

/**
 * Serves the value of the current application revision.
 *
 * The revision shall be provided in the command line.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.getRevision = function(req, res) {
    res.statusCode = 200;
    res.type('text/plain');
    res.end(this.revision);
}

/**
 * Serves the default page.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.root = function(req, res){
    if ('file_metadata' in req.headers) {
        return this.media(req, res);
    }
    res.send('<!DOCTYPE html>\
<html lang="en">\
  <head><meta charset="utf-8"><title>Rudi media access driver</title></head>\
  <body>\
    <H1>Rudi media access driver, access restricted</H1>\
    <H2><a href="'+this.httpPrefix+'logs/" >Log file list (requires authorization)</a></H2>\
  </body>\
</html>');
}

/**
 * Generate a Json Schema for a *context* with the proper registering URL.
 *
 * @returns {json}                - The Json schema.
 */
HttpService.contextSchema = function() {
    return {
        "title": "The RUDI media DB context Schema",
        "description": "The descriptor of context associated to a RUDI media DB access.",
        "type": "object",
        "properties": {
            "source": {
                "description": "The request source",
                "type": "string"
            },
            "ip": {
                "description": "The IP address of the request client",
                "type": "string",
                "format": "ipv4"
            },
            "user": {
                "description": "The user id used for the request",
                "type": "string"
            },
            "access": {
                "description": "The access mode used for the request",
                "type": "string"
            },
            "filename": {
                "description": "The CSV source file",
                "type": "string"
            }
        },
        "required": [ "source" ]
    };
}

/**
 * Generate a Json Schema for a *metadata* with the proper registering URL.
 *
 * @returns {array}               - The Json schema.
 */
HttpService.metaSchema = function() {
    return {
        "title": "The RUDI media DB metadata Schema",
        "description": "The descriptor shall use the RUDI standard scheme.",
        "type": "object",
        "properties": {
            "media_type": {
                "description": "The media type, currently only FILE, STREAM in  the future",
                "type": "string",
                "enum": [ "FILE", "STREAM", "INDIRECT" ]
            },
            "media_name": {
                "description": "The media name, typically used for the filename",
                "type": "string"
            },
            "media_id": {
                "description": "The media UUID as set in the RUDI API",
                "type": "string"
            },
            "lastmodification_date": {
                "description": "The media last modification date",
                "type": "string"
            }
        },
        "required": [ "media_id", "media_type", "media_name" ]
    };
}

/**
 * Serves a post of a new media.
 * The post HTTP header must contain the ":file_metadata" with all necessary fields.
 *
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.schemas = function(req, res) {
    const name = req.params.name || 'none';
    const mimetype = 'application/json';
    const content = this.schemaSet.toJSON(name);
    if (!content) { res.status(404).write('Schema not found'); res.end(); return; }
    //console.log('REF:'+JSON.stringify(content));
    res.type(mimetype);
    res.write(content);
    res.status(200).end();
}

/**
 * Create a request context.
 * The context is used to process requests,
 *   and contains basic information about the sender.
 * @param {object} req - the HTTP request
 */
HttpService.prototype.generateContext = function(req, access, user) {
    const srcip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //console.log('from:'+ip);
    return { source:'API', ip: srcip, access:access, user:user };
}

/**
 * Serves an OPTION for CORS enable entries.
 *
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.optionCors = function(req, res) {
    //console.log('OPTION: '+util.inspect(req.headers));
    const baseHeaderList = 'Content-Type, Authorization, Content-Length, X-Requested-With, file_metadata, Media-Access-Method';
    const extendedHeaderList = 'Cache-Control, Pragma, Sec-GPC';
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', baseHeaderList +', '+ extendedHeaderList);
    res.status(200);
    res.end();
}

/**
 * Close a communication with a Json message and a status code.
 *
 * @private
 * @param {object} req - the HTTP request
 * @param {object} msg - Json message.
 * @param {number} code - the HTML code.
 */
HttpService.prototype.sendAndClose = function(res, code, msg) {
    res.header("Access-Control-Allow-Origin", "*");
    res.status(code).type('application/json');
    res.write(msg);
    res.end();
}

/**
 * Serves a post of a new media.
 * The post HTTP header must contain the ":file_metadata" with all necessary fields.
 *
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.postFile = function(req, res) {
    const [ access, user ] = this.ac ? this.ac.checkAccessRights(req, res, '-w-') : null;
    if (!access) return;
    if (access[1] != 'w') { res.status(401).send('Write access not set for user ('+user+':'+access+')'); return; }
    res.header("Access-Control-Allow-Origin", "*");
    res.type('application/json');
    res.write('[');

    var content= [];
    if (!('file_metadata' in req.headers)) {
        content = '{ "status": "error", "msg":"no meta-data provided" } ]';
        res.write(content);
        res.status(400).end();
        return;
    }
    var metadata = req.headers.file_metadata;
    try { metadata = JSON.parse(metadata); }
    catch(err) {
        content = '{ "status": "error", "msg":"malformed metadata" } ]';
        this.syslog.error('malformed metadata: '+metadata, 'core');
        res.write(content);
        res.status(400).end();
        return;
    }

    // Bufferize file data
    const chunkSize = 65536*4;
    const file_size = metadata.file_size || chunkSize;
    if (file_size > 500e6) {
        content = '{ "status": "error", "msg":"file too large, use a different upload method" } ]';
        this.syslog.error('file too large, use a different upload method: ' + JSON.stringify(metadata));
        res.write(content);
        res.status(400).end();
        return;
    }

    // Bufferize file data
    var realcontentsize = 0;
    var bufferSize = file_size;
    var filecontent = Buffer.allocUnsafe(bufferSize);
    req.on('readable', function() {
        var chunk;
        content = '{ "status" "ongoing" }, ';
        while (null !== (chunk = req.read())) {
            const nsize = realcontentsize + chunk.length;
            if (nsize > bufferSize) {
                if (bufferSize > 2 * chunkSize) chunkSize = chunkSize * 2;
                bufferSize += chunkSize + chunk.length;
                newfilecontent = Buffer.allocUnsafe(bufferSize);
                filecontent.copy(newfilecontent);
                filecontent = newfilecontent;
            }
            chunk.copy(filecontent, realcontentsize);
            realcontentsize += chunk.length;
            res.write(' ' + realcontentsize + ',');
        }
    });
    // Build the entry, Close the request
    req.on('end', function() {
        this.service.syslog.debug('content: '+filecontent.length, 'core');

        const context = this.service.generateContext(req, access, user);
        const data = filecontent.slice(0, realcontentsize);
        const nid = this.service.db.addEntry(metadata, context, data, function() {
            content = '{ "status": "error", "msg":"invalid request" } ]';
            res.write(content);
            res.status(400).end();
        }, function() {
            content = '{ "status": "OK" } ]';
            res.write(content);
            res.status(200).end();
        });
    }.bind({service:this}));
};

/**
 * Serves the media connector creation API.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.media = function(req, res) {
    const [ access, user ] = this.ac ? this.ac.checkAccessRights(req, res) : null;
    if (!access) return;

    let req_uuid = '-';
    if ("uuid" in req.params) req_uuid = req.params.uuid;
    else {
        if (!('file_metadata' in req.headers)) {
            this.sendAndClose(res, 400, '{"status":"error", "msg":"no meta-data provided"}');
            return;
        }
        var metadata = req.headers.file_metadata;
        try { metadata = JSON.parse(metadata); }
        catch(err) {
            this.syslog.error('malformed metadata: '+metadata, 'core');
            this.sendAndClose(res, 400, '{"status":"error", "msg":"malformed metadata"}');
            return;
        }

        if (!metadata.media_id) {
            this.syslog.error('uuid missing in metadata: ' + JSON.stringify(metadata));
            this.sendAndClose(res, 400, '{ "status": "error", "msg":"uuid missing in metadata"}');
            return;
        }
        req_uuid = metadata.media_id;
    }

    const context = this.generateContext(req, access, user);

    //console.log('OPTION: '+util.inspect(req.headers));
    const access_mode = req.headers['media-access-method'];
    if (access_mode == 'Direct') {
        const nid = this.db.get(req_uuid, context);
        if (!nid) HttpService.prototype.sendAndClose(res, 404, '{"status":"error", "msg":"media uuid not found"}');
        else {
            req.params.fileid = nid;
            this.fileService(req,res);
        }
    }
    else if (access_mode == 'Check') {
        const nid = this.db.check(req_uuid, context, function(err) {
            HttpService.prototype.sendAndClose(res, 404, '{"status":"error", "msg":"'+err.toString()+'"}');
        }.bind({res:res}), function(hash, previousHash, size) {
            if (hash != previousHash && previousHash != '-') {
                this.syslog.error('Media changed on disk for uuid '+req_uuid+' hash='+hash+' previously='+previousHash, 'core');
            }
            this.syslog.info('full read of media: '+req_uuid, 'core');
            HttpService.prototype.sendAndClose(res, 200, '{"status":"OK", "md5":"'+hash+'", "previous_md5":"'+previousHash+'", "size":"'+size+'"}');
        }.bind({res:res,syslog:this.syslog}));
    }
    else {
        const nid = this.db.get(req_uuid, context);
        if (!nid) HttpService.prototype.sendAndClose(res, 404, '{"status":"error", "msg":"media uuid not found"}');
        else  {
            content = { url:this.server + this.httpPrefix+'storage/'+ nid };
            res.type('application/json');
            res.write(JSON.stringify(content));
            res.status(200).end();
        }
    }
};

/**
 * Serves a direct access through the media connector.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.direct = function(req, res) {
    req.headers['media-access-method'] = 'Direct';
    this.media(req, res);
};

/**
 * Serves a direct access through the media connector.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.compress = function(req, res) {
    req.headers['media-access-method'] = 'Direct';
    req.headers['media-access-compression'] = 'true';
    this.media(req, res);
};

/**
 * Serves a check of an existing media.
 *
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.checkFile = function(req, res) {
    req.headers['media-access-method'] = 'Check';
    this.media(req, res);
}

/**
 * Serves the access to the media content from a connector.
 * @param {object} req - the HTTP request
 * @param {object} res - the HTTP response.
 */
HttpService.prototype.fileService = function(req, res) {
    const [ access, user ] = this.ac ? this.ac.checkAccessRights(req, res) : null;
    if (!access) return;

    const fileid = req.params.fileid;
    const context = this.generateContext(req, access, user);

    this.db.find(fileid, context, function(err) {
        HttpService.prototype.sendAndClose(res, 401, '{"status":"error", "msg":"could not get media content"}');
    }, function(data, name, mimetype) {
        this.syslog.info('full read with connector: '+fileid, 'core');
        const compression_mode = req.headers['media-access-compression'];
        const content = data;
        res.header("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Disposition",'attachment; filename="' + name + '"');
        if (compression_mode && compression_mode.toLowerCase() == 'true') {
            zlib.gzip(data, function(err, buffer) {
                if (err) { res.type('application/octet-stream'); res.write(content); }
                else     {
                    res.setHeader("Content-Disposition",'attachment; filename="' + name + '.gz"');
                    res.type('application/gzip');
                    res.write(buffer);
                }
                res.status(200).end();
            });
        }
        else {
            res.type(mimetype);
            res.write(content);
            res.status(200).end();
        }
    }.bind({syslog:this.syslog}));
};

/**
 * Recursive function updating a base structure with a given structure
 * @private
 * @param {object} base    - the base structure
 * @param {object} updated - the source of updated data
 */
function updateProperty(base, updated) {
    var newo = {};
    for (e in base) {
        if (e in updated) {
            if ((typeof updated[e]) == 'object')   newo[e] = updateProperty(base[e], updated[e]);
            else if ((typeof base[e]) == 'number') newo[e] = parseInt(updated[e]);
            else {
                try { newo[e] = JSON.parse(updated[e]); }
                catch(err) {
                    newo[e] = updated[e];
                }
            }
        }
        else newo[e] = base[e];
    }
    return newo;
}

/**
 * Fetch ini-file & parse command line arguments
 *
 * @param {object} conf_default  - the default configuration
 * @param {object} conf_filename - the defaut init file
 */
function fetchAndParseArguments(conf_default, conf_filename) {
    if (argv["ini"]) {
        conf_filename = argv["ini"];
    }

    var configuration = conf_default;
    try {
        const configfile = ini.parse(fs.readFileSync(conf_filename, 'utf-8'));
        configuration = updateProperty(conf_default, configfile);
    }
    catch (err) { console.error('warning: configuration file ignored: '+err); }

    if (argv["p"]) {
        var np = parseInt(argv["p"], 10);
        if (np != NaN) configuration.server.port = np;
    }
    if (argv["revision"]) {
        configuration.logging.revision = argv["revision"].slice(0,40);
    }
    //console.log('RES: '+JSON.stringify(configuration,false,4));

    // Error mgmt.
    if (configuration.server.port < 80 ) {
        console.log('Incorrect port provided: '+configuration.server.port);
        process.exit(-1);
    }
    return configuration;
}

/**
 * A Signal handler, close in a clean way, with a timeout
 *
 * @class 
 * @param {object}  timeout - The closing sequence timeout.
 * @param {object}  service - The service to close.
 */
function SignalCleaner(timeout, service) {
    this.service = service;
    this.timeout = timeout;
    process.on('SIGINT',  this.interruption.bind({sc:this}));
    process.on('SIGTERM', this.interruption.bind({sc:this}));
}
SignalCleaner.prototype.interruption = function(signal) {
    const service = this.sc.service;
    this.sc.service = null;
    if (service) {
        service.close(function(err) { console.error('Error closing session: '+err); process.exit(1); },
                      function()    { process.exit(0); });
    }
    else setTimeout(function() { console.error('Warning: timeout while closing, terminated'); process.exit(0); }, 1000 * this.sc.timeout);
}

/*
 * Main application function, loads configuration and launch service.
 */
const run = function() {
    const configuration = fetchAndParseArguments(DEFAULT_CONF, './rudi_media_custom.ini');
    service = new HttpService(configuration);
    sc = new SignalCleaner(configuration.server.close_timeout, service);
}
run();
