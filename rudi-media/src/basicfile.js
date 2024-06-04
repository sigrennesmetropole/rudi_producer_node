/**
 * Basic Media file descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
import { createHash } from 'crypto'
import { readFile } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { charsetFromContent, mimeFromContent } from './basicutils.js'

/* eslint-disable no-multi-spaces */
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
export class BasicFileEntry {
  constructor(metadata, filecontent, zone, aclStatus, filename, uuid, mime, encoding, size, md5, date) {
    this.abspath = false
    if (metadata && filecontent) {
      this.uuid = metadata.media_id
      delete metadata.media_id
      this.date = metadata.access_date
      delete metadata.access_date
      this.zone = zone
      this.aclStatus = aclStatus
      if (metadata.media_name) {
        this.filename = metadata.media_name
        delete metadata.media_name
      } else this.filename = 'media'
      if (metadata.file_type) {
        this.mimetype = metadata.file_type
        delete metadata.file_type
      } else this.mimetype = mimeFromContent(filecontent)
      if (metadata.charset) {
        this.encoding = metadata.charset
        delete metadata.charset
      } else this.encoding = charsetFromContent(filecontent)
      if (metadata.file_size) {
        this.size = metadata.file_size
        delete metadata.file_size
      } else this.size = filecontent.length
      this.md5 = createHash('md5').update(filecontent).digest('hex')
      this.metadata = metadata
    } else {
      this.zone = zone
      this.aclStatus = aclStatus
      this.filename = filename
      this.uuid = uuid
      this.mimetype = mime
      this.encoding = encoding
      this.size = size
      this.md5 = md5
      this.date = date
    }
  }
  /**
   * Generate the Json Schema for a *file* with the proper registering URL.
   *
   * @param {string}     contextRef - The name of the context schema.
   * @param {string}     metaRef    - The name of the meta schema.
   * @returns {string}              - The name Json schema.
   */
  static fileSchema(contextRef, metaRef) {
    return {
      title: 'The RUDI media DB file Schema',
      description: 'The descriptor of a file associated to a RUDI media.',
      type: 'object',
      properties: {
        uuid: {
          description: 'A unique UUID-V4 identifier',
          type: 'string',
        },
        zone: {
          description: 'The name of the storage zone',
          type: 'string',
        },
        context: {
          description: 'The creation context',
          $ref: contextRef,
        },
        filename: {
          description: 'The base file name of the media, find with the zone',
          type: 'string',
        },
        mimetype: {
          description: 'The mime-type of the file content',
          type: 'string',
        },
        encoding: {
          description: 'The text encoding, if applicable depending on the mime-type',
          type: 'string',
        },
        md5: {
          description: 'MD5 checksum of the file',
          type: 'string',
        },
        size: {
          description: 'The file size',
          type: 'integer',
        },
        date: {
          description: 'The last modification UTC timestamp',
          type: 'string',
          format: 'date-time',
        },
        metadata: {
          description: 'The RUDI metadata',
          $ref: metaRef,
        },
      },
      required: ['uuid', 'zone', 'context', 'filename', 'mimetype'],
    }
  }
  /* eslint-enable no-multi-spaces */
  /**
   */
  getStorageName = () => (this.abspath ? this.filename : `${this.uuid}_${this.filename}`)

  /**
   * Generate the CSV line for the media.
   *
   * @returns {string}              - The CSV line.
   */
  getCSVline() {
    const filetype = `${this.filename}: ${this.mimetype}; ${this.encoding}`
    const s = ';'
    return '' + this.md5 + s + this.uuid + s + filetype + s + this.date / 1000 + s + this.size
  }
  /**
   * Generate a unique connector ID for the media.
   * The connector generated is not managed by the media. Once generated, nothing is kept.
   * @returns {json} - Description of a new descriptor.
   */
  generateFileId() {
    return {
      ref: this.uuid,
      fileid: uuidv4(),
      count: 0,
      access: [],
      cdate: Date(),
      zone: this.zone.name,
      source: this.zone.getPathFromConnector(this),
      filename: this.filename,
      type: this.mimetype,
    }
  }
  clear(staged) {
    this.zone.commitClear(this)
    staged.process(`File [${this.uuid}]:${this.filename} marked not confirmed`)
  }
  commit(staged) {
    const path = this.zone.commitPath(this)
    staged.process(`File [${this.uuid}]:${path} commited`)
  }
  destroy(staged) {
    this.zone.destroyMedia(this, staged)
    if (staged) staged.process(`File [${this.uuid}]:${this.filename} destroyed`)
  }
  /**
   */
  toJSON() {
    return {
      uuid: this.uuid,
      zone: this.zone.name,
      context: this.aclStatus.context.toJSON(),
      filename: this.filename,
      mimetype: this.mimetype,
      encoding: this.encoding,
      md5: this.md5,
      size: this.size,
      date: this.date,
      basefile: this.getStorageName(),
    }
  }
  /**
   * Load the media content.
   * The data is loaded and processed if necessary before beeing sent.
   * @param {connector ID} iddesc  - The media access descriptor.
   * @param {function=}    none    - An optional callback with the error if no CSV was found.
   * @param {function}     done    - A callback with the file when done.
   *                                 Returns the content, then name, and the mime type.
   */
  getFile(idesc, none, done) {
    if (!idesc?.source) {
      if (none) none('loading media: source missing in context', 404)
      return
    }
    readFile(idesc.source, { flag: 'r' }, function (err, data) {
      if (err) {
        console.error('Error: critical failure: could not load ' + idesc.source)
        if (none) none('loading media: file error', 500)
        return
      }
      if (done) done(data, idesc.filename, idesc.type)
    })
  }
  /**
   * Check the media content.
   * The data is loaded from its expected location and an md5 is computed.
   * @param {connector ID} source  - The media descriptor.
   * @param {function=}    none    - An optional callback with the error if no file was found.
   * @param {function}     done    - A callback with the file when done.
   *                                 Returns the hash, the previous hash, and the file size.
   */
  getRealMd5(none, done) {
    const source = this.zone.getPathFromConnector(this)
    readFile(source, { flag: 'r' }, (err, data) => {
      if (err) {
        console.error('Error: critical failure: could not load ' + source)
        if (none) none('loading media: file error', 500)
        return
      }
      const hash = createHash('md5').update(data).digest('hex')
      const previousHash = this.md5
      if (hash != previousHash) {
        this.md5 = hash
        this.size = data.length
      }
      if (done) done(hash, previousHash, this.size)
    })
  }
}
