const errorHandler = require('./errorHandler');
const databaseManager = require('../database/database');

const roleList = (req, res, next) => {
  return databaseManager
    .getRoles()
    .then((rows) => {
      res.status(200).json(rows);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_roles' });
      res.status(501).json(error);
    });
};
exports.getRoleById = (req, res, next) => {
  const { role } = req.params;
  return databaseManager
    .getRoleById(role)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_role' });
      res.status(501).json(error);
    });
};

// User_Roles
exports.getUserRolesByUsername = (req, res, next) => {
  const { username } = req.params;
  return databaseManager
    .getUserRolesByUsername(username)
    .then((rows) => {
      res.status(200).json(rows);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_userRole' });
      res.status(501).json(error);
    });
};
exports.deleteUserRole = (req, res, next) => {
  const { userId, role } = req.params;
  return databaseManager
    .deleteUserRole(userId, role)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'delete_userRole' });
      res.status(501).json(error);
    });
};
exports.postUserRole = (req, res, next) => {
  const data = req.body;
  return databaseManager
    .createUserRole(data)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'post_userRole' });
      res.status(501).json(error);
    });
};

module.exports.roleList = roleList;
