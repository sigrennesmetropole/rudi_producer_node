const databaseManager = require('../database');
const log = require('../../utils/logger');
const mod = 'database';

const sqlCreateRoleTable =
  'CREATE TABLE IF NOT EXISTS Roles (role TEXT PRIMARY KEY NOT NULL UNIQUE,desc TEXT);';
const sqlCreateUserRoleTable =
  'CREATE TABLE IF NOT EXISTS User_Roles (userId INTEGER, role TEXT, PRIMARY KEY(userId,role),' +
  'CONSTRAINT Roles_fk_user_Id FOREIGN KEY (userId) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,' +
  'CONSTRAINT Roles_fk_role FOREIGN KEY (role) REFERENCES Roles(role) ON UPDATE CASCADE ON DELETE CASCADE);';
const initialRoles = [
  { role: 'SuperAdmin', desc: 'a tous les droits' },
  { role: 'Admin', desc: 'administration' },
  { role: 'Moniteur', desc: 'acces au monitoring' },
  { role: 'Gestionnaire', desc: 'gestion avancée des métadonnées' },
  { role: 'Créateur', desc: 'gestion simple des métadonnées' },
];

exports.initRolesTable = () => {
  const fun = 'initRolesTable';
  const db = databaseManager.open();
  db.get(
    `SELECT name FROM sqlite_master WHERE type=? AND name=?`,
    ['table', 'Roles'],
    function (err, row) {
      if (err) {
        log.e(mod, fun, err.message);
        databaseManager.close(db);
      } else {
        if (!row) {
          db.run(sqlCreateRoleTable, (err) => {
            if (err) {
              log.e(mod, fun, err.message);
              databaseManager.close(db);
            } else {
              log.i(
                mod,
                fun,
                'Table Created : Roles',
                log.getContext(null, { opType: 'init_table_roles' }),
              );
              databaseManager.close(db);
              databaseManager.createRoles(initialRoles);
            }
          });
        } else {
          databaseManager.close(db);
        }
      }
    },
  );
};
exports.initUserRolesTable = () => {
  const fun = 'initUserRolesTable';
  const db = databaseManager.open();
  db.get(
    `SELECT name FROM sqlite_master WHERE type=? AND name=?`,
    ['table', 'User_Roles'],
    function (err, row) {
      if (err) {
        log.e(mod, fun, err.message);
        databaseManager.close(db);
      } else {
        if (!row) {
          db.run(sqlCreateUserRoleTable, (err) => {
            if (err) {
              log.e(mod, fun, err.message);
              databaseManager.close(db);
            } else {
              log.i(
                mod,
                fun,
                'Table Created : User_Roles',
                log.getContext(null, { opType: 'init_table_userRoles' }),
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
