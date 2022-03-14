const sqlite3 = require('sqlite3').verbose();
const Promise = require('bluebird');
const config = require('../config/config');
const log = require('../utils/logger');
const mod = 'database';

const open = function () {
  const fun = 'open';
  const db = new sqlite3.Database(
    `${config.database.db_directory}/rudy_manager.db`,
    sqlite3.OPEN_READWRITE,
    (err) => {
      if (err) {
        log.e(mod, fun, err);
        log.e(mod, fun, err.message);
      } else {
      }
    },
  );
  return db.exec('PRAGMA foreign_keys = ON');
};
const close = function (db) {
  const fun = 'close';
  db.close((err) => {
    if (err) {
      log.e(mod, fun, err.message);
    }
  });
};

exports.getUserByUsername = (username) => {
  const fun = 'getUserByUsername';
  const db = open();
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Users WHERE username = ?`, [username], function (err, row) {
      if (err) {
        log.e(mod, fun, err.message);
        reject(err);
      } else {
        resolve(row);
      }
      close(db);
    });
  });
};
exports.getUsers = () => {
  const fun = 'getUsers';
  const db = open();
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT Users.id, Users.username, Users.email, GROUP_CONCAT(User_Roles.role) AS roles ' +
        'FROM Users LEFT JOIN User_Roles ON User_Roles.userId = Users.id ' +
        'GROUP BY Users.id;',
      function (err, rows) {
        if (err) {
          log.e(mod, fun, err.message);
          reject(err);
        } else {
          const result = rows.map((row) => {
            if (row.roles) {
              row.roles = row.roles.split(',');
            }
            return row;
          });
          resolve(result);
        }
        close(db);
      },
    );
  });
};
exports.createUser = (user) => {
  const fun = 'createUser';
  const db = open();
  return new Promise((resolve, reject) => {
    db.serialize(function () {
      db.run(
        `INSERT INTO Users(username,password,email) VALUES(?,?,?)`,
        [user.username, user.password, user.email],
        function (err) {
          if (err) {
            log.e(mod, fun, err.message);
            reject(err);
          } else {
            log.i(
              mod,
              fun,
              `Users : A row has been inserted with rowid ${this.lastID}`,
              log.getContext(null, { opType: 'post_user' }),
            );
            const id = this.lastID;

            // TODO : replace by count SELECT COUNT (*) FROM Users;
            db.get(
              `SELECT COUNT (*) FROM User_Roles WHERE role = ?`,
              ['SuperAdmin'],
              function (err, result) {
                if (err) {
                  log.e(mod, fun, err.message);
                  reject(err);
                } else {
                  if (result && result['COUNT (*)'] < 1) {
                    createUserRole({ userId: id, role: 'SuperAdmin' })
                      .then(() => {
                        resolve({ id: this.lastID, username: user.username });
                      })
                      .catch((err) => {
                        log.e(mod, fun, err.message);
                        reject(err);
                      });
                  } else {
                    resolve({ id: this.lastID, username: user.username });
                  }
                }
              },
            );
          }
          close(db);
        },
      );
    });
  });
};
exports.deleteUser = (username) => {
  const fun = 'deleteUser';
  const db = open();
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM Users WHERE username = ?`, [username], function (err) {
      if (err) {
        log.e(mod, fun, err.message);
        reject(err);
      } else {
        log.i(
          mod,
          fun,
          `Users : A row has been deleted with username ${username}`,
          log.getContext(null, { opType: 'delete_user' }),
        );
        resolve({ username: username });
      }
      close(db);
    });
  });
};

// ROLES
exports.createRoles = (roles) => {
  const fun = 'createRoles';
  const db = open();
  return new Promise((resolve, reject) => {
    db.serialize(function () {
      roles.forEach((role) => {
        db.run(`INSERT INTO Roles(role,desc) VALUES(?,?)`, [role.role, role.desc], function (err) {
          if (err) {
            log.e(mod, fun, err.message);
            reject(err);
          } else {
            log.i(
              mod,
              fun,
              `Roles : A row has been inserted with name ${role.role}`,
              log.getContext(null, { opType: 'add_role' }),
            );
          }
        });
      });
      resolve({ roles });
      close(db);
    });
  });
};
exports.getRoles = () => {
  const fun = 'getRoles';
  const db = open();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Roles', function (err, rows) {
      if (err) {
        log.e(mod, fun, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
      close(db);
    });
  });
};
exports.getRoleById = (role) => {
  const fun = 'getRoleById';
  const db = open();
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Roles WHERE role = ?`, [role], function (err, row) {
      if (err) {
        log.e(mod, fun, err.message);
        reject(err);
      } else {
        resolve(row);
      }
      close(db);
    });
  });
};
exports.getUserRolesByUsername = (username) => {
  const fun = 'getUserRolesByUsername';
  return this.getUserByUsername(username)
    .then((user) => {
      if (user) {
        const db = open();
        return new Promise((resolve, reject) => {
          db.all(`SELECT * FROM User_Roles WHERE userId = ?`, [user.id], function (err, rows) {
            if (err) {
              log.e(mod, fun, err.message);
              reject(err);
            } else {
              resolve(rows);
            }
            close(db);
          });
        });
      } else {
        return Promise.reject(new Error(`User ${username} not found!`));
      }
    })
    .catch((err) => {
      log.e(mod, fun, err);
      throw err;
    });
};
exports.deleteUserRole = (userId, role) => {
  const fun = 'deleteUserRole';
  const db = open();
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM User_Roles WHERE userId = ? AND role = ?`, [userId, role], function (err) {
      if (err) {
        log.e(mod, fun, err.message);
        reject(err);
      } else {
        log.i(
          mod,
          fun,
          `User_Roles : A row has been deleted with userId ${userId} and role ${role}`,
          log.getContext(null, { opType: 'delete_userRole' }),
        );
        resolve({ userId, role });
      }
      close(db);
    });
  });
};

const createUserRole = (userRole) => {
  const fun = 'createUserRole';
  const db = open();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO User_Roles(userId,role) VALUES(?,?)`,
      [userRole.userId, userRole.role],
      function (err) {
        if (err) {
          log.e(mod, fun, err.message);
          reject(err);
        } else {
          log.i(
            mod,
            fun,
            `User_Roles : A row has been inserted with userId ${userRole.userId} and role ${userRole.role}`,
            log.getContext(null, { opType: 'post_userRole' }),
          );
          resolve(userRole);
        }
        close(db);
      },
    );
  });
};
exports.createUserRole = createUserRole;

// Default Form
exports.getDefaultForm = (user) => {
  const fun = 'getDefaultForm';
  if (user) {
    const db = open();
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM Default_Value_Form WHERE userId = ?`, [user.id], function (err, rows) {
        if (err) {
          log.e(mod, fun, err.message);
          reject(err);
        } else {
          resolve(
            rows.map((row) => {
              return { name: row.name, defaultValue: JSON.parse(row.defaultValue) };
            }),
          );
        }
        close(db);
      });
    });
  } else {
    return Promise.reject(new Error(`Default value for ${user.username} not found!`));
  }
};
exports.getDefaultFormWithName = (user, name) => {
  const fun = 'getDefaultFormWithName';
  if (user) {
    const db = open();
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Default_Value_Form WHERE userId = ? and name = ?`,
        [user.id, name],
        function (err, row) {
          if (err) {
            log.e(mod, fun, err.message);
            reject(err);
          } else {
            resolve(JSON.parse(row.defaultValue));
          }
          close(db);
        },
      );
    });
  } else {
    return Promise.reject(
      new Error(`Default value for ${user.username} and name : ${name} not found!`),
    );
  }
};
exports.deleteDefaultForm = (user, name) => {
  const fun = 'deleteDefaultForm';
  const db = open();
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM Default_Value_Form WHERE userId = ? AND name = ?`,
      [user.id, name],
      function (err) {
        if (err) {
          log.e(mod, fun, err.message);
          reject(err);
        } else {
          log.i(
            mod,
            fun,
            `Default_Value_Form : A row has been deleted with userId ${user.id} and name : ${name}`,
            log.getContext(null, { opType: 'delete_defaultForm' }),
          );
          resolve({});
        }
        close(db);
      },
    );
  });
};

exports.updateDefaultForm = (user, data) => {
  const fun = 'updateDefaultForm';
  return this.getDefaultFormWithName(user, data.name).then((defaultValue) => {
    const db = open();
    if (!defaultValue) {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO Default_Value_Form(userId,name,defaultValue) VALUES(?,?,?)`,
          [user.id, data.name, JSON.stringify(data.defaultValue)],
          function (err) {
            if (err) {
              log.e(mod, fun, err.message);
              reject(err);
            } else {
              log.i(
                mod,
                fun,
                `Default_Value_Form : A row has been inserted with userId ${user.id} and name : ${data.name}`,
                log.getContext(null, { opType: 'post_defaultForm' }),
              );
              resolve(data);
            }
            close(db);
          },
        );
      });
    } else {
      // edit
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE Default_Value_Form SET defaultValue = ? WHERE userId = ? and name = ?`,
          [JSON.stringify(data.defaultValue), user.id, data.name],
          function (err) {
            if (err) {
              log.e(mod, fun, err.message);
              reject(err);
            } else {
              log.i(
                mod,
                fun,
                `Default_Value_Form : A row has been edited with userId ${user.id} and name : ${data.name}`,
                log.getContext(null, { opType: 'put_defaultForm' }),
              );
              resolve(data);
            }
            close(db);
          },
        );
      });
    }
  });
};

// OTHER
exports.open = open;
exports.close = close;
exports.openOrCreateDB = () => {
  const fun = 'openOrCreateDB';
  return new sqlite3.Database(`${config.database.db_directory}/rudy_manager.db`, (err) => {
    if (err) {
      log.e(mod, fun, err);
    }
    log.v(mod, fun, 'Creation of (or Connected to) the rudy_manager database.');
  });
};
