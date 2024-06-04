/**
 * Basic Media database
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
import { BasicZone } from './basiczone.js'
import './cycle.js' // For Json Unparsing

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
export class BasicFileDB {
  constructor(mediaDir, acldb, logger, mongodb, timeout) {
    this.mediaDir = mediaDir
    this.acldb = acldb
    this.syslog = logger
    this.logid = 'db'
    this.connectorTimeout = timeout
    this.mongodb = mongodb

    this.zone_db = {}
    this.storageId = {}
    this.db = {}

    this.default_zone = 'zone1'
  }
  /**
   * Generate a Json Schema for an *event* with the proper registering URL.
   *
   * @param {string}     contextRef - The name of the context schema.
   * @returns {string}              - The name Json schema.
   */
  static eventSchema(contextRef) {
    return {
      title: 'The RUDI media DB event Schema',
      description: 'The descriptor of an event associated to a RUDI media DB access.',
      type: 'object',
      properties: {
        operation: {
          description: 'The operation done',
          type: 'string',
          enum: ['add_media', 'stage_media', 'commit_media', 'check_entry', 'new_conn', 'del_conn', 'acc_conn'],
        },
        uuid: {
          description: 'The open storage access uuid',
          type: 'string',
          format: 'uuid',
        },
        ref: {
          description: 'The media-id',
          type: 'string',
          format: 'uuid',
        },
        zone: {
          description: 'The storage zone',
          type: 'string',
        },
        value: {
          description: 'The object manipulated by the operation',
          type: 'object',
        },
        context: { description: 'The creaction context', $ref: contextRef },
      },
      required: ['operation', 'uuid', 'ref'],
    }
  }
  /* eslint-disable no-multi-spaces */
  /**
   * Generate a logger context.
   *
   * @param {object}    data - The error message.
   */
  convertContext(opname, cid, aclStatus) {
    const context = aclStatus?.context
    const auth = context?.auth ? { ...context.auth } : { userId: -1, userName: '-', reqIP: '-', access: '---' }
    const source = context?.source !== undefined ? `${opname}:${context.source}` : opname
    const id = cid !== undefined ? cid : '-'
    auth.clientApp = 'media/db'
    return { auth: auth, operation: { opType: source, statusCode: 200, id: id } }
  }
  /**
   * Interface the error logger
   *
   * @param {string}    message - The error message.
   */
  error = (message, context = null) => this.syslog.error(message, this.logid, context)
  warn = (message, context = null) => this.syslog.warn(message, this.logid, context)
  info = (message, context = null) => this.syslog.info(message, this.logid, context)
  notice = (message, context = null) => this.syslog.notice(message, this.logid, context)
  debug = (message, context = null) => this.syslog.debug(message, this.logid, context)

  /**
   * Interface the error logger with contexts.
   *
   * @param {string}    message - The error message.
   * @param {string}    context - The context.
   */
  errorCtx = (message, name, cid, aclStatus) =>
    this.syslog.error(message, this.logid, this.convertContext(name, cid, aclStatus))

  /* eslint-disable no-multi-spaces */
  /**
   * Interface the data info logger in order to describe data sets.
   *
   * @param {object}    data - The error message.
   */
  logReq(aclStatus, data) {
    let header = `do=${data.operation} zone=${data.zone} uuid=${data.uuid}`
    if (data.uuid != data.ref) header += ` ref=${data.ref}`
    let extra = ''
    let context
    if (
      data.operation === 'add_media' ||
      data.operation === 'stage_media' ||
      data.operation === 'commit_media' ||
      data.operation === 'list_media' ||
      data.operation === 'delete_media'
    ) {
      if (data.value?.url) extra = ` url=${data.value.url}`
      else extra = ` file=${data.value.filename}`
      context = this.convertContext(data.operation, data.uuid, aclStatus)
    } else if (data.operation === 'check_entry' || data.operation === 'new_conn' || data.operation === 'del_conn') {
      context = this.convertContext(data.operation, data.uuid, aclStatus)
    } else if (data.operation === 'acc_conn') {
      context = this.convertContext(data.operation, data.uuid, aclStatus)
    }
    this.syslog.info(header + extra, this.logid, context, data.operation, data)
  }
  /**
   * Initialize the file database with existing zones.
   *
   * @param {list}      media_files - The list of files/zones to load.
   * @param {function=} none        - An callback with the error if problems while closing.
   * @param {function=} done        - An callback with the entry when done.
   */
  init(zones, withmongo, none, done) {
    if (!withmongo) this.mongodb = null

    let defzone = null
    if (typeof zones == 'string') zones = [zones]
    for (const zoneDesc of zones) {
      const zoneDescObj = typeof zoneDesc == 'string' ? { name: zoneDesc } : zoneDesc
      const nzone = new BasicZone(this.acldb, this.mediaDir, zoneDescObj)
      this.debug(`[${nzone.name}]: csv=${nzone.csv} dir=${nzone.dirname}`)
      this.zone_db[nzone.name] = nzone
      if (!defzone) defzone = nzone.name
    }
    if (defzone) this.default_zone = defzone
    else {
      const zoneConf = { name: this.default_zone, csv: this.default_csvFile }
      this.zone_db[this.default_zone] = new BasicZone(this.acldb, this.mediaDir, zoneConf)
    }

    // Initialize all zones.
    const entrycb = (aclStatus, zone, entry) => this.recordEntry(aclStatus, zone, entry)

    const pl = []
    for (const zi of Object.keys(this.zone_db)) {
      const zoneI = this.zone_db[zi]
      pl.push(new Promise((resolve, reject) => zoneI.init(entrycb, reject, resolve)))
    }

    Promise.all(pl).then(null, (err) => {
      console.error('Could not open Zone:', err)
      this.syslog.error(`Could not open Zone: ${err}`)
    })
  }
  /**
   * Close the file database, and flush all pending events.
   *
   * @param {function=} none        - An callback with the error if problems while closing.
   * @param {function=} done        - An callback with the entry when done.
   */
  close(none, done) {
    const errFct = (err) => {
      this.error('Could not close DB: ' + err)
      if (none) none('Could not close file database: ' + err)
    }

    const closeAllZones = (none, done) => {
      const pl = []
      for (const zi of Object.keys(this.zone_db)) {
        const zone = this.zone_db[zi]
        pl.push(
          new Promise((resolve, reject) => {
            this.warn('Close zone ' + zone.name)
            zone.close(reject, resolve)
          })
        )
      }
      return Promise.all(pl).then(
        () => {
          this.warn('All zone closed')
          if (done) done()
        },
        (err) => {
          this.error('Could not close all zones: ' + err)
          if (none) none('Could not close all zones: ' + err)
        }
      )
    }

    const sId = Object.keys(this.storageId)
    if (sId.length > 0) {
      const pl = []
      for (const fileid of sId) {
        pl.push(
          new Promise((resolve, reject) => this.deleleteFileId(fileid, { source: 'interruption' }, reject, resolve))
        )
      }
      Promise.all(pl).then(closeAllZones, errFct)
    } else closeAllZones(none, done)
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
  recordEntry(aclStatus, zone, entry, none, done) {
    try {
      const opdesc = {
        operation: 'add_media',
        uuid: entry.uuid,
        ref: entry.uuid,
        zone: zone.name,
        context: aclStatus.context.toJSON(),
        value: entry.toJSON(),
      }
      const doneFct = (entry) => {
        this.db[entry.uuid] = entry
        this.logReq(aclStatus, opdesc)
        if (done) done(opdesc)
      }
      const errFct = (err, desc = opdesc) => {
        this.warn(`Could not update DB (init add): ${err}; with ${JSON.safeStringify(desc)}`)
        doneFct(entry) // We stand at a warning level for Mongo up to now.
      }
      if (this.mongodb)
        this.mongodb.addMedia(entry.toJSON(), errFct, () => this.mongodb.addEvent(opdesc, errFct, () => doneFct(entry)))
      else doneFct(entry)
    } catch (err) {
      this.errorCtx(`Invalid media entry: ${err} entry: ${JSON.stringify(entry.toJSON())}`, 'add_media', '-', aclStatus)
      if (none) none(err)
    }
  }
  /**
   * Add a new basic media entry.
   *
   * @param {json}      metadata,     - The meta-data dictionary
   * @param {*}         aclStatus
   * @param {buffer}    filecontent   - The raw file content
   * @param {function=} none          - An optional callback with the error if meta-data are malformed
   * @param {function=} done          - An optional callback with the entry when done.
   * @param {Boolean}   shouldAppend  - true if the file content should be appened to the existing file
   */
  addEntry(metadata, aclStatus, filecontent, mediaAccessMethod, none, done) {
    if (!metadata) {
      this.errorCtx('Missing metadata', 'add_media', '-', aclStatus)
      if (none) none('Missing metadata', 400)
    }
    if (!metadata.media_type) {
      this.errorCtx(`(ignored) Missing media type: ${JSON.safeStringify(metadata)}`, 'add_media', '-', aclStatus)
      metadata.media_type = 'FILE'
    }
    if (!metadata.media_id) {
      this.errorCtx(`Missing media UUID: ${JSON.safeStringify(metadata)}`, 'add_media', '-', aclStatus)
      if (none) none('Missing media UUID', 400)
      return
    }
    if (!metadata.access_date) metadata.access_date = new Date()
    else {
      metadata.access_date = parseInt(metadata.access_date) * 1000
      metadata.access_date = new Date(metadata.access_date)
    }
    if (metadata.file_size && filecontent.length != metadata.file_size)
      this.errorCtx(
        `(ignored) inconsistent provided file size: ${metadata.file_size} received: ${filecontent.length}`,
        'add_media',
        metadata.media_id,
        aclStatus
      )
    if (Object.keys(this.zone_db).length == 0) {
      this.errorCtx('DB not ready for adding', 'add_media', metadata.media_id, aclStatus)
      if (none) none(`DB not ready for adding`, 400)
      return
    }

    const zone = this.zone_db[this.default_zone]
    const errFct = (err, code) => {
      this.errorCtx(`could not add entry: ${err}`, 'add_media', metadata.media_id, aclStatus)
      if (none) none(err, code)
    }

    const addStepEntry = (message) => this.notice(`[add_media]:${message}`)

    const addDone = (entry, commitId = null) => {
      this.notice(`new file: name=${entry.uuid} size=${entry.size} (${filecontent.length}) hash=${entry.md5}`)
      let logType = 'stage_media'
      if (!commitId) {
        logType = 'add_media'
        this.db[entry.uuid] = entry
      }
      const zname = zone.name
      this.logEntry(zone, logType, aclStatus, entry, none, () => {
        if (done) done(zname, commitId)
      })
    }

    zone.newBasicEntryFromMetadata(metadata, filecontent, aclStatus, mediaAccessMethod, errFct, addStepEntry, addDone)
  }
  commit(zoneName, commitId, aclStatus, none, done) {
    if (Object.keys(this.zone_db).length <= 0) {
      this.errorCtx('DB not ready for committing', 'commit_media', zoneName, aclStatus)
      if (none) none(`DB not ready for committing`, 400)
      return
    }

    if (!this.zone_db?.[zoneName]) {
      this.errorCtx(`Zone '${zoneName}' not found`, 'commit_media', zoneName, aclStatus)
      if (none) none(`Zone '${zoneName}' not found`, 404)
      return
    }
    const zone = this.zone_db[zoneName]

    const commitDone = (staging) => {
      const entry = staging.entry
      this.notice('commit file: name=' + entry.uuid)
      this.db[entry.uuid] = entry
      this.logEntry(zone, 'commit_media', aclStatus, entry, none, done)
    }

    zone.commitEntry(
      aclStatus,
      commitId,
      (err, code) => {
        this.errorCtx(err, 'commit_media', zoneName, aclStatus)
        if (none) none(err, code)
      },
      commitDone
    )
  }
  mdelete(uuid, aclStatus, none, done) {
    if (!this.db?.[uuid]) {
      const errstr = `media ${uuid} not found`
      this.errorCtx(errstr, 'delete_media', uuid, aclStatus)
      if (none) none(errstr, 404)
      return
    }
    const entry = this.db[uuid]
    const zone = entry.zone
    const deleteDone = (entry) => {
      delete this.db[entry.uuid]
      this.notice(`delete file: name=${entry.uuid}`)
      this.logEntry(zone, 'delete_media', aclStatus, entry, none, done)
    }

    zone.deleteEntry(
      aclStatus,
      uuid,
      (err, code) => {
        this.errorCtx(err, 'delete_media', uuid, aclStatus)
        if (none) none(err, code)
      },
      deleteDone
    )
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
  logEntry(zone, type, aclStatus, entry, none, done) {
    try {
      const context = aclStatus.context
      const opdesc = {
        operation: type,
        uuid: entry.uuid,
        ref: entry.uuid,
        zone: zone.name,
        context: context.toJSON(),
        value: entry.toJSON(),
      }
      const doneFct = (entry) => {
        this.logReq(aclStatus, opdesc)
        if (done) done()
      }
      const errFct = (err) => {
        this.warn(`Could not update DB (add): ${err} with ${JSON.safeStringify(opdesc)}`)
        doneFct(entry) // We stand at a warning level for Mongo up to now.
      }
      if (this.mongodb)
        this.mongodb.addMedia(entry.toJSON(), errFct, (mongodb) =>
          this.mongodb.addEvent(opdesc, errFct, (mongodb) => doneFct(entry))
        )
      else doneFct(entry)
    } catch (err) {
      this.errorCtx(`Invalid media entry: ${err}; entry: ${entry.getCSVline()}`, 'add_media', '-', aclStatus)
      if (none) none(err)
    }
  }
  list(aclStatus) {
    const mediaList = {}
    let count = 0,
      total = 0,
      errors = 0
    for (const zoneName of Object.keys(this.zone_db)) {
      const zone = this.zone_db[zoneName]
      try {
        count += 1
        const content = zone.listMedias(aclStatus)
        this.notice('list medias: count=' + Object.keys(content).length)
        this.debug('list medias: name=' + JSON.safeStringify(content))
        mediaList[zoneName] = {
          list: content,
          status: 'OK',
        }
        total += content.length
      } catch (err) {
        errors += 1
        this.errorCtx(err.toString(), 'list_media', zoneName, aclStatus)
        mediaList[zoneName] = {
          list: [],
          status: err.toString(),
        }
      }
    }
    mediaList['count'] = count
    mediaList['total'] = total
    mediaList['errors'] = errors
    return mediaList
  }
  /* eslint-enable guard-for-in */
  /**
   * Require an access to a media, and returns a connector ID if the access is granted.
   * This function creates a unique connector, and a timer to remove it on time.
   *
   * @param   {string}   uuid  - The media UUID.
   * @returns {string}         - A unique connector ID.
   */
  get(uuid, aclStatus) {
    if (!this.db?.[uuid]) return null
    const media = this.db[uuid]
    try {
      const niddesc = media.generateFileId()
      let connectorTimeout = this.connectorTimeout
      if (niddesc?.timeout) {
        connectorTimeout = niddesc.timeout
      }
      this.storageId[niddesc.fileid] = niddesc
      const opdesc = {
        operation: 'new_conn',
        uuid: niddesc.fileid,
        ref: uuid,
        zone: niddesc.zone,
        context: aclStatus.context.toJSON(),
      }
      this.logReq(aclStatus, opdesc)

      const errFct = (err, desc = opdesc) =>
        this.error(`Could not update DB (new): ${err} with ${JSON.safeStringify(desc)}`)

      if (this.mongodb) this.mongodb.addEvent(opdesc, errFct, (mongodb) => {})

      setTimeout(() => this.deleleteFileId(niddesc.fileid, aclStatus, errFct, () => {}), connectorTimeout * 1000)
      return niddesc.fileid
    } catch (err) {
      const e = `Could not process media with ${uuid} ${aclStatus.context}`
      this.error(`${e}: ${err}`)
      if (none) none(e)
      return null
    }
  }
  /**
   * Delete a storage connector.
   *
   * @private
   * @param   {string}   fileid  - The file UUID.
   */
  deleleteFileId(fileid, aclStatus, none, done) {
    if (this.storageId?.[fileid]) {
      const niddesc = this.storageId[fileid]
      delete this.storageId[fileid]
      const opdesc = {
        operation: 'del_conn',
        uuid: niddesc.fileid,
        ref: niddesc.ref,
        zone: niddesc.zone,
        context: aclStatus.context.toJSON(),
        value: niddesc,
      }
      this.logReq(aclStatus, opdesc)
      if (this.mongodb) {
        this.mongodb.addEvent(opdesc, (err) => none(err, opdesc), done)
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
  find(fileid, aclStatus, none, done) {
    if (!this.storageId?.[fileid]) {
      const errmsg = 'media connector id "' + fileid + '" not found'
      this.errorCtx(errmsg, 'get_media', fileid, aclStatus)
      if (none) none(errmsg, 404)
      return
    }
    const now = new Date()
    const iddesc = this.storageId[fileid]
    const accessEntry = { date: now, client: aclStatus.context.toJSON() }
    const opdesc = {
      operation: 'acc_conn',
      uuid: iddesc.fileid,
      ref: iddesc.ref,
      zone: iddesc.zone,
      context: accessEntry,
    }
    this.logReq(aclStatus, opdesc)
    const errFct = (err) => this.error(`Could not update DB (get): ${err} with ${JSON.safeStringify(opdesc)}`)

    if (this.mongodb) this.mongodb.addEvent(opdesc, errFct, () => {})

    iddesc.count += 1
    iddesc.access.push(accessEntry)

    // Load the data asynchronously
    const media = this.db[iddesc.ref]
    media.getFile(
      iddesc,
      (err, code) => {
        this.errorCtx(`could not load file: ${err}`, 'get_media', fileid, aclStatus)
        if (none) none(err, code)
      },
      done
    )
  }
  /**
   * Require check the real content of a media, and returns its updated MD5 value.
   *
   * @param  {string}   uuid  - The media UUID.
   * @return {string}         - The MD5 value.
   */
  check(uuid, aclStatus, none, done) {
    if (!this.db?.[uuid]) return none('media uuid not found', 404)
    const media = this.db[uuid]
    try {
      const opdesc = {
        operation: 'check_entry',
        uuid: '-',
        ref: media.uuid,
        zone: media.zone.name,
        context: aclStatus.context.toJSON(),
      }
      this.logReq(aclStatus, opdesc)
      media.getRealMd5(none, done)

      const errFct = (err) => this.error(`Could not update DB (check): ${err} with ${JSON.safeStringify(opdesc)}`)

      if (this.mongodb) this.mongodb.addEvent(opdesc, errFct, () => {})

      return media.md5
    } catch (err) {
      const e = `Could not process media: with ${uuid} ${aclStatus.context}`
      this.error(`${e}: ${err}`)
      if (none) none(e, 500)
      return null
    }
  }
}
