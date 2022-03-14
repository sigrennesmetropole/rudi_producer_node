const databaseManager = require('../database');
const log = require('../../utils/logger');
const mod = 'database';

const sqlCreateUsersTable =
  'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,' +
  'username TEXT NOT NULL UNIQUE,password TEXT NOT NULL,email TEXT);';

exports.initUsersTable = () => {
  const fun = 'initUsersTable';
  const db = databaseManager.open();
  db.get(
    `SELECT name FROM sqlite_master WHERE type=? AND name=?`,
    ['table', 'users'],
    function (err, row) {
      if (err) {
        log.e(mod, fun, err.message);
        databaseManager.close(db);
      } else {
        if (!row) {
          db.run(sqlCreateUsersTable, (err) => {
            if (err) {
              log.e(mod, fun, err.message);
              databaseManager.close(db);
            } else {
              log.i(
                mod,
                fun,
                'Table Created : Users',
                log.getContext(null, { opType: 'init_table_users' }),
              );
              databaseManager.close(db);
            }
          });
        } else {
          databaseManager.close(db);
        }
      }
    },
  );
};
