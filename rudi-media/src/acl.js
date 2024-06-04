/**
 * ACL for HTTP access management.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */

import {
  forgeToken,
  getJwtRegex,
  readPrivateKeyFile,
  readPublicKeyFile,
  tokenStringToJwtObject,
  verifyToken,
} from '@aqmo.org/jwt-lib'
import { createHash } from 'crypto'
import { version as getVersion, parse, v4, v5, validate } from 'uuid'
import './cycle.js' // For Json Unparsing

const G_ADMIN_UID = 4
const G_USER_START_UID = 1000

/**
 * @function UUID/ID Extraction. Throw an exception.
 */
function idFromStr(name, idstr) {
  let id = -1,
    uid = -1
  let idt = typeof idstr
  if (idt == 'string') {
    const pid = parseInt(idstr)
    if (!isNaN(pid)) {
      idstr = pid
      idt = 'number'
    }
  }
  if (idt == 'string') {
    if (!validate(idstr)) throw Error(`Invalid uuid for ${name}`)
    const version = getVersion(idstr)
    const idbytes = parse(idstr)
    uid = idstr
    if (version == 4) {
      id = G_USER_START_UID + (idbytes[10] << 8) + idbytes[11]
    } else if (version == 5) throw Error(`Cannot revert uid from uuid-v5`)
    else throw Error(`Invalid uuid version for ${name}`)
  } else if (idt == 'number') {
    id = idstr
    if (isNaN(id) || id < 100 || (id >= 200 && id < G_USER_START_UID))
      if (id != G_ADMIN_UID || name != 'admin') throw Error(`Invalid id for ${name}: not in valid range`)
    uid = v5(id.toString() + '.media.rudi.aqmo.org', v5.URL)
  } else throw Error(`Invalid id type for ${name}: ${idt}`)
  return [id, uid]
}

/**
 * @class
 */
export class Group {
  constructor(name, goupId) {
    this.name = name
    ;[this.id, this.uuid] = idFromStr(name, goupId)
  }
}

/**
 * @class
 */
export class User {
  constructor(acldb, name, userDesc) {
    this.name = name
    this.acldb = acldb
    if (userDesc.length != 4) throw Error(`Incorrect number of elements in user description ("${name}")`)
    if (typeof userDesc[1] != 'string') throw Error(`Invalid password type for ${name}`)
    if (typeof userDesc[2] != 'object') throw Error(`Invalid group list for ${name}`)
    if (typeof userDesc[3] != 'string') throw Error(`Invalid key file type for ${name}`)
    ;[this.id, this.uuid] = idFromStr(name, userDesc[0])
    this.password = userDesc[1]
    this.groups = []
    for (const g of userDesc[2]) {
      const group = acldb.findGroup(g)
      if (!group) throw Error(`Invalid group "${g}" while initializing ${name}`)
      this.groups.push(group)
    }
    this.privkey = null
    this.keys = []
    const keyfile = userDesc[3]
    if (keyfile && keyfile != '') {
      try {
        this.privkey = readPrivateKeyFile(keyfile)
        this.acldb.debug(`Private key setup for '${this.name}' from '${keyfile}'`)
      } catch (err) {}
      let pubkey
      try {
        pubkey = readPublicKeyFile(keyfile)
        this.acldb.debug(`Public key setup for '${this.name}' from '${keyfile}'`)
      } catch (err) {
        this.acldb.warn(`Couldn't read public key '${keyfile}'`)
      }
      if (pubkey) this.keys.push(pubkey)
    }
  }
  validGroup(gname) {
    const group = gname == undefined || gname == null || gname == '-' ? this.groups[0] : this.acldb.findGroup(gname)

    if (!group || this.groups.indexOf(group) == -1) throw Error(`Invalid group "${gname}" for ${this.name}`)
    return group
  }

  accessMask(acl, group) {
    const access = acl.access(this, group)
    return access
  }

  forgeDelegatedUserJwt(duser, dgroup, attributes, duration = 300) {
    if (!this.privkey) throw Error(`No private key defined for "${this.name}"`)
    if (attributes === undefined || !attributes) attributes = {}
    const jti = v4()
    const xattr = { name: duser.name, uuid: duser.uuid, group: dgroup.name, ...attributes }
    const token = forgeToken(
      this.privkey,
      { typ: 'jwt' },
      {
        jti: jti,
        client_id: this.name,
        sub: 'delegate',
        user_id: duser.id,
        group_id: dgroup.id,
        xattr: xattr,
      },
      duration
    )
    this.acldb.notice(`Access token forged by ${this.name}: ${duser.name}:${dgroup.name}`)
    // this.acldb.debug(`Access token forged: ${token} [${JSON.stringify(xattr)}]`);
    return token
  }
  /**
   * Perform a password hash.
   *
   * @param {object}   p      - the reference password
   * @param {string}   input  - the given password
   * @returns {string}        - passwords matches
   */
  checkPassword(input) {
    let p = this.password
    if (p == '' || p == '-') return false
    if (p.length > 8 && p.startsWith('$') && p[2] == '$' && p.endsWith('$')) {
      const pt = p[1]
      p = p.slice(3, p.length - 1)
      if (p[8] == '$') {
        const salt = p.slice(0, 8)
        p = p.slice(9, p.length)
        input = input + salt + input
      }
      let hash = null
      /* eslint-disable no-multi-spaces */
      if (pt == '1') hash = createHash('md5')
      else if (pt == '5') hash = createHash('sha256')
      else if (pt == '6') hash = createHash('sha512')
      /* eslint-enable no-multi-spaces */
      if (hash) {
        const data = hash.update(input, 'utf-8')
        input = data.digest('hex')
      }
    }
    return p == input
  }
}

/**
 * @class ACL: defines an ACL entry.
 */
class Acl {
  constructor(aclDesc) {
    const err = function (msg) {
      throw Error(`${msg} in acl ("${JSON.safeStringify(aclDesc)}")`)
    }
    if (!aclDesc?.core) err('Missing core')
    if (!aclDesc?.users) err('Missing users')
    if (!aclDesc?.groups) err('Missing groups')
    const core = aclDesc['core']
    if (core.length != 5) err('Incorrect number of elements for core')
    ;[this.owner, this.group, this.uaccess, this.gaccess, this.oaccess] = core
    this.users = JSON.parse(JSON.stringify(aclDesc['users'])) // json -> deep-copy
    this.groups = JSON.parse(JSON.stringify(aclDesc['groups'])) // json -> deep-copy
  }
  access(user, group) {
    if (user.name == this.owner) return this.uaccess
    else if (this.users?.[user.name]) return this.users[user.name]
    else if (this.group == group.name) return this.gaccess
    else if (this.groups?.[group.name]) return this.groups[group.name]
    else return this.oaccess
  }
}

/**
 * @class
 */
export class AclStatus {
  constructor(uname, gname, user, accError) {
    this.uname = uname
    this.gname = gname
    this.user = user
    this.accError = accError
    if (this.user) {
      this.uname = this.user.name
      try {
        this.group = this.user.validGroup(gname)
        if (this.group) this.gname = this.group.name
      } catch (error) {
        if (!this.accError) this.accError = 'E30'
        this.group = null
      }
    } else this.group = null
    this.context = null
    this.access = '---'
  }

  setContext(context) {
    this.context = context
  }

  setAcl(acl) {
    if (!this.accError && this.user) this.access = this.user.accessMask(acl, this.group)
  }

  refused(amode) {
    let acEr = null
    amode = amode !== undefined && amode ? amode : '---'
    if (this.accError) acEr = this.accError
    else if (amode[2] == 'x' && this.context && !this.context.validApi()) acEr = 'E12'
    else if (amode[2] != '-' && amode[2] != this.access[2]) acEr = 'E08'
    else if (!(amode[0] == '-' && amode[1] == '-' && amode[2] == '-')) {
      // else no restriction specified, http OK
      if (this.uname === '-')
        acEr = 'E01' // http 401, no credentials
      else if (!this.user)
        acEr = 'E02' // http 401, no credentials
      else if (this.access === '---')
        acEr = 'E03' // http 401, invalid credentials
      else if (amode[0] != '-' && amode[0] != this.access[0])
        acEr = 'E06' // http 401, invalid credentials
      else if (amode[1] != '-' && amode[1] != this.access[1]) acEr = 'E07' // http 401, invalid credentials
    }
    if (this.context) {
      this.context.process(this.uname, this.user ? this.user.uuid : -1, this.access, acEr)
    }
    return acEr
  }

  toString() {
    return `ACL:${this.uname}[${this.user ? this.user.id : -1}]:${this.gname}:${this.access}${
      this.accError ? ' => ' + this.accError : ''
    }`
  }
}

/* eslint-disable no-multi-spaces */
/* eslint-disable guard-for-in */
/**
 * @class ACL: defines an ACL entry.
 */
export class AclDB {
  constructor(cfg, syslog) {
    this.syslog = syslog
    if (typeof cfg != 'object' || !cfg.system_groups || !cfg.system_users) throw Error(`Invalid AclDB cfg`)

    const sg = cfg.system_groups
    const au = cfg.system_users
    try {
      this.systemGroups = {}
      this.groupsByID = {}
      for (const gi in sg) this.newGroup(gi, sg[gi])
      this.systemUsers = {}
      this.usersByID = {}
      for (const ui in au) this.newUser(ui, au[ui])

      // Object.entries(cfg.system_groups).forEach((group) => this.newGroup(group[0], group[1]))
      // Object.entries(cfg.system_users).forEach((user) => this.newUser(user[0], user[1]))
    } catch (err) {
      const errStr = `Could not initialize ACL DB: ${err}`
      this.error(errStr)
      throw Error(errStr)
    }
  }
  log(sev, message, context = null) {
    if (this.syslog) this.syslog.log(sev, message, 'ac', context)
  }
  error(message, context = null) {
    if (this.syslog) this.syslog.error(message, 'ac', context)
  }
  warn(message, context = null) {
    if (this.syslog) this.syslog.warn(message, 'ac', context)
  }
  info(message, context = null) {
    if (this.syslog) this.syslog.info(message, 'ac', context)
  }
  notice(message, context = null) {
    if (this.syslog) this.syslog.notice(message, 'ac', context)
  }
  debug(message, context = null) {
    if (this.syslog) this.syslog.debug(message, 'ac', context)
  }
  /* eslint-enable no-multi-spaces */
  /* eslint-enable guard-for-in */
  newGroup(name, goupId) {
    const ng = new Group(name, goupId)
    if (this.groupsByID?.[ng.id])
      throw Error(`Group id already set ("${ng.id} is in ${this.groupsByID[ng.id].name}" for ${gi})`)
    this.systemGroups[name] = ng
    this.groupsByID[ng.id] = ng
    return ng
  }
  newUser(name, userDesc) {
    const nu = new User(this, name, userDesc)
    if (this.usersByID?.[nu.id])
      throw Error(`User id already set ("${nu.id} is in ${this.usersByID[nu.id].name}" for ${ui})`)
    this.systemUsers[name] = nu
    this.usersByID[nu.id] = nu
    return nu
  }
  newAcl(aclconf) {
    const acl = new Acl(aclconf)
    const err = (msg) => {
      throw Error(`${msg} in acl ("${JSON.safeStringify(aclconf)}")`)
    }
    if (!this.systemUsers?.[acl.owner]) err(`Users ${this.owner} not found`)
    for (const ui in acl.users) if (!this.systemUsers?.[ui]) err(`Users ${ui} not found`)

    if (!this.systemGroups?.[acl.group]) err(`Group ${this.group} not found`)
    for (const gi in acl.groups) if (!this.systemGroups?.[gi]) err(`Group ${gi} not found`)

    return acl
  }
  newAclStatus = (uname, gname, user, accError) => new AclStatus(uname, gname, user, accError)
  newUserAclStatus = (user, group = '-') => new AclStatus(user.name, group, user, null)
  newAclError = (accError) => new AclStatus('-', '-', null, accError)
  newAclAnonymous = () => new AclStatus('-', '-', null, null)

  findGroup(gname) {
    if (!gname || gname == '-') return null
    if (this.systemGroups?.[gname]) return this.systemGroups[gname]
    const id = parseInt(gname)
    if (!isNaN(id) && this.groupsByID?.[id]) return this.groupsByID[id]
    return null
  }
  findUser(login, gname = '-', password = null) {
    let user = null
    if (this.systemUsers?.[login]) user = this.systemUsers[login]
    else {
      const id = parseInt(login)
      if (!isNaN(id) && this.usersByID?.[id]) user = this.usersByID[id]
    }
    if (password && user && !user.checkPassword(password)) user = null
    return new AclStatus(login, gname, user, user ? null : 'E02')
  }
  /* eslint-disable no-multi-spaces */
  forgeJwtFor(sysid, name, gname = 'producer', attributes = {}) {
    let user = null,
      group = null
    try {
      if (this.systemUsers?.[name]) {
        user = this.systemUsers[name]
        if (user.id != sysid) {
          if (user.id < G_USER_START_UID) {
            // Special case, we can overload external users with a new ID.
            return this.forgeJwtFor(sysid, 'ext::' + name, gname, attributes)
          } else this.error(`Inconsistent user: ${name}/${sysid}`)
          return [null, 'E32']
        }
      } else {
        const [id] = idFromStr(name, sysid)
        if (this.usersByID?.[id]) user = this.usersByID[id]
        else user = this.newUser(name, [id, '', [gname], ''])
        this.debug(`Forge delegation for ${name}:${gname} => ${id}:${sysid}`)
      }
      group = user.validGroup(gname)
    } catch (error) {
      this.error(`Invalid user: ${error}`)
      return [null, 'E30']
    }
    try {
      const admin = this.systemUsers['admin']
      const token = admin.forgeDelegatedUserJwt(user, group, attributes)
      return [token, null]
    } catch (error) {
      this.error(`Could not forge JWT: ${error}`)
      return [null, 'E31']
    }
  }
  /* eslint-enable no-multi-spaces */
  /* eslint-disable no-multi-spaces */
  findIdsFromJwt(value) {
    let aclStatus = null
    try {
      const jwtStr = `${value}`
      if (!RegExp(getJwtRegex()).exec(jwtStr)) {
        this.syslog.warning(`Input token is not a JWT: ${jwtStr}`)
        return this.newAclError('E20')
      }
      let jwt
      try {
        jwt = tokenStringToJwtObject(value)
      } catch (e) {
        return this.newAclError('E21')
      }
      this.debug(`Decoded JWT payload: ${JSON.safeStringify(jwt.payload)}`)

      const jwtPayload = jwt.payload
      const gname = jwtPayload.sub || '-'
      const uname = jwtPayload.client_id || '-'

      const nowepoch = Math.floor(new Date().getTime() / 1000)
      const expire = jwtPayload.exp || 0
      const nbf = jwtPayload.nbf || 0
      if (expire && nowepoch > expire) return new AclStatus(uname, gname, null, 'E23')
      else if (nowepoch && nowepoch < nbf) return new AclStatus(uname, gname, null, 'E24')

      aclStatus = this.findUser(uname, gname)
      if (aclStatus.accError) return aclStatus

      let user = aclStatus.user
      let group = aclStatus.group
      if (user.keys.length < 1) {
        aclStatus.accError = 'E25'
        return aclStatus
      }
      let validated = false
      for (const pubkey of user.keys) {
        try {
          validated = verifyToken(pubkey, jwtStr)
          break
        } catch (err) {
          this.debug(`jwt error: ${err}`)
          this.debug(`pubKey didn't validated the JWT: ${pubkey}`)
          continue
        }
      }
      if (validated) {
        let extraNotice = ''
        if (group.name == 'delegate') {
          extraNotice = ` by ${user.name}`
          this.debug(`JWT delegation${extraNotice}`)
          const dgname = jwtPayload.group_id || '-'
          const duname = jwtPayload.user_id || '-'
          aclStatus = this.findUser(duname, dgname)
          if (aclStatus.accError) return aclStatus
          user = aclStatus.user
          group = aclStatus.group
        }
        this.info(`JWT validated for ${user.name}:` + group.name + extraNotice)
      } else aclStatus.accError = 'E22'
    } catch (err) {
      this.warn(`Could not decode JWT: ${err}`)
      return this.newAclError('E20')
    }
    return aclStatus
  }
  /* eslint-enable no-multi-spaces */
  errDesc(accError) {
    let accessMsg = 'access granted'
    let accessRealm = ''
    if (accError) {
      accessRealm = 'Missing access rights'
      accessMsg = 'Authentication failed'
      switch (accError) {
        case 'E01':
          accessRealm = accessMsg = 'Authentication required'
          /* */ /* */ break
        case 'E02':
          accessMsg = 'Authentication failed: invalid user/password'
          /* */ /* */ break
        case 'E03':
          accessMsg = 'Access not granted: the user misses one or several credentials'
          /* */ /* */ break
        case 'E05':
          accessRealm = accessMsg = 'Authentication method invalid'
          /* */ /* */ break
        case 'E06':
          accessMsg = 'Access not granted: read access not set for the user'
          /* */ /* */ break
        case 'E07':
          accessMsg = 'Access not granted: write access not set for the user'
          /* */ /* */ break
        case 'E08':
          accessMsg = 'Access not granted: execution access not set for the user'
          /* */ /* */ break
        case 'E12':
          accessMsg = 'Incorrect API version, or version unspecified'
          /* */ /* */ break
        case 'E20':
          accessMsg = 'Malformed JWT'
          /* */ /* */ break
        case 'E21':
          accessMsg = 'Could not decode JWT'
          /* */ /* */ break
        case 'E22':
          accessMsg = 'Invalid signature for JWT'
          /* */ /* */ break
        case 'E23':
          accessMsg = 'Outdated JWT'
          /* */ /* */ break
        case 'E24':
          accessMsg = 'Overdated JWT'
          /* */ /* */ break
        case 'E25':
          accessMsg = 'Tier authority unknown or key missing'
          /* */ /* */ break
        case 'E30':
          accessMsg = "Invalid user/group specification (did you change the user's group ?)"
          /* */ /* */ break
        case 'E31':
          accessMsg = 'Could not forge JWT'
          /* */ /* */ break
        case 'E32':
          accessMsg = 'User defined with different id'
          /* */ /* */ break
      }
    }
    return [accessMsg, accessRealm]
  }
}
