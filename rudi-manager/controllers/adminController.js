const axios = require('axios');
const config = require('../config/config');
const errorHandler = require('./errorHandler');
const utils = require('../utils/utils');
const databaseManager = require('../database/database');

const serveur = `${config.API_RUDI.listening_address}`;
const api = `${config.API_RUDI.admin_api}`;

exports.getEnum = (req, res, next) => {
  const url = `${api}/enum`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRUDI) => {
      const results = resRUDI.data;
      res.status(200).json(results);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_enum' });
      res.status(501).json(error);
    });
};
exports.getThemeByLang = (req, res, next) => {
  const { lang } = req.params;
  const url = `${api}/enum/themes/${lang}`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((resRUDI) => {
      const results = resRUDI.data;
      res.status(200).json(results);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_theme_by_lang' });
      res.status(501).json(error);
    });
};
exports.getLicences = (req, res, next) => {
  const url = `${api}/licences`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((resRUDI) => {
      const results = resRUDI.data;
      res.status(200).json(results);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_licences' });
      res.status(501).json(error);
    });
};

// Default Value for formulaire
exports.getDefaultForm = (req, res, next) => {
  const user = req.user;
  return databaseManager
    .getDefaultForm(user)
    .then((rows) => {
      res.status(200).json(rows);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'get_defaultForm' });
      res.status(501).json(error);
    });
};
exports.deleteDefaultForm = (req, res, next) => {
  const user = req.user;
  const { name } = req.params;
  return databaseManager
    .deleteDefaultForm(user, name)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'delete_defaultForm' });
      res.status(501).json(error);
    });
};
exports.putDefaultForm = (req, res, next) => {
  const data = req.body;
  const user = req.user;

  return databaseManager
    .updateDefaultForm(user, data)
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((err) => {
      error = errorHandler.error(err, req, { opType: 'put_defaultForm' });
      res.status(501).json(error);
    });
};

exports.getVersion = (req, res, next) => {
  const url = `/api/version`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRUDI) => {
      const reports = resRUDI.data;
      res.status(200).send(reports);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_version' });
      res.status(501).json(error);
    });
};
