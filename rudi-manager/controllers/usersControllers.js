const errorHandler = require('./errorHandler');
const databaseManager = require('../database/database');

const usersList = (req, res, next) => {
  databaseManager
    .getUsers()
    .then((rows) => {
      res.status(200).json(rows);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_users' });
      res.status(501).json(error);
    });
};
exports.getUserByUsername = (req, res, next) => {
  const { username } = req.params;
  databaseManager
    .getUserByUsername(username)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_user' });
      res.status(501).json(error);
    });
};
exports.deleteUser = (req, res, next) => {
  const { username } = req.params;
  databaseManager
    .deleteUser(username)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'delete_user' });
      res.status(501).json(error);
    });
};

module.exports.usersList = usersList;
