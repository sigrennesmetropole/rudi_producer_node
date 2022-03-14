const axios = require('axios');
const config = require('../config/config');
const errorHandler = require('./errorHandler');
const utils = require('../utils/utils');

const serveur = `${config.API_RUDI.listening_address}`;
const api = `${config.API_RUDI.admin_api}`;

const contactList = (req, res, next) => {
  const url = `${api}/contacts`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, { params: req.query, headers: { Authorization: `Bearer ${token}` } })
    .then((resRUDI) => {
      const contacts = resRUDI.data;
      res.status(200).json(contacts);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_contacts' });
      res.status(501).json(error);
    });
};
exports.getContactById = (req, res, next) => {
  const { id } = req.params;
  const url = `${api}/contacts/${id}`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .get(`${serveur}${url}`, { params: req.query, headers: { Authorization: `Bearer ${token}` } })
    .then((resRUDI) => {
      const contact = resRUDI.data;
      res.status(200).json(contact);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_contact', id: `contact+${id}` });
      res.status(501).json(error);
    });
};

exports.postContact = (req, res, next) => {
  const url = `${api}/contacts`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .post(`${serveur}${url}`, req.body, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    .then((resRUDI) => {
      res.status(200).json(resRUDI.data);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'post_contact' });
      res.status(501).json(error);
    });
};
exports.putContact = (req, res, next) => {
  const url = `${api}/contacts`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .put(`${serveur}${url}`, req.body, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    .then((resRUDI) => {
      res.status(200).json(resRUDI.data);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, {
        opType: 'put_contact',
        id: `contact+${req.body.contact_id}`,
      });
      res.status(501).json(error);
    });
};
exports.deleteContact = (req, res, next) => {
  const { id } = req.params;
  const url = `${api}/contacts/${id}`;
  const token = utils.createRudiToken({
    url: url,
    req: req,
  });
  return axios
    .delete(`${serveur}${url}`, {
      params: req.query,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((resRUDI) => {
      const contact = resRUDI.data;
      res.status(200).json(contact);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'delete_contact', id: `contact+${id}` });
      res.status(501).json(error);
    });
};

module.exports.contactList = contactList;
