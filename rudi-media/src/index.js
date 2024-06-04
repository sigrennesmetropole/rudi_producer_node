/**
 * RUDI media access driver for media data.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */

import express from 'express'
import { readFileSync } from 'fs'
import { parse as iniParse } from 'ini'
import { gzip } from 'zlib'

import minimist from 'minimist'
const _argv = minimist(process.argv.slice(2))

import { RudiLogger } from '@aqmo.org/rudi_logger'
import { AccessControl } from './access.js'
import { BasicFileDB } from './basicdb.js'
import { BasicFileEntry } from './basicfile.js'
import { BasicUrlEntry } from './basicurl.js'
import { WRITE_OPT_APPEND } from './basiczone.js'
import { DEFAULT_CONF } from './configuration.js'
import { MongoService } from './db.js'
import { SchemaSet } from './schema.js'

const MAX_FILE_SIZE = 500e6

/**
 * The code express based HTTP server.
 * The web server creates the media db, and serves:
 *  - a route for requesting a connector for a media UUID
 *  - a route for loading the data loaded from a media UUID.
 */
class HttpService {
  /**
   * @param {object}  configuration The configuration used
   */
  constructor(configuration) {
    this.revision = configuration.logging.revision
    this.syslog = new RudiLogger(configuration.logging.app_name, this.revision, configuration)

    this.port = configuration.server.listening_port
    this.netInterface = configuration.server.listening_address
    this.server = configuration.server.server_url

    this.httpPrefix = this._normalizeHttpPrefix(configuration.server.server_prefix)

    this._initHttpService(configuration)
      .then(() => this.syslog.debug('Initialization complete'))
      .catch((err) => {
        console.error(err)
        this.syslog.error(`An error happened during initialization: ${JSON.stringify(err)}`)
      })
  }
  /**
   * What we want is a prefix that is either '/' or '/something/'
   * The prefix is here normalized to make sure it adopts this convention.
   */
  _normalizeHttpPrefix(prefix) {
    if (!prefix || prefix == '' || prefix == '/') return '/'
    if (prefix.endsWith('/')) prefix = prefix.slice(0, -1)
    // this.syslog.debug(`Http prefix: '${prefix}'`)
    return prefix.startsWith('/') ? prefix : `/${prefix}`
  }

  async _initHttpService(configuration) {
    this.httpServer = express()

    const schemaURL = `${this.server}${this.httpPrefix}schema`
    const schemaBase = `${configuration.schemas.schema_basename}`
    const contextRef = `${schemaBase}${configuration.schemas.schema_context}`
    const metaRef = `${schemaBase}${configuration.schemas.schema_meta}`
    const eventRef = `${schemaBase}${configuration.schemas.schema_event}`
    const fileRef = `${schemaBase}${configuration.schemas.schema_file}`
    const urlRef = `${schemaBase}${configuration.schemas.schema_url}`

    this.schemaSet = new SchemaSet(schemaURL)
    this.schemaSet.addSchema(contextRef, HttpService.contextSchema())
    this.schemaSet.addSchema(metaRef, HttpService.metaSchema())
    this.schemaSet.addSchema(eventRef, BasicFileDB.eventSchema(contextRef))
    this.schemaSet.addSchema(fileRef, BasicFileEntry.fileSchema(contextRef, metaRef))
    this.schemaSet.addSchema(urlRef, BasicUrlEntry.urlSchema(contextRef, metaRef))

    this.logweb = this.syslog.getWebInterface()
    this.ac = new AccessControl(configuration.auth, this.syslog)
    if (this.logweb) this.logweb.setWebAccessControlInterface(this.ac)
    // this.wl.setWebAccessControlInterface(this.ac);
    // eslint-disable-next-line new-cap
    this.icon = Buffer.from(
      'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACe7OkFqNqYQ6jZlKWo2ZTjpdiR+5bQgvuc04Pj5PWgovv/qED4/6cEAAAAAAAAAAAAAAAAAAAAAAAAAACb7/wSm+/7h6Hlyeyo2pb/qNmU/6XYkv+W0IL/ndOD/+n4of/5/6fq+P+ng/j/pxAAAAAAAAAAAAAAAACa7/sQm+/7oZvv+/2b7/j/ouTG/6jalv+m2JH/ltCC/53Tg//p+KH/+f+n//j/p/34/6eb+P+mDgAAAACf7voBm+/7e5vv+/yb7/v/m+/8/5vu+P+i5MX/pdiT/5bQgv+d04P/6fih//n/p//4/6f/+P+n+/j9p3UAAAAAnPD7MZvw++Cb7/v/m+/7/5vv+/+b8Pz/nO/4/5/iwv+V0IT/ndOD/+n4of/5/6f/+P+n//j7qP/35qvc9tStLJPl+YWV5/n+lef5/5Xn+f+V5/n/lef5/5bo+viY7PbSj9mq053Tg/jp96H/+f+n//j8p//35av/9tat/fbWrX1+yfPEfsnz/37J8/9+yfP/fsr0/37K9PqAy/SHkOj/FITcuhWk14eN6vii+/n9qP/35av/9tat//bWrf/21q28fMfz33zH8/98x/P/fMfz/3zF8/+AqOvYgpDmGgAAAAAAAAAA4/efHfb7p9z35qv/9tat//bWrf/21q3/9tat2HzH8958x/P/fMfz/3zG8/+BoOr/iXTf2Z173hwAAAAAAAAAAPnuqh/346vd9tet//bWrf/21q3/9tat//bWrdh8x/PCfMfz/3zH8/+Boer/h3Lf/5R43/vJpOOP5a3TGuWTrhvzya2S9M6t/PTOrf/0zq3/9M6t//TOrf/00K26fMfzgnzH8/6Bour/iHPf/4du3v+Ved//zqjk+dup2Nnfg7La4oit+uKKrf/iiq3/4oqt/+KKrf/iiq3944+te3zK8y6Boerdh3Tf/4hu3v+Hbt7/lXnf/86o5P/TqeP/0YnI/917rv/eeq3/3nqt/956rf/eeq3/3nqt2t55rSoAAAAAiHDedohu3vuIb97/h27e/5V53//OqOT/0qrj/8SS3v/Phcf/3Xyu/957rf/ee63/3nut+t57rXAAAAAAAAAAAIdu3g2Ib96aiG/e/Idu3v+Ved//zqjk/9Kq4//Ekt//wo7d/9CFxv/dfK7/3nut/N57rZXee60MAAAAAAAAAAAAAAAAiG7eD4hv3n+Hbt7nlXnf/86o5P/SqeP/xJLf/8KP3v/Dj93/0YXF5d57rXvfeqwOAAAAAAAAAADT0c4F09HOBeHjyASwotIGjHXdQJp/357PquPd0qrj+MST3/jCkN7dw5LencSV3D7Tr8cG0N/VBNPRzgXT0c4F+B8AAOAHAADAAwAAwAMAAIABAAAAAQAAAYAAAAPAAAADwAAAAYAAAAABAACAAQAAwAMAAMADAADwDwAA+B8AAA==',
      'base64'
    )

    this.syslog.warn(`Media file system: ${configuration.storage.media_dir}`, 'core')

    this.mongodb = new MongoService(configuration.database, this.schemaSet, fileRef, urlRef, eventRef, this.syslog)
    this.db = new BasicFileDB(
      configuration.storage.media_dir,
      this.ac.acldb,
      this.syslog,
      this.mongodb,
      configuration.storage.acc_timeout
    )
    try {
      await this.mongodb.open()
      this.syslog.info('DB initialized', 'core')
      this.db.init(configuration.storage.zones, true)
    } catch (err) {
      this.syslog.error('DB initialization failed: ' + err, 'core')
      this.db.init(configuration.storage.zones, false)
    }
    // this.syslog.debug(`Zones configured: ${JSON.stringify(configuration.storage.zones)}`)
    // this.syslog.debug(`Storage: ${JSON.stringify(configuration.storage)}`)

    this._declareRoutes()
  }
  _errorHandler(err, req, res, next) {
    const now = new Date()
    // console.error(now, `[Express default error handler]`, err)
    this.syslog.error(`An error happened on ${req.method} ${req.url}: ${err}`)
    console.error('[Local dump]', err)

    if (res.headersSent) {
      return
    }
    // res.status(500)
    // res.render('error', { time: now.getTime(), error: err })
    res.status(500).json({
      error: `An error was thrown, please contact the Admin with the information bellow`,
      message: err.message,
      time: now.getTime(),
    })
  }
  _logRequests(req, reply, next) {
    this.syslog.info(`Request <= ${req.method} ${req.url}`)
    next()

    reply.on('finish', () => {
      if (reply.statusCode < 400) {
        this.syslog.info(`=> OK ${reply.statusCode}: ${req.method} ${req.originalUrl}`)
        // console.debug(res)
      } else {
        // console.error(res)
        this.syslog.warn(`ERR ${reply.statusCode} ${reply.statusMessage} > ${req.method} ${req.originalUrl}`)
      }
    })
  }
  _logRouterRequests(req, reply, next) {
    this.syslog.info(`Route <= ${req.method} ${req.url}`)
    next()
  }

  _declareRoutes() {
    this.httpServer.use((req, res, next) => this._logRequests(req, res, next))

    const router = express.Router() // eslint-disable-line new-cap
    router.use((req, res, next) => this._logRouterRequests(req, res, next))
    // this.syslog.info(`This server prefix is: ${this.httpPrefix}`)

    router.get('/fail', () => {
      throw new Error(`This error is handled, isn't it?`)
    })
    router.get('/', (req, res) => this.root(req, res))
    router.get('/favicon.ico', (req, res) => this.favicon(req, res))
    router.get(/\/(revision|hash)/, (req, res) => this.getRevision(req, res))
    if (this.logweb) {
      router.get('/logs', (req, res) => this.logweb.logContent(req, res))
      router.get('/logs/:name', (req, res) => this.logweb.logFile(req, res))
    }
    router.post('/jwt/forge', (req, res) => this.forgeUserToken(req, res))
    router.get('/storage/:fileid', (req, res) => this.fileService(req, res))
    router.post('/post', (req, res) => this.postFile(req, res))
    router.post('/commit', (req, res) => this.commitMedia(req, res))
    router.post('/delete/:uuid', (req, res) => this.deleteMedia(req, res))
    router.get('/list', (req, res) => this.listMedias(req, res))
    router.get('/schema/:name', (req, res) => this.schemas(req, res))
    router.get('/schemas', (req, res) => this.schemas(req, res))
    router.get('/check/:uuid', (req, res) => this.checkFile(req, res))
    router.get('/download/:uuid', (req, res) => this.direct(req, res))
    router.get('/zdownload/:uuid', (req, res) => this.compress(req, res))
    router.get('/:uuid', (req, res) => this.media(req, res))
    router.options('/jwt/forge', (req, res) => this.optionCors(req, res))
    router.options('/storage/:fileid', (req, res) => this.optionCors(req, res))
    router.options(/\/(post|commit|delete|list)/, (req, res) => this.optionCors(req, res))
    router.options('/schemas', (req, res) => this.schemas(req, res))
    router.options('/schema/:name', (req, res) => this.schemas(req, res))
    router.options('/check/:uuid', (req, res) => this.optionCors(req, res))
    router.options(/\/z?download\/:uuid/, (req, res) => this.optionCors(req, res))
    router.options('/:uuid', (req, res) => this.optionCors(req, res))

    this.httpServer.use(this.httpPrefix, router)
    this.listen = this.httpServer.listen(this.port, this.netInterface)

    // Launching message
    this.syslog.info(
      `RUDI Media server listening on ${this.netInterface}${this.port ? ':' + this.port : ''}${this.httpPrefix}`
    )
    // This line should stay at the end: it handles the uncaught errors
    this.httpServer.use((err, req, res, next) => this._errorHandler(err, req, res, next))
  }
  /**
   * Generate a Json Schema for a *context* with the proper registering URL.
   *
   * @returns {json}                - The Json schema.
   */
  static contextSchema() {
    return {
      title: 'The RUDI media DB context Schema',
      description: 'The descriptor of context associated to a RUDI media DB access.',
      type: 'object',
      properties: {
        source: {
          description: 'The request source',
          type: 'string',
        },
        ip: {
          description: 'The IP address of the request client',
          type: 'string',
          format: 'ipv4',
        },
        user: {
          description: 'The user id used for the request',
          type: 'string',
        },
        access: {
          description: 'The access mode used for the request',
          type: 'string',
        },
        filename: {
          description: 'The CSV source file',
          type: 'string',
        },
      },
      required: ['source'],
    }
  }
  /**
   * Generate a Json Schema for a *metadata* with the proper registering URL.
   *
   * @returns {array}               - The Json schema.
   */
  static metaSchema() {
    return {
      title: 'The RUDI media DB metadata Schema',
      description: 'The descriptor shall use the RUDI standard scheme.',
      type: 'object',
      properties: {
        media_type: {
          description: 'The media type, currently only FILE, STREAM in  the future',
          type: 'string',
          enum: ['FILE', 'STREAM', 'INDIRECT'],
        },
        media_name: {
          description: 'The media name, typically used for the filename',
          type: 'string',
        },
        media_id: {
          description: 'The media UUID as set in the RUDI API',
          type: 'string',
        },
        lastmodification_date: {
          description: 'The media last modification date',
          type: 'string',
        },
      },
      required: ['media_id', 'media_type', 'media_name'],
    }
  }
  /**
   * Flush and stop the database, and close the server.
   *
   */
  close(err, done) {
    return this.listen.close((err) => {
      this.db.close(err)
      this.mongodb.close(err, done)
    })
  }

  /**
   * Serves a favicon. For fun because I like it (CC Licence).
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  favicon(req, res) {
    res.statusCode = 200
    res.setHeader('Content-Length', (req, res) => this.favicon.length(req, res))
    res.setHeader('Content-Type', 'image/x-icon')
    res.setHeader('Cache-Control', 'public, max-age=2592000') // expiration: after a month
    res.setHeader('Expires', new Date(Date.now() + 2592000000).toUTCString())
    res.end(this.icon)
  }
  /**
   * Serves the value of the current application revision.
   *
   * The revision shall be provided in the command line.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  getRevision(req, res) {
    res.statusCode = 200
    res.type('text/plain')
    res.end(this.revision)
  }
  /**
   * Serves the default page.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  root(req, res) {
    const aclStatus = this.ac.getAccessStatus(req, res)
    if (!this.ac.checkSystemAccessStatus(aclStatus, '---')) return
    if (req?.headers?.file_metadata) return this.media(req, res)

    res.send(
      '<!DOCTYPE html>\
<html lang="en">\
  <head><meta charset="utf-8"><title>Rudi media access driver</title></head>\
  <body>\
    <H1>Rudi media access driver, access restricted</H1>\
    <H2><a href="' +
        this.httpPrefix +
        'logs/" >Log file list (requires authorization)</a></H2>\
  </body>\
</html>'
    )
  }
  /**
   * Serves a post of a new media.
   * The post HTTP header must contain the ":file_metadata" with all necessary fields.
   *
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  schemas(req, res) {
    const name = req.params.name
    const content = this.schemaSet.toJSON(name)
    if (!content) return this.sendAndClose(res, 404, 'Schema not found')
    this.sendAndClose(res, 200, content)
  }
  /**
   * Create a request context.
   * The context is used to process requests,
   *   and contains basic information about the sender.
   * @param {object} req - the HTTP request
   */
  generateContext(req, aclStatus) {
    const srcip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    return { source: 'API', ip: srcip, access: aclStatus.access, user: aclStatus.uname }
  }
  /**
   * Serves an OPTION for CORS enable entries.
   *
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  optionCors(req, res) {
    const baseHeaderList =
      'Content-Type, Authorization, Content-Length, X-Requested-With, file_metadata, Media-Access-Method, media_cookie'
    const extendedHeaderList = 'Cache-Control, Pragma, Sec-GPC'
    const headersOpts = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': `${baseHeaderList}, ${extendedHeaderList}`,
    }
    res.header(headersOpts).status(200).end()
  }
  /**
   * Close a communication with a Json message and a status code.
   *
   * @private
   * @param {object} req - the HTTP request
   * @param {object} msg - Json message.
   * @param {number} code - the HTML code.
   */
  sendAndClose(res, code, msg) {
    res.header('Access-Control-Allow-Origin', '*')
    res.status(code).json(msg)
  }
  listMedias(req, res) {
    this.syslog.debug(`[listMedias]${req.originalUrl}`, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res)
    if (!this.ac.checkSystemAccessStatus(aclStatus, '---')) return

    const mediaList = this.db.list(aclStatus)
    this.syslog.debug(`[listMedias] ${aclStatus.uname} => ${mediaList.count} ${mediaList.errors}`, 'http')
    if (!mediaList) this.sendAndClose(res, 404, { status: 'error', msg: 'media list not available' })
    else if ((!aclStatus.uname || aclStatus.uname == '-') && mediaList.count == mediaList.errors) {
      res.set('WWW-Authenticate', 'Basic realm="Missing access rights"')
      this.sendAndClose(res, 401, { status: 'error', msg: 'access denied' })
    } else {
      this.sendAndClose(res, 200, mediaList)
    }
  }
  forgeUserToken(req, res) {
    this.syslog.debug(`[forgeUserToken] ${req.originalUrl}`, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res)
    if (!this.ac.checkSystemAccessStatus(aclStatus, '--x')) return

    const contentType = req.headers?.['Content-Type'] || req.headers?.['content-type']
    if (contentType != 'application/json')
      return this.sendAndClose(res, 400, { status: 'error', msg: 'application/json Content-Type expected' })

    // Get the config
    const body = []
    req.on('data', (chunk) => body.push(chunk))
    req.on('end', () => {
      let userDesc = Buffer.concat(body).toString()
      try {
        userDesc = JSON.parse(userDesc)
      } catch (err) {
        return this.sendAndClose(res, 400, { status: 'error', msg: 'malformed application/json' })
      }
      if (!userDesc) return this.sendAndClose(res, 400, { status: 'error', msg: 'malformed application/json' })
      if (!userDesc.user_id && userDesc.user_id !== 0)
        return this.sendAndClose(res, 400, { status: 'error', msg: 'missing user_id' })
      if (!userDesc.user_name) return this.sendAndClose(res, 400, { status: 'error', msg: 'missing user_name' })
      if (!userDesc.group_name) userDesc.group_name = null

      const jwt = this.ac.forgeJwt(aclStatus, userDesc.user_id, userDesc.user_name, userDesc.group_name)
      if (!jwt) return
      else {
        this.syslog.info(`forged token for ${userDesc.user_name}:${userDesc.group_name || '-'}`, 'core')
        res.setHeader('cookie', 'rudi.media.auth=' + jwt)
        res.status(200).json({ status: 'OK', token: jwt })
      }
    })
  }

  /**
   * Post a new media.
   * The post HTTP header must contain the ":file_metadata" with all necessary fields.
   *
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  postFile(req, res) {
    this.syslog.debug(`[postFile]${req.originalUrl}`, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res, 'API')
    if (!this.ac.checkSystemAccessStatus(aclStatus, '-w-'))
      return this.sendAndClose(res, 401, { status: 'error', msg: 'permission refused' })

    if (!req.headers?.file_metadata)
      return this.sendAndClose(res, 400, { status: 'error', msg: 'no metadata provided' })

    let metadata = req.headers.file_metadata
    try {
      metadata = JSON.parse(metadata)
    } catch (err) {
      this.syslog.error(`malformed metadata: ${JSON.stringify(metadata)}`, 'core')
      return this.sendAndClose(res, 400, { status: 'error', msg: 'malformed metadata' })
    }

    if (req.query?.append) req.headers['media-access-method'] = WRITE_OPT_APPEND

    // Bufferize file data
    const chunkSize = 65536 * 4
    const contentLength = req.headers['Content-Length'] || req.headers['content-length']
    const fileSize = metadata.file_size || parseInt(contentLength) || chunkSize
    // TODO: shouldAppend -> check actual file size + size of the new file bit
    if (fileSize > MAX_FILE_SIZE) {
      this.syslog.error(`file too large, use a different upload method: ${JSON.stringify(metadata)}`)
      return this.sendAndClose(res, 400, {
        status: 'error',
        msg: 'file too large, use a different upload method',
      })
    }

    res.header('Access-Control-Allow-Origin', '*')
    res.type('application/json')
    res.write('[ ')

    // Bufferize file data
    const dwnld = new DownloadService(chunkSize, fileSize)
    res.write('{ "status": "download" }, ')
    const update = (size) => res.write(`{"status":"upload_status", "size":${size}}, `)
    req.on('readable', () => dwnld.read(req, update))

    // Build the entry, Close the request
    req.on('end', () => {
      const data = dwnld.finish()
      this.syslog.debug(`content: ${data.length}`, 'core')
      const mediaAccessMethod = req?.headers?.['media-access-method']
      this.db.addEntry(
        metadata,
        aclStatus,
        data,
        mediaAccessMethod,
        (err, code = 400) => {
          res.write(`{"status": "error", "msg":"${err}"} ]`)
          res.status(code).end()
        },
        (zone, commitUrl) => {
          let content = ''
          if (commitUrl)
            content += `{ "status": "commit_ready" , "zone_name": "${zone}", "commit_uuid": "${commitUrl}" }, `
          content += '{ "status": "OK" } ]'
          res.write(content)
          res.status(200).end()
        }
      )
    })
  }

  /**
   * Commit the post/append of a new media.
   * The post HTTP header must contain the ":file_metadata" with all necessary fields.
   *
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  commitMedia(req, res) {
    this.syslog.debug('[commitMedia]' + req.originalUrl, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res, 'API')
    if (!this.ac.checkSystemAccessStatus(aclStatus, '--x')) return

    const processCommit = (zoneName, commitUuid) => {
      this.db.commit(
        zoneName,
        commitUuid,
        aclStatus,
        (err, code = null) => this.sendAndClose(res, code || 400, { status: 'error', msg: `${err}` }),
        () => this.sendAndClose(res, 200, { status: 'OK' })
      )
    }
    const processJson = (metadata) => {
      try {
        metadata = JSON.parse(metadata)
      } catch (err) {
        this.syslog.error(`malformed commit message: ${metadata}`, 'core')
        this.sendAndClose(res, 400, { status: 'error', msg: 'malformed metadata' })
        return
      }

      if (!metadata.commit_uuid) {
        this.syslog.error(`commit_uuid missing in metadata: ${JSON.stringify(metadata)}`)
        this.sendAndClose(res, 400, { status: 'error', msg: 'commit_uuid missing in metadata' })
        return
      }
      if (!metadata.zone_name) {
        this.syslog.error(`zone_name missing in metadata: ${JSON.stringify(metadata)}`)
        this.sendAndClose(res, 400, { status: 'error', msg: 'zone_name missing in metadata' })
        return
      }
      processCommit(metadata.zone_name, metadata.commit_uuid)
    }

    let commitUuid = '-'
    let zoneName = '-'
    if (req.query?.zone_name && req.query.commit_uuid) {
      zoneName = req.query.zone_name
      commitUuid = req.query.commit_uuid
      processCommit(zoneName, commitUuid)
    } else {
      let metadata = req.body
      if (req.headers?.media_commit) {
        metadata = req.headers.media_commit
        processJson(metadata)
      } else {
        // Bufferize file data
        const contentLength = req.headers['Content-Length'] || req.headers['content-length']
        const size = parseInt(contentLength) || 4096
        const dwnld = new DownloadService(4096, size)
        req.on('readable', () => dwnld.read(req))
        // Build the entry, Close the request
        req.on('end', () => {
          metadata = dwnld.finish().toString('utf-8')
          processJson(metadata)
        })
      }
    }
  }
  deleteMedia(req, res) {
    this.syslog.debug('[deleteMedia] ' + req.originalUrl, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res, 'API')
    if (!this.ac.checkSystemAccessStatus(aclStatus, '-wx')) return

    const processDelete = (uuid) => {
      this.db.mdelete(
        uuid,
        aclStatus,
        (err, code = null) => this.sendAndClose(res, code || 400, { status: 'error', msg: `${err}` }),
        () => {
          this.syslog.notice('[deleteMedia] ' + uuid, 'API')
          this.sendAndClose(res, 200, { status: 'OK' })
        }
      )
    }
    const processJson = (metadata) => {
      try {
        metadata = JSON.parse(metadata)
      } catch (err) {
        this.syslog.error('malformed delete message: ' + JSON.stringify(metadata), 'core')
        this.sendAndClose(res, 400, { status: 'error', msg: 'malformed metadata' })
        return
      }
      if (!metadata.uuid) {
        this.syslog.error('uuid missing in metadata: ' + JSON.stringify(metadata))
        this.sendAndClose(res, 400, { status: 'error', msg: 'uuid missing in metadata' })
        return
      }
      processDelete(metadata.uuid)
    }

    let uuid = '-'
    if (req.params?.uuid) {
      uuid = req.params.uuid
      processDelete(uuid)
    } else if (req.query?.zone_name && req.query.commit_uuid) {
      uuid = req.query.commit_uuid
      processDelete(uuid)
    } else {
      let metadata = req.body
      if (req.headers?.media_delete) {
        metadata = req.headers.media_delete
        processJson(metadata)
      } else {
        // Bufferize file data
        const contentLength = req.headers['Content-Length'] || req.headers['content-length']
        const size = parseInt(contentLength) || 4096
        const dwnld = new DownloadService(4096, size)
        req.on('readable', () => dwnld.read(req))
        // Build the entry, Close the request
        req.on('end', () => {
          metadata = dwnld.finish().toString('utf-8')
          processJson(metadata)
        })
      }
    }
  }
  /**
   * Serves the media connector creation API.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  media(req, res) {
    this.syslog.debug('[media]' + req.originalUrl, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res)
    if (!this.ac.checkSystemAccessStatus(aclStatus, '---')) return

    let reqUuid = '-'
    if (req.params?.uuid) reqUuid = req.params.uuid
    else {
      if (!req.headers?.file_metadata) {
        this.sendAndClose(res, 400, { status: 'error', msg: 'no meta-data provided' })
        return
      }
      let metadata = req.headers.file_metadata
      try {
        metadata = JSON.parse(metadata)
      } catch (err) {
        this.syslog.error(`malformed metadata: ${JSON.stringify(metadata)}`, 'core')
        this.sendAndClose(res, 400, { status: 'error', msg: 'malformed metadata' })
        return
      }

      if (!metadata.media_id) {
        this.syslog.error(`uuid missing in metadata: ${JSON.stringify(metadata)}`)
        this.sendAndClose(res, 400, { status: 'error', msg: 'uuid missing in metadata' })
        return
      }
      reqUuid = metadata.media_id
    }

    const accessMode = req.headers['media-access-method']
    if (accessMode == 'Direct') {
      const nid = this.db.get(reqUuid, aclStatus)
      if (!nid) this.sendAndClose(res, 404, { status: 'error', msg: 'media uuid not found' })
      else {
        req.params.fileid = nid
        this.syslog.notice('[media][direct]: ' + reqUuid, 'API')
        this.fileService(req, res)
      }
    } else if (accessMode == 'Check') {
      this.db.check(
        reqUuid,
        aclStatus,
        (err, code = 400) => this.sendAndClose(res, code, { status: 'error', msg: `${err}` }),
        (hash, previousHash, size) => {
          this.syslog.notice(`[media][check]: ${reqUuid}`, 'API')
          if (hash != previousHash && previousHash != '-') {
            this.syslog.error(
              `Media changed on disk for uuid ${reqUuid} hash=${hash} previously=${previousHash}`,
              'core'
            )
          }
          this.syslog.info(`full read of media: ${reqUuid}`, 'core')
          this.sendAndClose(res, 200, {
            status: 'OK',
            md5: hash,
            previous_md5: previousHash,
            size: size,
          })
        }
      )
    } else {
      const nid = this.db.get(reqUuid, aclStatus)
      if (!nid) this.sendAndClose(res, 404, { status: 'error', msg: 'media uuid not found' })
      else {
        this.syslog.notice(`[media][access]: ${reqUuid}`, 'API')
        this.sendAndClose(res, 200, { url: `${this.server}${this.httpPrefix}storage/${nid}` })
      }
    }
  }
  /**
   * Serves a direct access through the media connector.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  direct(req, res) {
    req.headers['media-access-method'] = 'Direct'
    this.media(req, res)
  }
  /**
   * Serves a direct access through the media connector.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  compress(req, res) {
    req.headers['media-access-method'] = 'Direct'
    req.headers['media-access-compression'] = 'true'
    this.media(req, res)
  }
  /**
   * Serves a check of an existing media.
   *
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  checkFile(req, res) {
    req.headers['media-access-method'] = 'Check'
    this.media(req, res)
  }
  /**
   * Serves the access to the media content from a connector.
   * @param {object} req - the HTTP request
   * @param {object} res - the HTTP response.
   */
  fileService(req, res) {
    this.syslog.debug('[fileService]' + req.originalUrl, 'http')
    const aclStatus = this.ac.getAccessStatus(req, res)
    if (!this.ac.checkSystemAccessStatus(aclStatus, '---')) return

    const fileid = req.params.fileid

    this.db.find(
      fileid,
      aclStatus,
      (err, code) => this.sendAndClose(res, 404, '{"status":"error", "msg":"could not get media content"}'),
      (data, name, mimetype) => {
        this.syslog.info(`full read with connector: ${fileid}`, 'core')
        const compressionMode = req.headers['media-access-compression']
        const content = data
        res.header('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
        if (compressionMode?.toLowerCase() == 'true') {
          gzip(data, (err, buffer) => {
            if (err) {
              res.type('application/octet-stream')
              res.write(content)
            } else {
              res.setHeader('Content-Disposition', `attachment; filename="${name}.gz"`)
              res.type('application/gzip')
              res.write(buffer)
            }
            res.status(200).end()
          })
        } else {
          res.type(mimetype)
          res.write(content)
          res.status(200).end()
        }
      }
    )
  }
}

/**
 * An utility class operating a fast buffering management.
 * @class DownloadService
 */
class DownloadService {
  constructor(chunkSize, fileSize) {
    this.chunkSize = chunkSize
    this.bufferSize = fileSize
    this.filecontent = Buffer.allocUnsafe(this.bufferSize)
    this.startts = new Date().valueOf()
    this.updateTime = 500
    this.realcontentsize = 0
  }
  read(req, update = null) {
    let chunk
    while (null !== (chunk = req.read())) {
      const nsize = this.realcontentsize + chunk.length
      if (nsize > this.bufferSize) {
        if (this.bufferSize > 2 * this.chunkSize) this.chunkSize *= 2
        this.bufferSize += this.chunkSize + chunk.length
        const newfilecontent = Buffer.allocUnsafe(this.bufferSize)
        this.filecontent.copy(newfilecontent)
        this.filecontent = newfilecontent
      }
      chunk.copy(this.filecontent, this.realcontentsize)
      this.realcontentsize += chunk.length
      if (update) {
        const currentts = new Date().valueOf()
        if (currentts - this.startts > this.updateTime) {
          update(this.realcontentsize)
          this.startts = new Date().valueOf()
        }
      }
    }
  }
  finish() {
    this.buffer_length = this.filecontent.length
    this.data = this.filecontent.subarray(0, this.realcontentsize)
    this.filecontent = null
    return this.data
  }
}

/**
 * Recursive function updating a base structure with a given structure
 * @private
 * @param {object} base    - the base structure
 * @param {object} updated - the source of updated data
 */
function updateProperty(base, updated) {
  const newo = {}
  for (const elt in base) {
    if (elt in updated) {
      if (typeof updated[elt] == 'object') newo[elt] = updateProperty(base[elt], updated[elt])
      else if (typeof base[elt] == 'number') newo[elt] = parseInt(updated[elt])
      else {
        try {
          newo[elt] = JSON.parse(updated[elt])
        } catch (err) {
          newo[elt] = updated[elt]
        }
      }
    } else newo[elt] = base[elt]
  }
  return newo
}

/**
 * @param {*} iniFileContent
 * @returns
 */
function parseIniMultiligne(iniFileContent) {
  const multilineContent = iniParse(iniFileContent)
  const content = {}
  let accumulatedKey
  let accumulatedVal
  for (const section of Object.keys(multilineContent)) {
    const sectionParams = multilineContent[section]
    content[section] = {}
    for (const param of Object.keys(sectionParams)) {
      const val = sectionParams[param]
      if (val == '[' || val == '{') {
        accumulatedKey = param
        accumulatedVal = val
      } else if (!accumulatedVal) {
        content[section][param] = val
      } else {
        accumulatedVal += param
        if (param == ']' || param == '}') {
          content[section][accumulatedKey] = accumulatedVal
          accumulatedVal = null
        }
      }
    }
  }
  // console.debug('T content.storage.zones:', content.storage.zones)
  return content
}
/**
 * Fetch ini-file & parse command line arguments
 *
 * @param {object} confDefault  - the default configuration
 * @param {object} confFilename - the defaut init file
 */
function fetchAndParseArguments(confDefault, defaultConfFilename) {
  console.debug('CLI args:', _argv)
  const confFilename = _argv.ini || defaultConfFilename

  let configuration = confDefault
  try {
    const iniFileContent = readFileSync(confFilename, 'utf-8')
    const config = parseIniMultiligne(iniFileContent)
    // console.debug('config:', config)
    configuration = updateProperty(confDefault, config)
    // console.debug('configuration:', configuration)
  } catch (err) {
    console.error('warning: configuration file ignored: ' + err)
  }

  if (_argv.p) {
    const np = parseInt(_argv.p, 10)
    if (!isNaN(np)) configuration.server.port = np
  }
  if (_argv.revision) configuration.logging.revision = _argv.revision.slice(0, 40)

  // Error mgmt.
  if (configuration.server.port < 80) {
    console.log('Incorrect port provided: ' + configuration.server.port)
    process.exit(-1)
  }
  return configuration
}

/**
 * A Signal handler, close in a clean way, with a timeout
 *
 * @class
 * @param {object}  timeout - The closing sequence timeout.
 * @param {object}  service - The service to close.
 */
class SignalCleaner {
  constructor(timeout, service) {
    this.service = service
    this.timeout = timeout
  }
  interruption(signal) {
    const service = this.service
    this.service = null
    if (service) {
      service.close(
        (context, err) => {
          console.error('Error closing session: ' + err)
          process.exit(1)
        },
        (context) => {
          console.debug(`Closing session on signal ${signal}`)
          process.exit(0)
        }
      )
    } else
      setTimeout(() => {
        console.error(`Warning: timeout while closing, terminated on signal ${signal}`)
        process.exit(0)
      }, 1000 * this.timeout)
  }
  arm() {
    process.on('SIGINT', () => this.interruption('SIGINT'))
    process.on('SIGTERM', () => this.interruption('SIGTERM'))
  }
}

/*
 * Main application function, loads configuration and launch service.
 */
const run = () => {
  try {
    const configuration = fetchAndParseArguments(DEFAULT_CONF, './rudi_media_custom.ini')
    console.info(JSON.stringify(configuration, null, 2))
    const service = new HttpService(configuration)
    const sc = new SignalCleaner(configuration.server.close_timeout, service)
    sc.arm()
  } catch (err) {
    console.error('CRITICAL: an error happened during the server launching:', err)
  }
}
run()
