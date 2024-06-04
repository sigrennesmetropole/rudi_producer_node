/**
 * Mongo DB interface.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
import { RudiLogger } from '@aqmo.org/rudi_logger' // eslint-disable-line no-unused-vars
import { MongoClient } from 'mongodb'

/**
 * Basic interface for the storage of LOG events MongoDB.
 */
export class MongoService {
  /**
   * @param {Json} config the DB configuration with the MongoDB URL and its name.
   * @param {object} schemaSet the schemas DB
   * @param {string} mediaSchema the name of the media schema
   * @param {string} urlSchema  the name of the url schema
   * @param {string} eventSchema the name of the event schema
   * @param {RudiLogger} syslog RUDI syslog
   */
  constructor(config, schemaSet, mediaSchema, urlSchema, eventSchema, syslog) {
    this.disabled = !!config?.disabled
    this.mongoClient = MongoClient
    this.schemaSet = schemaSet
    this.mediaSchema = mediaSchema
    this.urlSchema = urlSchema
    this.eventSchema = eventSchema
    this.syslog = syslog

    this.mongoServerURL = config.db_url || 'mongodb://localhost:27017/'
    this.dbname = config.db_name || 'rudi_media'
    this.mongoOptions = config.db_options || {}
    this.mediaCollName = 'media'
    this.urlCollName = 'url'
    this.eventCollName = 'media_events'

    this.mongodb = null
    this.db = null
    this.mediaColl = null
    this.urlColl = null
    this.eventColl = null
    this.currentError = null

    // console.debug('T [MongoService] mongoServerURL:', this.mongoServerURL)
  }
  /* eslint-disable no-multi-spaces, indent */
  /**
   * Open the Mongo DB using the class level parameters
   * A first collection is create for medias, and a second one for events.
   *
   * Has race conditions (#RC). In case njs starts to get (//) one day.
   *
   * @param {function}   errcb     - the error callback
   * @param {function}   done      - the success callback
   */
  async open() {
    if (typeof this.mongoOptions == 'string') {
      const so = this.mongoOptions
      this.mongoOptions = {}
      this.mongoOptions = JSON.parse(so)
    }

    if (this.disabled) {
      this.syslog.warning('[MongoService.open] Connexion disabled')
      throw new Error('Connexion disabled')
    }

    try {
      this.mongodb = await this.mongoClient.connect(this.mongoServerURL, this.mongoOptions)
      this.syslog.debug('[MongoService] DB connected:', this.mongodb.s?.url)

      this.db = this.mongodb.db(this.dbname)

      const colList = await this.db.listCollections().toArray()

      let hasMedia = false,
        hasUrl = false,
        hasEvents = false
      for (const c of colList) {
        hasMedia |= c.name == this.mediaCollName
        hasUrl |= c.name == this.urlCollName
        hasEvents |= c.name == this.eventCollName
      }
      ;[this.mediaColl, this.urlColl, this.eventColl] = await Promise.all([
        this.initCollection(this.mediaCollName, this.mediaSchema, hasMedia),
        this.initCollection(this.urlCollName, this.urlSchema, hasUrl),
        this.initCollection(this.eventCollName, this.eventSchema, hasEvents),
      ])
    } catch (err) {
      this.syslog.error(`[MongoClient.connect] DB connection failed: ${err}`)
      this.currentError = err
      throw err
    }
  }

  async initCollection(collName, colSchema, shouldDrop) {
    try {
      if (shouldDrop) await this.db.collection(collName).drop()

      const coll = await this.db.createCollection(collName)
      await coll.createIndex({ uuid: 1 })
      await coll.createIndex({ zone: 1, uuid: 1 })
      await this.db.command({
        collMod: collName,
        validator: { $jsonSchema: this.schemaSet.toBson(colSchema) },
        validationLevel: 'strict',
        validationAction: 'error',
      })
      this.syslog.debug(`Collection initialized: ${collName}`)
      return coll
    } catch (err) {
      this.syslog.error(`Initialization failed for collection '${collName}'`)
      throw err
    }
  }

  /**
   * Add a new media
   * The media must be an already initialized @BasicFileEntry object.
   *
   * @param {BasicFileEntry}   media   - a fileEntry object.
   * @param {function}         err     - the error callback
   * @param {function}         done    - the success callback
   */
  async addMedia(media, err, done = () => {}) {
    if (!this.mediaColl || !this.eventColl) {
      err('[addMedia] Collections not initialized')
      return
    }
    const errFct = (reason) => {
      if (err) err('Media insertion error: ' + reason, this)
      else this.syslog.error(`[addMedia] ${reason}`)
    }
    if (!media?.uuid || !media?.zone) {
      errFct('Malformed media descriptor')
      return
    }
    try {
      if (media?.url) {
        const emedia = await this.urlColl.findOne({ uuid: media.uuid })
        if (!emedia) done(await this.urlColl.insertOne(media))
        else done(await this.urlColl.updateOne({ uuid: media.uuid }, { $set: media }))
      } else {
        const emedia = await this.mediaColl.findOne({ uuid: media.uuid })
        if (!emedia) done(await this.mediaColl.insertOne(media))
        else done(await this.mediaColl.updateOne({ uuid: media.uuid }, { $set: media }))
      }
    } catch (err) {
      errFct(err)
    }
  }
  /**
   * Add a new event
   * The event must reference an object.
   *
   * @param {BasicFileEntry}   opdesc  - an operation description.
   * @param {function}         err     - the error callback
   * @param {function}         done    - the success callback
   * @param {function}         update  - update fields, by defaulf off
   */
  async addEvent(opdesc, err, done, update) {
    if (!this.mediaColl || !this.eventColl) {
      err('[addEvent] Collections not initialized')
      return
    }
    const errFct = (reason) => {
      if (err) err('Media event error: ' + reason, this)
    }
    const doneFct = (_) => {
      if (done) done(this)
    }

    if (!opdesc?.uuid || !opdesc?.zone) {
      errFct('Malformed operation descriptor')
      return
    }

    try {
      if (update !== undefined) {
        const emedia = await this.eventColl.findOne({ uuid: opdesc.uuid })
        if (!emedia) doneFct(await this.eventColl.insertOne(opdesc))
        else doneFct(await this.eventColl.updateOne({ uuid: opdesc.uuid }, { $set: opdesc }))
      } else {
        doneFct(await this.eventColl.insertOne(opdesc))
      }
    } catch (err) {
      errFct(err)
    }
  }
  /* eslint-enable no-multi-spaces, indent */
  /**
   * Close the DB interface
   *
   * @param {function}   errcb    - the error callback
   */
  async close(errcb, done) {
    if (!this.db) {
      if (errcb) errcb(this, 'DB not initialized')
      return
    }
    await this.mongodb.close()
    if (done) done(this)
  }
}
