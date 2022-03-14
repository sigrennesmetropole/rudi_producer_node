/**
 * Basic Media file descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Represents a basic media entry.
 * @class 
 *
 * @classdesc The media descriptor, contains all related information.
 *  The media entry is constructed with the following format:
 *  <md5sum>;<uuid>;<filename>: <mimetype>; <encoding>;<creation date>;<size>
 *
 *  The complete meta-data can also be provided to the constructor.
 *
 * @param {string}   zone      - The name of the storage and access control zone.
 * @param {object}   context   - The request context.
 * @param {string}   filename  - The media base filename.
 * @param {integer}  uuid      - The local media ID.
 * @param {string}   mime      - The data content mime format.
 * @param {string}   encoding  - The data content binary encoding.
 * @param {integer}  size      - The file size.
 * @param {string}   md5       - The md5sum of the file content.
 * @param {date}     date      - The creation/modification date.
 * @param {json}     metadata  - The meta-data dictionary.
 */
function BasicFileEntry(zone, context, filename, uuid, mime, encoding, size, md5, date, metadata) {
    this.zone     = zone;
    this.context  = context;
    this.filename = filename;
    this.uuid     = uuid;
    this.mimetype = mime;
    this.encoding = encoding;
    this.size     = size;
    this.md5      = md5;
    this.date     = date;
    if (metadata) { this.metadata = metadata; }
}

/**
 * Generate the CSV line for the media.
 *
 * @returns {string}              - The CSV line.
 */
BasicFileEntry.prototype.getCSVline = function() {
    var filetype = this.filename +': '+ this.mimetype +'; '+ this.encoding;
    var s = ';';
    return '' + this.md5 +s+ this.uuid +s+ filetype +s+ (this.date/1000) +s+ this.size;
}

/**
 * Generate the Json Schema for a *file* with the proper registering URL.
 *
 * @param {string}     contextRef - The name of the context schema.
 * @param {string}     metaRef    - The name of the meta schema.
 * @returns {string}              - The name Json schema.
 */
BasicFileEntry.fileSchema = function(contextRef, metaRef) {
    return {
        "title": "The RUDI media DB file Schema",
        "description": "The descriptor of a file associated to a RUDI media.",
        "type": "object",
        "properties": {
            "uuid": {
                "description": "A unique UUID-V4 identifier",
                "type": "string"
            },
            "zone": {
                "description": "The name of the storage zone",
                "type": "string"
            },
            "context": {
                "description":"The creation context",
                "$ref":contextRef
            },
            "filename": {
                "description": "The base file name of the media, find with the zone",
                "type": "string"
            },
            "mimetype": {
                "description": "The mime-type of the file content",
                "type": "string"
            },
            "encoding": {
                "description": "The text encoding, if applicable depending on the mime-type",
                "type": "string"
            },
            "md5": {
                "description": "MD5 checksum of the file",
                "type": "string"
            },
            "size": {
                "description": "The file size",
                "type": "integer"
            },
            "date": {
                "description": "The last modification UTC timestamp",
                "type": "string",
                "format": "date-time"
            },
            "metadata": {
                "description": "The RUDI metadata",
                "$ref": metaRef
            }
        },
        "required": [
            "uuid",
            "zone",
            "context",
            "filename",
            "mimetype"
        ]
    };
}

/**
 * Generate a unique connector ID for the media.
 * The connector generated is not managed by the media. Once generated, nothing is kept.
 * @returns {json} - Description of a new descriptor.
 */
BasicFileEntry.prototype.generateFileId = function() {
    return {
        ref:this.uuid, fileid: uuidv4(),
        count: 0, access: [], cdate:Date(),
        zone:this.zone, basefile:this.uuid + '_' + this.filename,
        filename: this.filename, // Usage filename
        type:this.mimetype
    };
}

/**
 * Load the media content.
 * The data is loaded and processed if necessary before beeing sent.
 * @param {connector ID} iddesc  - The media access descriptor.
 * @param {accessDesc}   context - The media access context.
 * @param {function=}    none    - An optional callback with the error if no CSV was found.
 * @param {function}     done    - A callback with the file when done.
 *                                 Returns the content, then name, and the mime type.
 */
BasicFileEntry.prototype.getFile = function(idesc, context, none, done) {
    if (!('source' in idesc)) {
        if (none) none(new Error('loading media: source missing in context'));
        return;
    }
    fs.readFile(idesc.source, { flag:'r'}, function(err, data) {
        if (err) {
            console.error('Error: critical failure: could not load '+idesc.source);
            if (none) none(new Error('loading media: file error'));
            return;
        }
        if (done) done(data, idesc.filename, idesc.type);
    });
}

/**
 * Check the media content.
 * The data is loaded from its expected location and an md5 is computed.
 * @param {connector ID} source  - The media descriptor.
 * @param {accessDesc}   context - The media access context.
 * @param {function=}    none    - An optional callback with the error if no file was found.
 * @param {function}     done    - A callback with the file when done.
 *                                 Returns the hash, the previous hash, and the file size.
 */
BasicFileEntry.prototype.getRealMd5 = function(source, context, none, done) {
    fs.readFile(source, { flag:'r'}, function(err, data) {
        if (err) {
            console.error('Error: critical failure: could not load '+idesc.source);
            if (none) none(new Error('loading media: file error'));
            return;
        }
        const hash = crypto.createHash('md5').update(data).digest('hex');
        const previousHash = this.entry.md5;
        if (hash != previousHash) {
            this.entry.md5 = hash;
            this.entry.size = data.length;
        }
        if (done) done(hash, previousHash, this.entry.size);
    }.bind({entry:this}));
}

module.exports = BasicFileEntry;
