/**
 * Basic Media URL descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
import { createHash } from 'crypto'
import { get } from 'http'
import { get as _get } from 'https'
import { URL } from 'url'
import { v4 as uuidv4 } from 'uuid'

/* eslint-disable no-multi-spaces */
/**
 * Represents a basic URL entry.
 * @class
 *
 *  The complete meta-data can also be provided to the constructor.
 *
 * @param {string}   zone      - The name of the storage and access control zone.
 * @param {object}   context   - The request context.
 * @param {string}   name      - The media base filename.
 * @param {integer}  uuid      - The local media ID.
 * @param {string}   url       - The URL of the data.
 * @param {date}     date      - The creation/modification date.
 * @param {date}     expire    - The expire date.
 * @param {json}     metadata  - The meta-data dictionary.
 */
export class BasicUrlEntry {
  constructor(metadata, zone, aclStatus, name, uuid, url, date, expire) {
    if (metadata) {
      this.uuid = metadata.media_id
      delete metadata.media_id
      this.date = metadata.access_date
      delete metadata.access_date
      this.zone = zone
      this.aclStatus = aclStatus
      this.url = metadata.url
      delete metadata.url
      if (metadata.media_name) {
        this.filename = metadata.media_name
        delete metadata.media_name
      } else this.filename = 'media'
      if (metadata.expire_date) {
        this.expire = new Date(parseInt(metadata.expire_date) * 1000)
        delete metadata.expire_date
      } else this.expire = 0
      this.metadata = metadata
    } else {
      this.zone = zone
      this.aclStatus = aclStatus
      this.name = name
      this.uuid = uuid
      this.url = url
      this.mimetype = 'text/uri-list'
      this.encoding = 'charset=utf-8'
      this.date = date
      this.expire = expire
      this.md5 = '-'
    }
  }
  /**
   * Generate the Json Schema for a *file* with the proper registering URL.
   *
   * @param {string}     contextRef - The name of the context schema.
   * @param {string}     metaRef    - The name of the meta schema.
   * @returns {string}              - The name Json schema.
   */
  static urlSchema(contextRef, metaRef) {
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
          description: 'The creaction context',
          $ref: contextRef,
        },
        name: {
          description: 'The name of the media, find with the zone',
          type: 'string',
        },
        url: {
          description: 'The URL of the media, find with the zone',
          type: 'string',
          format: 'uri',
        },
        mimetype: {
          description: 'The mime-type of the URL',
          type: 'string',
        },
        encoding: {
          description: 'The text encoding of the URL',
          type: 'string',
        },
        date: {
          description: 'The last valid URL access UTC timestamp',
          type: 'string',
          format: 'date-time',
        },
        expire: {
          description: 'The URL expiration UTC timestamp',
          type: 'string',
          format: 'date-time',
        },
        metadata: {
          description: 'The RUDI metara',
          $ref: metaRef,
        },
      },
      required: ['uuid', 'zone', 'context', 'name', 'url'],
    }
  }
  /* eslint-enable no-multi-spaces */
  /**
   */
  getStorageName() {
    return '#' + this.url
  }
  /**
   * Generate the CSV line for the media.
   *
   * @returns {string}              - The CSV line.
   */
  getCSVline() {
    const filetype = this.name + ': ' + this.mimetype + '; ' + this.encoding
    const d = this.date.valueOf()
    const e = this.expire.valueOf()
    const s = ';'
    return '' + this.url + s + this.uuid + s + filetype + s + (d ? d / 1000 : 0) + s + (e ? e / 1000 : 0)
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
      name: this.name,
    }
  }
  clear(staged) {
    staged.process(`URL [${this.uuid}]:${this.url} marked not confirmed`)
  }
  commit(staged) {
    const path = this.zone.getPathFromConnector(this)
    staged.process(`URL [${this.uuid}]:${path} commited`)
  }
  destroy(staged) {
    if (staged) staged.process(`URL [${this.uuid}]:${this.url} destroyed`)
  }
  /**
   */
  toJSON() {
    return {
      uuid: this.uuid,
      zone: this.zone.name,
      context: this.aclStatus.context.toJSON(),
      url: this.url,
      mimetype: this.mimetype,
      encoding: this.encoding,
      name: this.name,
      date: this.date,
      basefile: this.getStorageName(),
    }
  }
  /**
   * Load the media content.
   * The data is loaded and processed if necessary before beeing sent.
   * @param {connector ID} iddesc  - The media access descriptor.
   * @param {accessDesc}   context - The media access context.
   * @param {function=}    none    - An optional callback with the error if no CSV was found.
   * @param {function}     done    - A callback with the file when done.
   *                                 Returns an array with the content, then name, and the mime type.
   */
  getFile(idesc, none, done) {
    if (!idesc?.url) {
      if (none) none('loading URL media: url missing in context', 400)
      return
    }
    const source = idesc.url

    try {
      const sourceUrl = new URL(source)
      switch (sourceUrl.protocol) {
        case 'https:': {
          _get(sourceUrl.href, (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              if (done) done(data, idesc.name, 'charset=binary')
            })
          }).on('error', (error) => {
            console.error('Error: critical failure: could not load ' + sourceUrl.href + ': ' + error)
            if (none) none('loading media: file error', 500)
            return
          })
          break
        }
        case 'http:': {
          get(sourceUrl.href, (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              if (done) done(data, idesc.name, 'charset=binary')
            })
          }).on('error', (error) => {
            console.error('Error: critical failure: could not load ' + sourceUrl.href + ': ' + error)
            if (none) none('loading media: file error', 500)
            return
          })
          break
        }
        default:
          if (none) none('loading URL media: protocol not supported (' + sourceUrl.protocol + ')', 400)
      }
    } catch (e) {
      if (none) none('loading URL media: content access error', 500)
    }
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
    return this.getFile(this, none, (data, name, charset) => {
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
