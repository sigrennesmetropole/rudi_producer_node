const passport = require('passport');
const bcrypt = require('bcrypt');
const databaseManager = require('../database/database');
const utils = require('../utils/utils');
const log = require('../utils/logger');
const mod = 'authController';

const registerUser = (data) => {
  const fun = 'registerUser';
  // TODO : throw error instead
  if (!data.password || !data.confirmPassword || data.password !== data.confirmPassword) return;
  return databaseManager
    .getUserByUsername(data.username)
    .then((user) => {
      // Create new User
      if (!user) {
        const newUser = { username: data.username, password: data.password, email: data.email };
        // Hash password before saving in database
        return bcrypt
          .genSalt(10)
          .then((salt) => {
            return bcrypt.hash(newUser.password, salt).then((hash) => {
              newUser.password = hash;
              return databaseManager.createUser(newUser).then((user) => {
                return user;
              });
            });
          })
          .catch((err) => {
            log.e(mod, fun, err);
            throw err;
          });
      } else {
        return Promise.reject(new Error(`User '${data.username}' already exists!`));
      }
    })
    .catch((err) => {
      log.e(mod, fun, err);
      throw err;
    });
};

exports.postLogin = (req, res, next) => {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return res.status(400).json({ errors: err });
    }
    if (!user) {
      return res.status(400).json({ errors: 'No user found' });
    }
    req.login(user, { session: false }, function (err) {
      if (err) {
        return res.status(400).json({ errors: err });
      }

      const { authToken, publicToken, exp } = utils.createToken(user);

      // sameSite: 'Lax' ?
      return res
        .status(200)
        .cookie('authToken', authToken, {
          secure: !!process.env.NODE_ENV,
          httpOnly: true,
          sameSite: 'Strict',
          expires: new Date(exp * 1000),
        })
        .cookie('publicToken', publicToken, {
          secure: !!process.env.NODE_ENV,
          httpOnly: false,
          expires: new Date(exp * 1000),
        })
        .json({
          success: `logged in ${user.username}`,
          token: publicToken,
          expires: new Date(exp * 1000),
        });
      // TODO : remove .json() for cookie only? or give refresh token instead
    });
  })(req, res, next);
};

exports.postRegister = (req, res, next) => {
  const fun = 'postRegister';
  try {
    const data = req.body;
    registerUser(data)
      .then((user) => {
        // TODO : send mail? random password? temp password? link to first password?
        res.json(user);
      })
      .catch((err) => {
        res.status(400).send(err.message);
      });
  } catch (err) {
    log.e(mod, fun, err);
    res.status(400).send(err);
  }
};
exports.postForgot = (req, res, next) => {
  const fun = 'postForgot';
  try {
    // TODO
  } catch (err) {
    log.e(mod, fun, err);
    throw err;
  }
};
exports.postReset = (req, res, next) => {
  const fun = 'postReset';
  try {
    // TODO
  } catch (err) {
    log.e(mod, fun, err);
    throw err;
  }
};

exports.logout = (req, res, next) => {
  res
    .status(200)
    .cookie('authToken', null, {
      secure: !!process.env.NODE_ENV,
      httpOnly: true,
      sameSite: 'Strict',
      expires: new Date(0),
    })
    .cookie('publicToken', null, {
      secure: !!process.env.NODE_ENV,
      httpOnly: false,
      expires: new Date(0),
    })
    .json({});
};
exports.getToken = (req, res, next) => {
  const { authToken, publicToken, exp } = utils.createToken(req.user);
  res
    .status(200)
    .cookie('authToken', authToken, {
      secure: !!process.env.NODE_ENV,
      httpOnly: true,
      sameSite: 'Strict',
      expires: new Date(exp * 1000),
    })
    .cookie('publicToken', publicToken, {
      secure: !!process.env.NODE_ENV,
      httpOnly: false,
      expires: new Date(exp * 1000),
    })
    .json({
      token: authToken,
      expires: new Date(exp * 1000),
    });
};

exports.registerUser = registerUser;
