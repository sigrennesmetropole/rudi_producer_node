const databaseManager = require('../database');
const config = require('../../config/config');
const initUsersTable = require('./initUsersTable');
const initRolesTable = require('./initRoles');
const initDefaultFormTable = require('./initDefaultForm');
const fs = require('fs');
const log = require('../../utils/logger');
const mod = 'database';

exports.initDatabase = () => {
  const fun = 'initDatabase';
  try {
    fs.statSync(config.database.db_directory).isDirectory();
    const db = databaseManager.openOrCreateDB();
    databaseManager.close(db);
    initUsersTable.initUsersTable();
    initRolesTable.initRolesTable();
    initRolesTable.initUserRolesTable();
    initDefaultFormTable.initDefaultFormTable();
  } catch (error) {
    log.e(mod, fun, error);
    throw error;
  }
};
