const mod = 'initDb'

// ---- External dependencies -----
const fs = require('fs')

// ---- Internal dependencies -----
const { getDbConf, SU_NAME } = require('../../config/config')
const { decodeBase64 } = require('../../utils/utils')
const log = require('../../utils/logger')
const { RudiError, statusOK } = require('../../utils/errors')

const {
  dbClose,
  dbCreateRoles,
  dbCreateUserRole,
  dbDeleteUserWithId,
  dbExistsUser,
  dbGetRoles,
  dbGetUserRoles,
  dbOpen,
  dbOpenOrCreate,
  dbRegisterUser,
  TBL_ROLES,
  TBL_USER_ROLES,
  TBL_USERS,
  dbGetUsers,
  dbGetUserById,
} = require('../database')
// const { dbInitDefaultFormTable } = require('./initDefaultForm')

const USER_ID_START_VALUE = 6000

// ---- Constants -----
exports.ROLE_SU = 'SuperAdmin'
exports.ROLE_ADMIN = 'Admin'
exports.ROLE_EDIT = 'Editeur'
exports.ROLE_READ = 'Lecteur'
exports.ROLE_ALL = 'All'

const initialRoles = [
  { role: this.ROLE_SU, desc: 'a tous les droits', hide: true },
  { role: this.ROLE_ADMIN, desc: 'administration, création et validation des comptes' },
  { role: 'Moniteur', desc: 'accès au monitoring', hide: true },
  { role: this.ROLE_EDIT, desc: 'édition et suppression des métadonnées' },
  { role: this.ROLE_READ, desc: 'lecture seule des métadonnées' },
]

const sqlGet = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
const sqlCreateRoleTable =
  `CREATE TABLE IF NOT EXISTS ${TBL_ROLES} (` +
  `role TEXT PRIMARY KEY NOT NULL UNIQUE,` +
  `desc TEXT,` +
  `hide INTEGER(1));`

const sqlCreateUserTable =
  `CREATE TABLE IF NOT EXISTS ${TBL_USERS} (` +
  `id INTEGER PRIMARY KEY AUTOINCREMENT,` +
  `username TEXT NOT NULL UNIQUE,` +
  `password TEXT NOT NULL,` +
  `email TEXT);`

const sqlCreateUserRoleTable =
  `CREATE TABLE IF NOT EXISTS ${TBL_USER_ROLES} (` +
  `userId INTEGER,` +
  `role TEXT,` +
  `PRIMARY KEY(userId,role),` +
  `CONSTRAINT Roles_fk_user_Id FOREIGN KEY (userId) REFERENCES ${TBL_USERS}(id) ` +
  `ON UPDATE CASCADE ON DELETE CASCADE,` +
  `CONSTRAINT Roles_fk_role FOREIGN KEY (role) REFERENCES ${TBL_ROLES}(role) ` +
  `ON UPDATE CASCADE ON DELETE CASCADE);`

// ---- Functions -----
const dbInitTable = (openedDb, tableName, sqlCreateReq) => {
  const fun = 'initTable'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(sqlGet, [tableName], (err, row) => {
      if (err) {
        if (!openedDb) dbClose(db)
        return reject(err)
      }
      if (row) {
        if (!openedDb) dbClose(db)
        return resolve(statusOK(`Table exists: '${tableName}'`))
      }
      db.run(sqlCreateReq, (err) => {
        if (!openedDb) dbClose(db)
        if (err) {
          log.e(mod, `${fun}.${tableName}.create`, err.message)
          return reject(err)
        }
        log.i(
          mod,
          `${fun}.${tableName}.create`,
          `Table Created : ${tableName}`,
          log.getContext(null, { opType: `init_table_${tableName}`.toLowerCase() })
        )
        return resolve(statusOK(`Table created: ${tableName}`))
      })
    })
  })
}

const dbNormalizeRoleTable = async (openedDb) => {
  const db = openedDb || dbOpen()
  await dbNormalizeRoleTableAddHide(db)
  await dbRenameRoles(db)
  await dbRenameUserRoles(db)
  if (!openedDb) dbClose(db)
}
const dbNormalizeRoleTableAddHide = (openedDb) => {
  const fun = 'dbNormalizeRoleTableAddHide'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${TBL_ROLES})`, (err, rows) => {
      if (err) {
        if (!openedDb) dbClose(db)
        log.d(mod, `${fun}.pragma`, err.message)
        return reject(new RudiError(`RoleHide Pragma failed: ${err.message}`))
      }
      if (rows.find((row) => row.name === 'hide')) {
        if (!openedDb) dbClose(db)
        log.d(mod, `${fun}`, `Column 'hide' exists`)
        return resolve(statusOK(`Column 'hide' exists`))
      }
      db.run(`ALTER TABLE ${TBL_ROLES} ADD hide INTEGER(1) DEFAULT 0`, (err) => {
        if (err) {
          if (!openedDb) dbClose(db)
          log.d(mod, `${fun}.addHide`, err.message)
          return reject(err)
        }
        db.run(
          `UPDATE ${TBL_ROLES} SET hide=1 WHERE role='${this.ROLE_SU}' OR role='Moniteur' `,
          (err) => {
            if (err) {
              if (!openedDb) dbClose(db)
              log.d(mod, `${fun}.setHideFlag`, err.message)
              return reject(err)
            }
            return resolve(statusOK(`Column 'hide added & role flags set`))
          }
        )
      })
    })
  })
}
const dbRenameUserRoles = (openedDb) => {
  const fun = 'dbRenameUserRoles'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    dbGetUserRoles(db).then((roleList) => {
      const found = roleList.find(
        (roleDescPair) =>
          roleDescPair.role == 'Createur' ||
          roleDescPair.role == 'Créateur' ||
          roleDescPair.role == 'Gestionnaire'
      )
      if (!found) {
        if (!openedDb) dbClose(db)
        log.d(mod, `${fun}`, `UserRoles already renamed`)
        return resolve(statusOK(`UserRoles already renamed`))
      }
      db.run(
        `UPDATE ${TBL_USER_ROLES} SET role='Lecteur' WHERE role='Createur' OR role='Créateur'`,
        (err) => {
          if (err) {
            if (!openedDb) dbClose(db)
            log.d(mod, `${fun}.Lecteur`, err.message)
            return reject(new RudiError(`${fun}.Lecteur: ${err}`))
          }
          db.run(`UPDATE ${TBL_USER_ROLES} SET role='Editeur' WHERE role='Gestionnaire'`, (err) => {
            if (!openedDb) dbClose(db)
            if (err) {
              log.d(mod, `${fun}.Editeur`, err.message)
              return reject(new RudiError(`${fun}.Editeur: ${err}`))
            }
            log.d(mod, `${fun}`, `UserRoles renamed`)
            return resolve(statusOK(`UserRoles renamed`))
          })
        }
      )
    })
  })
}
const dbRenameRoles = (openedDb) => {
  const fun = 'dbRenameRoles'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    dbGetRoles(db)
      .then((roleList) => {
        const found = roleList.find(
          (roleDescPair) =>
            roleDescPair.role == 'Createur' ||
            roleDescPair.role == 'Créateur' ||
            roleDescPair.role == 'Gestionnaire'
        )
        if (!found) {
          if (!openedDb) dbClose(db)
          log.d(mod, `${fun}`, `Roles already renamed`)
          return resolve(statusOK(`Roles already renamed`))
        }
        db.run(
          `UPDATE ${TBL_ROLES} SET role='Lecteur', desc='lecture seule des métadonnées' WHERE role='Createur' OR role='Créateur'`,
          (err) => {
            if (err) {
              if (!openedDb) dbClose(db)
              log.d(mod, `${fun}.Lecteur`, err.message)
              return reject(new RudiError(`${fun}.Lecteur: ${err}`))
            }
            db.run(
              `UPDATE ${TBL_ROLES} SET role='Editeur',desc='édition et suppression des métadonnées' WHERE role='Gestionnaire'`,
              (err) => {
                if (!openedDb) dbClose(db)
                if (err) {
                  log.d(mod, `${fun}.Editeur`, err.message)
                  return reject(new RudiError(`${fun}.Editeur: ${err}`))
                }
                log.d(mod, `${fun}`, `Roles renamed`)
                return resolve(statusOK(`Roles renamed`))
              }
            )
          }
        )
      })
      .catch((err) => {
        if (!openedDb) dbClose(db)
        reject(new RudiError(`RenameRoles.getRoles: ${err}`))
      })
  })
}

const dbNormalizeUserTableName = (openedDb, oldTblName) => {
  const fun = 'dbNormalizeUsersTableName'
  const tempName = `x${oldTblName}x`
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${oldTblName}'`,
      [],
      (err, row) => {
        if (err) {
          if (!openedDb) dbClose(db)
          log.d(mod, `${fun}.check`, err.message)
          return reject(err)
        }
        if (!row) {
          if (!openedDb) dbClose(db)
          return resolve(`No table found with name '${oldTblName}'`)
        }

        console.log(mod, `${fun}.check`, JSON.stringify(row))

        db.run(`ALTER TABLE '${oldTblName}' RENAME TO '${tempName}'`, [], (err, row) => {
          if (err) {
            if (!openedDb) dbClose(db)
            log.e(mod, `${fun}.renameToto`, err.message)
            return reject(err)
          }
          console.log(mod, `${fun}.renameToto`, JSON.stringify(row))
          db.run(`ALTER TABLE '${tempName}' RENAME TO '${TBL_USERS}'`, [], (err, row) => {
            if (!openedDb) dbClose(db)
            if (err) {
              log.e(mod, `${fun}.renameReal`, err.message)
              reject(err)
            } else {
              console.log(mod, fun, JSON.stringify(row))
              resolve('Users table name normalized')
            }
          })
        })
      }
    )
  })
}

const dbNormalizeUserTableId = async (db) => {
  try {
    const dummyUserName = 'dummy'
    let dummyUsr = await dbGetUserById(db, USER_ID_START_VALUE)
    if (!dummyUsr)
      dummyUsr = await dbRegisterUser(db, {
        username: dummyUserName,
        email: 'x',
        password: 'x',
        id: USER_ID_START_VALUE,
      })
    if (dummyUsr?.username === dummyUserName) await dbDeleteUserWithId(db, USER_ID_START_VALUE)
    return statusOK(`Users table IDs normalized`)
  } catch (err) {
    log.e(mod, 'dbNormalizeUsersTableId', err)
    throw err
  }
}

const dbCreateSuperUser = async (db) => {
  const fun = 'dbCreateSuperUser'

  const encodedSuPwd = getDbConf('db_su_pwd')

  if (!SU_NAME || !encodedSuPwd) {
    log.e(mod, fun, 'No super user config was found')
    throw new RudiError('Conf needed: database.db_su_usr + database.db_su_pwd')
  }

  if (await dbExistsUser(db, SU_NAME)) return

  const suId = getDbConf('db_su_id') || 0

  const suPwd = decodeBase64(encodedSuPwd)

  const superUser = {
    id: suId,
    username: SU_NAME,
    password: suPwd,
    email: 'security@rudi-univ-rennes1.fr',
    role: this.ROLE_SU,
  }

  const res = await dbRegisterUser(db, superUser)
  const { id, username } = res
  try {
    await dbCreateUserRole(db, { userId: id, role: superUser.role })
    const msg = `Super user created: '${username}' (id ${id})`
    log.i(mod, fun, msg)
    return statusOK(msg)
  } catch (err) {
    log.e(mod, fun, `Error: ${err}`)
  }
}

exports.dbInitialize = async () => {
  const fun = 'dbInitialize'
  try {
    if (!fs.statSync(getDbConf('db_directory')).isDirectory())
      throw new RudiError(
        `Database folder not found: ${getDbConf('db_directory')}`,
        500,
        'Config error'
      )

    const db = await dbOpenOrCreate()

    const initRolesRes = await dbInitTable(db, TBL_ROLES, sqlCreateRoleTable)
    if (initRolesRes.message?.startsWith('Table created')) await dbCreateRoles(db, initialRoles)
    else await dbNormalizeRoleTable(db)
    log.d(mod, fun, 'Table initialized: Roles')

    await dbInitTable(db, TBL_USER_ROLES, sqlCreateUserRoleTable)
    log.d(mod, fun, 'Table initialized: UserRoles')

    await dbNormalizeUserTableName(db, 'x')
    await dbNormalizeUserTableName(db, 'users')
    log.d(mod, fun, 'Table normalized: users')

    await dbInitTable(db, TBL_USERS, sqlCreateUserTable)
    await dbNormalizeUserTableId(db)
    log.d(mod, fun, 'Table initialized: Users')

    await dbCreateSuperUser(db)
    log.d(mod, fun, `User created: SU (${getDbConf('db_su_usr')})`)

    await dbGetUsers(db)
    await dbGetUserRoles(db)
    await dbGetRoles(db)
    dbClose(db)
    log.d(mod, fun, 'DB initialized')
  } catch (error) {
    log.e(mod, fun, error)
    throw error
  }
}
