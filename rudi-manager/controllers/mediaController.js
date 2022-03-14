const axios = require('axios');
const config = require('../config/config');
const errorHandler = require('./errorHandler');

exports.getMediaById = (req, res, next) => {
  const { id } = req.params;
  const serveurMedia = `${config.API_RUDI.media_api}`;
  return axios
    .get(serveurMedia + '/' + id)
    .then((resRUDI) => {
      const results = resRUDI.data;
      res.status(200).json(results);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_media', id: `media+${id}` });
      res.status(501).json(error);
    });
};

// Deprecated ? now use direct access
exports.getDownloadById = (req, res, next) => {
  const { id } = req.params;
  const serveurMedia = `${config.API_RUDI.media_api}`;
  return axios
    .get(serveurMedia + '/' + id, {
      headers: { 'media-access-method': 'Direct', 'media-access-compression': true },
    })
    .then((resRUDI) => {
      const results = resRUDI.data;
      res.status(200).contentType(resRUDI.headers['content-type']).json(results);
    })
    .catch((error) => {
      error = errorHandler.error(error, req, { opType: 'get_download', id: `media+${id}` });
      res.status(501).json(error);
    });
};
