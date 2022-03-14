/**
 * Interface for various Json schema syntax and management
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
const util = require('util');

/**
 * Represents a generic Json schema together with some usefull functions.
 *
 * @class 
 * @classdesc  Define a Json Schema as defined in:
 *   https://json-schema.org/specification.html
 *
 * The class interface the management of a base URL and the interface with mongo.
 *
 * @param {string}     baseurl    - The URL serving the schema.
 */
function SchemaSet(baseURL) {
    this.baseURL = baseURL;
    this.schemaList = {};
}

/**
 * Add a new schema in the DB.
 *
 * @param {string}     name    - The schema name, used byt $ref .
 * @param {string}     schema  - The schema using the standard syntax.
 */
SchemaSet.prototype.addSchema = function(name, schema) {
    this.schemaList[name] = schema;
}

/**
 * Return the preprocessed schema
 * The content is parsed in order to correct $ref according to the source URL.
 *
 * @param {string}     name    - The schema name, used byt $ref .
 * @returns {string}           - The final schema.
 */
SchemaSet.prototype.toJSON = function(name) {
    if (!(name in this.schemaList)) return null;
    const base = { '$schema': "http://json-schema.org/draft-07/schema", '$id': this.baseURL + '/' + name }
    //var newo = Object.assign({}, this.schemaList[name]); // wrong: shallow copy
    var newo = JSON.parse(JSON.stringify(this.schemaList[name])); // TODO: Need better
    return Object.assign({}, base, this.replaceToJson(newo));
}

/**
 * Convert into a Bson format.
 *
 * @param {string}     name    - The schema name, used byt $ref .
 * @returns {string}           - The schema using the Bson format, mongo compatible.
 */
SchemaSet.prototype.toBson = function(name) {
    if (!(name in this.schemaList)) return null;
    var newo = JSON.parse(JSON.stringify(this.schemaList[name])); // TODO: Need better
    return this.replaceToBson(newo);
}

/*
 * ---------------------------------------------------------------------------------
 */

/**
 * Recursive function converting all elements into the Bson format.
 *
 * @private
 * @param {string}    schema  - The soruce schema.
 * @returns {string}          - The processed schema.
 */
SchemaSet.prototype.replaceToBson = function(schema) {
    for ( e in schema) {
        const d = schema[e];
        if ((typeof d) == 'object') schema[e] = this.replaceToBson(d);
    }
    if ('type' in schema) {
        var etype = schema['type'];
        if (etype == 'string') {
            if ('format' in schema) {
                var ftype = schema['format'];
                if (ftype == 'date-time')   { delete schema['type']; schema['bsonType'] = 'date'; }
            }
        }
        if (etype == 'integer')   { delete schema['type']; schema['bsonType'] = 'int'; }
    }
    if ('$ref' in schema)         { delete schema['$ref']; schema['type'] = 'object'; }
    if ('format' in schema)       { delete schema['format']; }
    return schema;
}

/**
 * Recursive function converting $ref elements.
 *
 * @private
 * @returns {string}  schema  - The source schema.
 */
SchemaSet.prototype.replaceToJson = function(schema) {
    for ( e in schema) {
        const d = schema[e];
        if ((typeof d) == 'object') schema[e] = this.replaceToJson(d);
    }
    if ('$ref' in schema) {
        const refile = schema['$ref'];
        if (refile in this.schemaList) {
            schema['$ref'] = this.baseURL + '/' + refile;
        }
    }
    return schema;
}

/**
 * Basic unit test.
 *
 */
SchemaSet.test = function() {
    const file = {"$schema":"http://json-schema.org/draft-07/schema","$id":"rudia-media-db-file.json","title":"The RUDI media DB file Schema","description":"The descriptor of a file associated to a RUDI media.","type":"object","properties":{"uuid":{"description":"A unique UUID-V4 identifier","type":"string"},"zone":{"description":"The name of the storage zone","type":"string"},"context":{"description":"The creaction context","$ref":"rudia-media-db-context.json"},"filename":{"description":"The base file name of the media, find with the zone","type":"string"},"mimetype":{"description":"The mime-type of the file content","type":"string"},"encoding":{"description":"The text encoding, if applicable depending on the mime-type","type":"string"},"md5":{"description":"MD5 checksum of the file","type":"string"},"size":{"description":"The file size","type":"integer"},"date":{"description":"The last modification UTC timestamp","type":"date-time"},"metadata":{"description":"The RUDI metara","$ref":"rudia-media-db-meta.json"}},"required":["uuid","zone","context","filename","mimetype"]};
    const meta = {"$schema":"http://json-schema.org/draft-07/schema","$id":"rudia-media-db-meta.json","title":"The RUDI media DB metadata Schema","description":"The descriptor shall use the RUDI standard scheme.","type":"object","properties":{"media_type":{"description":"The media type, currently only FILE, STREAM in  the future","type":"string","enum":["FILE"]},"media_name":{"description":"The media name, typically used for the filename","type":"string"},"media_id":{"description":"The media UUID as set in the RUDI API","type":"string"},"lastmodification_date":{"description":"The media last modification date","type":"date-time"}},"required":["media_id","media_type","media_name"]}; 
    const context = {"$schema":"http://json-schema.org/draft-07/schema","$id":"rudia-media-db-context.json","title":"The RUDI media DB context Schema","description":"The descriptor of context associated to a RUDI media DB access.","type":"object","properties":{"source":{"description":"The request source","type":"string"},"ip":{"description":"The IP address of the request client","type":"string"},"filename":{"description":"The CSV source file","type":"string"}},"required":["source"]};

    var sdb = new SchemaSet('https://me');
    sdb.addSchema('rudia-media-db-file.json', file);
    sdb.addSchema('rudia-media-db-meta.json', meta);
    sdb.addSchema('rudia-media-db-context.json', context);
    return JSON.stringify([
        sdb.toJSON('rudia-media-db-file.json'),
        sdb.toBson('rudia-media-db-file.json')
    ], null, 4);
}

module.exports = SchemaSet;
