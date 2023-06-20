const { dbClose, dbOpen } = require('../database')
const log = require('../../utils/logger')
const { statusOK } = require('../../utils/errors')
const mod = 'database'

const DEFAULT_VAL_FORM = 'Default_Value_Form'

const sqlCreateDefaultFormTable =
  `CREATE TABLE IF NOT EXISTS ${DEFAULT_VAL_FORM} (userId INTEGER, name TEXT, defaultValue TEXT,` +
  'PRIMARY KEY(userId,name),' +
  'CONSTRAINT Roles_fk_user_Id FOREIGN KEY (userId) REFERENCES users(id)' +
  ' ON UPDATE CASCADE ON DELETE CASCADE);'

exports.dbInitDefaultFormTable = (openedDb) => {
  const fun = 'dbInitDefaultFormTable'
  const db = openedDb || dbOpen()
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type=? AND name=?`,
      ['table', DEFAULT_VAL_FORM],
      (err, row) => {
        if (err) {
          if (!openedDb) dbClose(db)
          log.e(mod, fun + ' select', err.message)
          return reject(err)
        }
        if (row) {
          if (!openedDb) dbClose(db)
          return resolve({ status: `Table exists: '${DEFAULT_VAL_FORM}'` })
        }
        db.run(sqlCreateDefaultFormTable, (err) => {
          if (!openedDb) dbClose(db)
          if (err) {
            log.e(mod, fun + ' create', err.message)
            return reject(err)
          }
          log.i(
            mod,
            fun,
            `Table created: ${DEFAULT_VAL_FORM}`,
            log.getContext(null, { opType: 'init_table_defaultForm' })
          )
          resolve(statusOK(`Table created: ${DEFAULT_VAL_FORM}`))
        })
      }
    )
  })
}
