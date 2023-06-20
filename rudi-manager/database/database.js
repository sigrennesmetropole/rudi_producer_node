const mod = 'db'

// ---- External dependencies -----
const { Database, OPEN_READWRITE } = require('sqlite3').verbose()

// ---- Internal dependencies -----
const { getDbConf, SU_NAME } = require('../config/config')
const {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  RudiError,
  STATUS_CODE,
  statusOK,
  UnauthorizedError,
} = require('../utils/errors')
const { hashPassword } = require('../utils/secu')
const log = require('../utils/logger')

// ---- Constants -----
const DB_NAME = getDbConf('db_filename')
const DB_FILE = `${getDbConf('db_directory')}${DB_NAME ? `/${DB_NAME}` : ''}`.trim()

const TBL_USERS = 'Users'
exports.TBL_USERS = TBL_USERS

const TBL_ROLES = 'Roles'
exports.TBL_ROLES = TBL_ROLES

const TBL_USER_ROLES = 'User_Roles'
exports.TBL_USER_ROLES = TBL_USER_ROLES

// ---- Functions -----
const dbOpen = () => {
  const fun = 'dbOpen'
  const db = new Database(DB_FILE, OPEN_READWRITE, (err) => {
    if (err) {
      log.e(mod, fun, err)
      log.e(mod, fun, err.message)
    } else {
      // TODO: return something?
    }
  })
  return db.exec('PRAGMA foreign_keys = ON')
}
exports.dbOpen = dbOpen

const dbClose = (db) => {
  db.close((err) => {
    if (err && err.message != 'SQLITE_MISUSE: Database handle is closed')
      log.e(mod, 'dbClose', err.message)
  })
  return statusOK('DB closed')
}
exports.dbClose = dbClose

exports.dbOpenOrCreate = () => {
  const fun = 'dbOpenOrCreate'
  return new Promise((resolve, reject) => {
    const db = new Database(DB_FILE, (err) => {
      if (err) {
        log.e(mod, fun, err)
        return reject(err)
      }
      log.v(mod, fun, 'Creation of (or Connected to) the rudi_manager database.')
    })
    resolve(db)
  })
}

// ---- Controllers -----
exports.dbGetHashedPassword = async (openedDb, username) => {
  const fun = 'dbGetHashedPassword'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(`SELECT  password FROM ${TBL_USERS} WHERE username = ?`, [username], (err, row) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        reject(err)
      } else {
        if (!row) return reject(new UnauthorizedError('No user found'))
        return resolve({ username, password: row.password })
      }
    })
  })
}

/**
 * Retrieve the user info in DB from a key+value pair
 * @param {Database?} openedDb an sqlite3 database (possibly null)
 * @param {String} field the field used to find the user
 * @param {String | number} val the value for above field
 * @returns {Object} the user info
 */
exports.dbGetUserByField = (openedDb, field, val) => {
  const fun = 'dbGetUserByField'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT ${TBL_USERS}.id, ${TBL_USERS}.username, ${TBL_USERS}.email,` +
        ` GROUP_CONCAT(${TBL_USER_ROLES}.role) AS roles FROM ${TBL_USERS}` +
        ` LEFT JOIN ${TBL_USER_ROLES} ON ${TBL_USER_ROLES}.userId = ${TBL_USERS}.id` +
        ` GROUP BY ${TBL_USERS}.id HAVING ${TBL_USERS}.${field} = ?;`,
      // `SELECT id, username, email FROM ${TBL_USERS} WHERE ${field} = ?`,
      [val],
      (err, userInfo) => {
        if (!openedDb) dbClose(db)
        if (err) {
          log.e(mod, fun, err)
          console.error(' T (dbGetUserByField) ERR', err)
          return reject(err)
        } else {
          if (!userInfo || Object.keys(userInfo).length === 0) {
            // console.error(`T (dbGetUserByField) User not found with '${field}' = '${val}'`, err)
            return resolve(null)
          }
          // console.log(` T (dbGetUserByField) Found with '${field}' = '${val}'`, userInfo)
          return resolve(userInfo)
        }
      }
    )
  })
}

/**
 * Retrieve the user info in DB from their username
 * @param {Database?} openedDb an sqlite3 database (possibly null)
 * @param {String} username the user's username
 * @returns {Object} the user info
 */
exports.dbGetUserByUsername = (openedDb, username) =>
  this.dbGetUserByField(openedDb, 'username', username)

/**
 * Retrieve the user info in DB from their id
 * @param {Database?} openedDb an sqlite3 database (possibly null)
 * @param {number} id the user's id
 * @returns {Object} the user info
 */
exports.dbGetUserById = (openedDb, id) => this.dbGetUserByField(openedDb, 'id', id)
/**
 * Retrieve the user info in DB from their e-mail
 * @param {Database?} openedDb an sqlite3 database (possibly null)
 * @param {String} email the user's e-mail
 * @returns {Object} the user info
 */
exports.dbGetUserByEmail = (openedDb, email) => this.dbGetUserByField(openedDb, 'email', email)

/**
 * Checks if the user was created
 * @param {Database?} openedDb an sqlite3 database (possibly null)
 * @param {String} username the user's e-mail
 * @returns {Object} the user info
 */
exports.dbExistsUser = async (openedDb, username) => {
  const userInfo = await this.dbGetUserByUsername(openedDb, username)
  return !!userInfo?.username
}

exports.dbGetUsers = (openedDb) => {
  const fun = 'getUsers'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT ${TBL_USERS}.id, ${TBL_USERS}.username, ${TBL_USERS}.email, GROUP_CONCAT(${TBL_USER_ROLES}.role)` +
        ` AS roles FROM ${TBL_USERS} LEFT JOIN ${TBL_USER_ROLES} ON ${TBL_USER_ROLES}.userId = ${TBL_USERS}.id` +
        ` GROUP BY ${TBL_USERS}.id HAVING ${TBL_USERS}.id > 0;`,
      (err, rows) => {
        if (!openedDb) dbClose(db)
        if (err) {
          log.e(mod, fun, err.message)
          reject(err)
        } else {
          const result = rows.map((row) => {
            if (row.roles) row.roles = row.roles.split(',')
            return row
          })
          resolve(result)
        }
      }
    )
  })
}

/**
 * Check if the users exists, creates it if not.
 * @param {Object} user
 * @return {Promise} User id and username when successful
 * @throws {ForbiddenError} user already exists
 */
exports.dbCreateUserCheckExists = (openedDb, user) => {
  const fun = 'safeCreateUser'
  const { username, password, email, id } = user
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM ${TBL_USERS} WHERE username = ?`, [username], (err, row) => {
      if (err) {
        if (!openedDb) dbClose(db)
        log.e(mod, fun + ' doesUserExist', err.message)
        return reject(err)
      }
      if (row?.id) {
        if (!openedDb) dbClose(db)
        const errMsg = `User '${username}' already exists`
        log.e(mod, fun + ' userExists', errMsg)
        return reject(new ForbiddenError(errMsg))
      } else {
        db.run(
          `INSERT INTO ${TBL_USERS}(username,password,email${id ? ',id' : ''})` +
            ` VALUES(?,?,?${id ? ',?' : ''})`,
          [username, password, email, id],
          (err) => {
            if (err) {
              if (!openedDb) dbClose(db)
              log.e(mod, fun + ' cannotCreateUser', err.message)
              return reject(err)
            }
            log.i(
              mod,
              fun,
              `${TBL_USERS} : user created: '${username}'`,
              log.getContext(null, { opType: 'post_user' })
            )
            db.get(`SELECT * FROM ${TBL_USERS} where username = ?`, [username], (err, userInfo) => {
              if (!openedDb) dbClose(db)
              if (err) {
                log.e(mod, fun + ' retrieveUserInfo', err.message)
                reject(err)
              } else {
                const { id, username } = userInfo
                resolve({ id, username })
              }
            })
          }
        )
      }
    })
  })
}

exports.dbRegisterUser = async (db, { username, email, password, id }) => {
  const fun = 'dbRegisterUser'
  try {
    const userCreds = {
      username,
      password: hashPassword(password),
      email,
    }
    if (id) userCreds.id = id

    const usr = await this.dbCreateUserCheckExists(db, userCreds)
    return { id: usr.id, username: usr.username }
  } catch (err) {
    log.e(mod, fun, err)
    throw err
  }
}

exports.dbCreateUser = (openedDb, userInfo) => {
  const fun = 'dbCreateUser'
  const { username, password, email } = userInfo

  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO ${TBL_USERS}(username,password,email) VALUES(?,?,?)`,
      [username, password, email],
      (err) => {
        if (err) {
          if (!openedDb) dbClose(db)
          log.e(mod, fun + ' insert', err.message)
          return reject(err)
        }
        log.i(
          mod,
          fun,
          `(${TBL_USERS}) user created: '${username}'`,
          log.getContext(null, { opType: 'post_user' })
        )
        db.get(`SELECT * FROM ${TBL_USERS} where username = ?`, [username], (err, row) => {
          if (!openedDb) dbClose(db)
          if (err) {
            log.e(mod, fun + ' select', err.message)
            return reject(err)
          }
          resolve({ id: row.id, username: row.username })
        })
      }
    )
  })
}

exports.dbUpdateUser = (openedDb, userInfo) => {
  const fun = 'dbUpdateUser'
  const { id, username, password, email } = userInfo
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE ${TBL_USERS} SET username = ?, email = ?` +
        (!!password ? `, password = '${password}'` : '') +
        ` WHERE id = ?`,
      [username, email, id],
      (err) => {
        if (err) {
          if (!openedDb) dbClose(db)
          log.e(mod, fun + ' insert', err.message)
          return reject(err)
        }
        log.i(
          mod,
          fun,
          `(${TBL_USERS}) user updated: '${username}'`,
          log.getContext(null, { opType: 'post_user' })
        )
        db.get(`SELECT * FROM ${TBL_USERS} where username = ?`, [username], (err, row) => {
          if (!openedDb) dbClose(db)
          if (err) {
            log.e(mod, fun + '.select', err.message)
            return reject(err)
          }
          if (!row) {
            log.e(mod, fun + '.select', `User doesn't exist: ${username}`)
            return reject(new BadRequestError(`User doesn't exist: ${username}`))
          }
          resolve({ id: row.id, username: row.username })
        })
      }
    )
  })
}

exports.dbHashAndUpdatePassword = async (openedDb, username, password) => {
  const hashedPwd = await hashPassword(password)
  return await this.dbUpdatePasswordWithField(openedDb, 'username', username, hashedPwd)
}

exports.dbUpdatePasswordWithField = (openedDb, key, val, password) => {
  const fun = 'dbUpdatePasswordWithField'
  const db = openedDb || dbOpen()
  log.i(mod, fun, `Password reset for user '${val}'`)
  return new Promise((resolve, reject) => {
    db.run(`UPDATE ${TBL_USERS} SET password = ? WHERE ${key} = ?`, [password, val], (err) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        return reject(err.message)
      }
      log.i(
        mod,
        fun,
        `${TBL_USERS}: password reset for user '${val}'`,
        log.getContext(null, { opType: 'put_password' })
      )
      resolve({ key: val })
    })
  })
}

exports.dbDeleteUserWithId = (openedDb, id) => {
  const fun = 'deleteUser'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM ${TBL_USERS} WHERE id = ?`, [id], (err) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        return reject(err)
      }
      log.i(
        mod,
        fun,
        `${TBL_USERS} : A row was deleted with id ${id}`,
        log.getContext(null, { opType: 'delete_user' })
      )
      resolve({ id })
    })
  })
}

// ROLES
exports.dbCreateRoles = (openedDb, roles) => {
  const fun = 'createRoles'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      roles.forEach((role) => {
        db.run(
          `INSERT INTO ${TBL_ROLES}(role,desc,hide) VALUES(?,?,?)`,
          [role.role, role.desc, !!role.hide],
          (err) => {
            if (err) {
              log.e(mod, fun, err.message)
              if (!openedDb) dbClose(db)
              return reject(err)
            }
            log.i(
              mod,
              fun,
              `(${TBL_ROLES}) A role has been created with name '${role.role}'`,
              log.getContext(null, { opType: 'add_role' })
            )
          }
        )
      })
      if (!openedDb) dbClose(db)
      resolve({ roles })
    })
  })
}

exports.dbGetRoles = (openedDb) => {
  const fun = 'getRoles'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${TBL_ROLES}`, (err, rows) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        return reject(err)
      } else {
        const roles = []
        rows.map((roleInfo) => {
          if (roleInfo.role != 'Moniteur' || roleInfo.role != 'SuperAdmin') roles.push(roleInfo)
        })
        return resolve(roles)
      }
    })
  })
}
exports.dbGetUserRoles = (openedDb) => {
  const fun = 'getRoles'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${TBL_USER_ROLES}`, (err, rows) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        return reject(err)
      } else {
        return resolve(rows)
      }
    })
  })
}
exports.dbGetRoleById = (openedDb, role) => {
  const fun = 'dbGetRoleById'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM ${TBL_ROLES} WHERE role = ?`, [role], function (err, row) {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

/**
 * Retrieves user's roles from their username
 * @param {Database} openedDb
 * @param {String} username The user's username
 * @returns {Array} The array of user's roles
 */
exports.dbGetUserRolesByUsername = async (openedDb, username) => {
  const fun = 'dbGetUserRolesByUsername'
  const db = openedDb || dbOpen()
  try {
    if (!username) throw new BadRequestError('The username should be provided')
    const userInfo = await this.dbGetUserByUsername(db, username)
    const id = userInfo?.id
    if (!id && username != SU_NAME) {
      dbClose(db)
      throw new UnauthorizedError(`User not found: ${username}`)
    }
    const roles = await this.dbGetUserRolesByUserId(db, id)
    if (!openedDb) dbClose(db)
    return roles
  } catch (err) {
    if (!openedDb) dbClose(db)
    log.e(mod, fun, err.toString())
    if (err[STATUS_CODE] === 400)
      throw new ForbiddenError(`Admin validation required for user '${username}'`)
    throw err
  }
}

exports.isValidatedUser = async (openedDb, userInfo) => {
  const db = openedDb || dbOpen()
  try {
    let roles
    if (userInfo.id) roles = await this.dbGetUserRolesByUserId(db, userInfo.id)
    else if (userInfo.username) roles = await this.dbGetUserRolesByUsername(db, userInfo.username)
    else throw new UnauthorizedError(`User not found: ${userInfo.username || userInfo.id}`)
    if (!openedDb) dbClose(db)
    return roles
  } catch (err) {
    if (!openedDb) dbClose(db)
    console.error('T (isValidatedUser)', userInfo.username || userInfo.id)
    throw err
  }
}

/**
 * Retrieves user's roles from their id
 * @param {Database} openedDb
 * @param {String} username The user's id
 * @returns {Array} The array of user's roles
 */
exports.dbGetUserRolesByUserId = (openedDb, userId) => {
  const fun = 'dbGetUserRolesByUserId'
  return new Promise((resolve, reject) => {
    if (userId !== 0 && !userId) return reject(new BadRequestError(`User id not provided`))
    const db = openedDb || dbOpen()
    this.dbGetUserById(db, userId)
      .then((userInfo) => {
        if (!userInfo) {
          if (!openedDb) dbClose(db)
          return reject(new Error(`User ${userId} not found!`))
        }
        const id = userInfo?.id

        db.all(`SELECT role FROM ${TBL_USER_ROLES} WHERE userId = ?`, [id], (err, rows) => {
          if (!openedDb) dbClose(db)
          if (err) {
            log.e(mod, fun, err.message)
            return reject(err)
          } else {
            return resolve(rows.map((row) => row?.role))
          }
        })
      })
      .catch((err) => {
        if (!openedDb) dbClose(db)
        reject(err)
      })
  })
}

exports.dbGetUserInfoByUsername = async (openedDb, username) => {
  const db = openedDb || dbOpen()
  const userInfo = await this.dbGetUserByUsername(db, username)
  userInfo.roles = await this.dbGetUserRolesByUserId(db, userInfo.id)
  if (!openedDb) dbClose(db)
  return userInfo
}

exports.dbDeleteUserRole = (openedDb, userId, role) => {
  const fun = 'deleteUserRole'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM ${TBL_USER_ROLES} WHERE userId = ? AND role = ?`, [userId, role], (err) => {
      if (!openedDb) dbClose(db)
      if (err) {
        log.e(mod, fun, err.message)
        return reject(err)
      }
      log.i(
        mod,
        fun,
        `${TBL_USER_ROLES}: A role was deleted with userId ${userId} and role '${role}'`,
        log.getContext(null, { opType: 'delete_userRole' })
      )
      resolve({ userId, role })
    })
  })
}

exports.dbCreateUserRole = (openedDb, { userId, username, role }) => {
  const fun = 'dbCreateUserRole'
  if (userId !== 0 && !userId)
    Promise.reject(new BadRequestError('Input parameter userId must be defined'))
  if (!role) Promise.reject(new BadRequestError('Input parameter role must be defined'))
  console.log('T (dbCreateUserRole)', { userId, username, role })
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    try {
      db.run(`INSERT INTO ${TBL_USER_ROLES}(userId,role) VALUES(?,?)`, [userId, role], (err) => {
        if (!openedDb) dbClose(db)
        if (err) {
          log.e(mod, fun, err.message)
          if (`${err.message}`?.startsWith('SQLITE_CONSTRAINT: UNIQUE constraint failed'))
            return reject(new BadRequestError(`Role already assigned to user`))
          if (`${err.message}`?.startsWith('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed')) {
            return reject(
              new BadRequestError(
                `User ${userId}${username ? ` (${username})` : ''} or role '${role}' not found`
              )
            )
          }
          return reject(new InternalServerError(err))
        }
        log.i(
          mod,
          fun,
          `(${TBL_USER_ROLES}) A row was inserted with userId ${userId} and role '${role}'`,
          log.getContext(null, { opType: 'post_userRole' })
        )
        resolve({ userId, role })
      })
    } catch (e) {
      reject(
        `Role '${role}' could not be added to user '${username || userId}'. An error occured: ${e}`
      )
    }
  })
}

exports.dbUpdateUserRoles = async (openedDb, userInfo) => {
  const fun = 'dbUpdateUserRoles'
  try {
    const { userId, username, roles: targetRoles } = userInfo
    if (userId !== 0 && !userId)
      Promise.reject(new BadRequestError(`Input parameter 'userId' must be defined`))
    if (!targetRoles) Promise.reject(new BadRequestError(`Input parameter 'roles' must be defined`))
    if (!Array.isArray(targetRoles))
      throw new BadRequestError(`Parameter 'roles' should be an array`)
    // log.d(mod, fun, `Updating roles for user '${username}': ${JSON.stringify(targetRoles)}`)
    const db = openedDb || dbOpen()
    let origRoles = await this.dbGetUserRolesByUserId(db, userId)
    // console.debug(`T (dbUpdateUserRoles) user '${username} (${userId})' -> dbRoles:`, origRoles)
    // console.debug(
    //   `T (dbUpdateUserRoles) user '${username} (${userId})' -> targetRoles:`,
    //   targetRoles
    // )
    await Promise.all(
      targetRoles.map((newRole) => {
        // console.debug(`T (dbUpdateUserRoles) user '${username}' -> role:`, newRole)
        return new Promise((resolve, reject) => {
          const i = origRoles.indexOf(newRole)
          // console.log('T (dbUpdateUserRoles) found:', i)
          if (i === -1) {
            this.dbCreateUserRole(db, { userId, role: newRole, username })
              .then((res) => {
                log.i(mod, fun, `Role added to  user '${username || userId}': ${newRole}`)
                return resolve(`Role added to user '${username || userId}': ${newRole}`)
              })
              .catch((err) => reject(`(dbUpdateUserRoles.addNew) ${err}`))
          } else {
            origRoles.splice(i, 1)
            console.log(
              `T (dbUpdateUserRoles) Role kept for user '${username || userId}': ${newRole}`
            )
            console.log(`T (dbUpdateUserRoles) Roles left:`, origRoles)
            resolve(`Role kept for user '${username || userId}': ${newRole}`)
          }
        })
      })
    )
    // console.log(`T (dbUpdateUserRoles) origRoles left (to remove):`, origRoles)
    await Promise.all(
      origRoles.map(
        (roleToRemove) =>
          new Promise((resolve, reject) => {
            this.dbDeleteUserRole(db, userId, roleToRemove)
              .then((res) => {
                log.i(mod, fun, `Role removed to user '${username || userId}': ${roleToRemove}`)
                return resolve(`Role removed to user '${username || userId}': ${roleToRemove}`)
              })
              .catch((err) => reject(`(dbUpdateUserRoles.delOld) ${err}`))
          })
      )
    )
    if (!openedDb) dbClose(db)
  } catch (err) {
    log.e(mod, fun, `(dbUpdateUserRoles) ERR: ${err}`)
    throw new RudiError(err)
  }
}
