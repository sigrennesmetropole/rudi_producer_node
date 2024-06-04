/**
 * Basic storage Zone descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
import { mkdirSync, readFile, renameSync, rmSync, stat, writeFile } from 'fs'
import { v4 as uuidv4 } from 'uuid'

import { Severity } from '@aqmo.org/rudi_logger'
import { AclDB } from './acl.js' // eslint-disable-line no-unused-vars
import { BasicFileEntry } from './basicfile.js'
import { BasicUrlEntry } from './basicurl.js'

export const WRITE_OPT_APPEND = 'Append'
/**
 * An authorization processing unit.
 */
class ZoneContext {
  /**
   *
   * @param {AclDB} acldb
   * @param {User} user
   * @param {string} ztype
   */
  constructor(acldb, user, ztype) {
    this.acldb = acldb
    this.user = user || { name: '<anonymous>', uuid: -1 }
    this.source = 'zone'
    this.opType = ztype
    this.auth = {
      clientApp: 'media/zone',
      userId: this.user.uuid,
      userName: this.user.name,
      reqIP: '-',
      access: '---',
    }
  }
  validApi = () => true

  errContext(code = 0, cid = '') {
    return {
      auth: this.auth,
      operation: { opType: this.opType, statusCode: code, id: cid },
    }
  }

  process(name, uuid, access, accError) {
    this.auth.userName = name
    this.auth.userId = uuid
    this.auth.access = access
    const [message] = this.acldb.errDesc(accError)
    const sev = accError ? Severity.Warning : Severity.Informational
    this.acldb.log(sev, '[' + this.auth.userName + ']:' + this.opType + ': ' + message, this.errContext(0))
  }

  toJSON = () => ({
    source: this.source,
    ip: this.auth.reqIP,
    user: this.auth.userName,
    access: this.auth.access,
  })

  toString = () => JSON.stringify(this.toJSON())
}

/* eslint-disable no-multi-spaces */
/**
 * Represents a basic zone descriptor.
 * @class
 *
 */
export class BasicZone {
  constructor(acldb, parent, zoneconf) {
    this.acldb = acldb
    this.parent = parent
    this.name = zoneconf.name
    this.csv = zoneconf.csv || '_file.csv'
    this.abspath = zoneconf.abspath || false
    this.db = {}
    if (!zoneconf.path) {
      const basedir = !parent ? '' : typeof parent == 'object' ? parent.dirname() : '' + parent
      this.dirname = basedir + '/' + this.name
    } else this.dirname = zoneconf.path
    this.zoneAcl = acldb.newAcl({
      core: ['admin', 'producer', 'rwx', 'rw-', '---'],
      users: {},
      groups: { auth: 'rwx', admin: 'rwx' },
    })
    this.staging_timeout = zoneconf.staging_time || 5
    this.destroy_timeout = zoneconf.destroy_time || 10
    this.staged_prefix = '.staged_'
    this.staging_db = {}
    this.staging_trash = {}
  }

  init(entrycb, none, done) {
    try {
      mkdirSync(this.dirname, { recursive: true })
    } catch (err) {
      if (none) {
        none(`[${this.name}]: could not create storage dir '${this.dirname}'`)
      }
      return
    }
    // For the time being, the operator is static.
    const aclStatus = this.acldb.findUser('admin')
    if (aclStatus.accError) {
      const errd = this.acldb.errDesc(aclStatus.accError)
      if (none) {
        none(`[${this.name}][rudiprod] user not initialied: ${errd.accessMsg}`)
      }
    }
    this.user = aclStatus.user
    this.loadCSV(entrycb, none, done)
  }

  close(none, done) {
    if (done) done()
  }

  getStorageName = () => this.csv

  _absPath = (path) => (this.dirname == '' ? '' : this.dirname + '/') + path

  /* eslint-disable no-multi-spaces */
  /**
   * Compute the real file path from the file.
   *
   * @private
   * @param {string}    filename,   - The media base filename.
   */
  getPathFromConnector(media, staged = false) {
    let storageName = media.getStorageName()
    if (storageName[0] == '/') return storageName
    else if (storageName[0] == '#') return storageName.slice(1)
    if (staged) {
      storageName = this.staged_prefix + storageName
    }
    return this._absPath(storageName)
  }

  commitPath(media) {
    let storageName = media.getStorageName()
    if (storageName[0] == '/') return storageName
    else if (storageName[0] == '#') return storageName.slice(1)
    const stagedName = this._absPath(this.staged_prefix + storageName)
    storageName = this._absPath(storageName)
    try {
      renameSync(stagedName, storageName)
    } catch (err) {
      console.log('Error: critical failure: could not move ' + stagedName + ' -> ' + storageName)
    }
    return storageName
  }

  commitClear(media) {
    const storageName = media.getStorageName()
    if (storageName[0] == '/' || storageName[0] == '#') return false
    const stagedName = this._absPath(this.staged_prefix + storageName)
    try {
      rmSync(stagedName)
    } catch (err) {
      console.log('Error: critical failure: could not remove ' + stagedName)
    }
    return true
  }

  destroyMedia(media, staged) {
    if (staged) return false
    const storageName = media.getStorageName()
    if (storageName[0] == '/' || storageName[0] == '#') return false
    const path = this._absPath(storageName)
    try {
      rmSync(path)
    } catch (err) {
      console.log('Error: critical failure: could not remove ' + path)
    }
    return true
  }

  stageEntry(entry, process) {
    const suid = uuidv4()
    this.staging_db[suid] = { suid, entry, date: new Date(), process }
    setTimeout(() => {
      if (!this.staging_db?.[suid]) return // Commited
      const staged = this.staging_db[suid]
      delete this.staging_db[suid]
      this.staging_trash[suid] = staged
      staged.entry.clear(staged)
      setTimeout(() => {
        const staged = this.staging_trash[suid]
        delete this.staging_trash[suid]
        staged.entry.destroy(staged)
      }, this.staging_timeout * 1000)
    }, this.destroy_timeout * 1000)
    return suid
  }

  commitEntry(aclStatus, suid, none, done) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, 'zone_commit')
    aclStatus.setContext(ctx)
    aclStatus.setAcl(this.zoneAcl)
    if (aclStatus.refused('--x')) {
      none('Access denied', 401)
      return
    }

    if (!this.staging_db?.[suid])
      none(`could not commit file: ${this.staging_trash?.[suid] ? 'time exceeded' : 'entry not found'}.`, 400)
    else {
      const stg = this.staging_db[suid]
      delete this.staging_db[suid]
      this.db[suid] = stg.entry
      stg.entry.commit(stg)
      this.saveZoneCSV(none, (path) => done(stg))
    }
  }

  deleteEntry(aclStatus, uuid, none, done) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, 'zone_delete')
    aclStatus.setContext(ctx)
    aclStatus.setAcl(this.zoneAcl)
    if (aclStatus.refused('-wx')) {
      none('Access denied', 401)
      return
    }

    if (!this.db?.[uuid]) {
      none('could not delete file: entry not found.', 404)
    } else {
      const entry = this.db[uuid]
      delete this.db[uuid]
      entry.destroy()
      this.saveZoneCSV(none, (path) => {
        done(entry)
      })
    }
  }

  listMedias(aclStatus) {
    const ctx = new ZoneContext(this.acldb, aclStatus.user, 'zone_list')
    aclStatus.setContext(ctx)
    aclStatus.setAcl(this.zoneAcl)
    if (aclStatus.refused('r--')) throw Error('Access denied')

    const content = []
    for (const ei of Object.keys(this.db)) {
      const entry = this.db[ei]
      content.push(entry.toJSON())
    }
    return content
  }

  newBasicEntryFromMetadata(metadata, filecontent, aclStatus, mediaAccessMethod, none, step, done) {
    try {
      if (!metadata) {
        if (none) none('Missing metadata')
        return
      }
      if (!metadata.media_type) {
        if (none) none('Missing media type')
        return
      }

      /**
       * If mediaAccessMethod == 'Append'
       *    - we don't need a commit, so we don't need a '--x' validation
       *    - writing on file is done with 'a' option instead of 'w'
       */
      let needValidation = false
      if (!aclStatus.user) none('Authentication required', 401)
      const ctx = new ZoneContext(this.acldb, aclStatus.user, 'zone_add')
      aclStatus.setContext(ctx)
      aclStatus.setAcl(this.zoneAcl)
      if (aclStatus.refused('-w-')) none('Access denied', 401)
      const isAppend = mediaAccessMethod == WRITE_OPT_APPEND
      if (!isAppend) {
        ctx.opType = 'zone_commit'
        if (aclStatus.refused('--x')) needValidation = true
      }
      const recordEntry = (entry, none, done) => {
        this.db[entry.uuid] = entry
        this.saveZoneCSV(none, (path) => {
          step('saved: ' + path)
          done(entry)
        })
      }

      const recordOrStageEntry = (entry) => {
        if (!needValidation) {
          recordEntry(entry, none, done)
        } else {
          const suid = this.stageEntry(entry, step)
          done(entry, suid)
        }
      }

      if (metadata.media_type == 'FILE') {
        const entry = new BasicFileEntry(metadata, filecontent, this, aclStatus)
        if (this.abspath) entry.abspath = true
        const path = this.getPathFromConnector(entry, needValidation)
        const flag = isAppend ? 'a' : 'w'
        writeFile(path, filecontent, { flag }, (err, data) => {
          // TODO: HERE
          if (err) none(`could not write file: ${path}`, 500)
          recordOrStageEntry(entry)
        })
      } else if (metadata.media_type == 'INDIRECT') {
        if (!metadata.url) {
          none('Missing media URL', 400)
          return
        }
        const entry = new BasicUrlEntry(metadata, this, aclStatus)
        this.recordOrStageEntry(entry)
      } else none(`Unsupported Media Type: ${metadata.media_type}`, 400)
    } catch (err) {
      none(`invalid meta-data: ${err}; value: ${JSON.stringify(metadata)}`, 400)
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
  newBasicEntryFromCsv(descline, aclStatus) {
    let entry = null
    try {
      let [urlmd5, uuid, filetype, encoding, date, sizedate] = descline.split(';')
      let [filename, mimetype] = filetype.split(':')
      if (sizedate === undefined) throw Error('Could not parse ' + descline)
      date = new Date(parseInt(date) * 1000)

      aclStatus.setAcl(this.zoneAcl)
      aclStatus.context.opType = 'zone_add'
      if (aclStatus.refused('-w-')) throw Error('Access denied')
      aclStatus.context.opType = 'zone_commit'
      // if (aclStatus.refused('-wx')) needValidation = true;
      // TODO: read ACL from filesystem
      mimetype = mimetype.trim()
      if (mimetype == 'text/uri-list') {
        const url = urlmd5
        const expire = new Date(parseInt(sizedate) * 1000)
        entry = new BasicUrlEntry(null, this, aclStatus, filename, uuid, url, date, expire)
      } else {
        const md5 = urlmd5
        encoding = encoding.trim()
        const size = parseInt(sizedate)
        entry = new BasicFileEntry(null, null, this, aclStatus, filename, uuid, mimetype, encoding, size, md5, date)
        if (this.abspath) entry.abspath = true
      }
      this.db[entry.uuid] = entry
    } catch (err) {
      throw Error('invalid meta-data: ' + err + ' value: ' + descline)
    }
    return entry
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
  loadCSV(entrycb, none, done) {
    const path = this.getPathFromConnector(this)
    const aclStatus = this.acldb.newUserAclStatus(this.user)
    aclStatus.setContext(new ZoneContext(this.acldb, this.user, 'csv_import'))
    stat(path, (err, stats) => {
      if (err) return
      readFile(path, { encoding: 'utf8', flag: 'r' }, (err, data) => {
        if (err) {
          if (none) none(Error('could not open CSV file: ' + path))
          return
        }
        // const context = { source:'CSV', filename:path, user:'<admin>', access:'rwx' };
        const entries = data.split('\n')
        for (const line of entries) {
          if (!line || line == '') continue
          const entry = this.newBasicEntryFromCsv(line, aclStatus)
          if (entrycb) entrycb(aclStatus, this, entry)
        }
        if (done) done()
      })
    })
  }
  /* eslint-disable guard-for-in */
  /**
   * Save in a CSV all the media registered for the zone.
   *
   * @param {string}   zone    - The zone name
   * @param {string}   csvFile - The filename of the CSV file. The format must be parsable by {BasicFileEntry} entries.
   */
  saveZoneCSV(none, done) {
    const path = this.getPathFromConnector(this)
    let content = ''
    for (const ei in this.db) {
      const entry = this.db[ei]
      content += entry.getCSVline() + '\n'
    }

    if (content != '') {
      writeFile(path, content, { encoding: 'utf8', flag: 'w' }, (err, data) => {
        if (err) none(Error(`Could not save DB file ${this.path} for zone ${this.name}: ${err}`))
        else done(path)
      })
    }
  }
}
