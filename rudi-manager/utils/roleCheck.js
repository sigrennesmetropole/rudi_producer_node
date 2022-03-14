const databaseManager = require('../database/database');
const log = require('./logger');
const mod = 'utils';

exports.checkRolePerm = (role) => (req, res, next) => {
  const fun = 'checkRolePerm';
  const { username } = req.user;
  databaseManager
    .getUserRolesByUsername(username)
    .then((rows) => {
      if (rows.findIndex((elem) => elem.role === role || elem.role === 'SuperAdmin') >= 0) {
        next();
      } else {
        log.w(mod, fun, `Forbidden access by ${username} at ${req.method} ${req.url}`);
        log.sysWarn(
          mod,
          fun,
          `Forbidden access by ${username} at ${req.method} ${req.url}`,
          log.getContext(req, { opType: 'get_hash', statusCode: 403 }),
        );
        res.status(403).json('Forbidden');
      }
    })
    .catch((err) => {
      log.e(mod, fun, err);
      next(new Error('Not Authorize'));
    });
};
