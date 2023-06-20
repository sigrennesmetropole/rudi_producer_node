// External dependecies
const axios = require('axios')

// Internal dependecies
const { getRudiApi, getAdminApi } = require('../config/config')
const errorHandler = require('./errorHandler')
const { createRudiApiToken } = require('../utils/secu')

// Helper functions
const callApiModule = (req, reply, url, opType) => {
  const token = createRudiApiToken(url, req)
  const completeUrl = new URL(url, getRudiApi())
  if (req.query) completeUrl.search = new URLSearchParams(req.query)

  // console.log(
  //   'T (callApiModule) completeUrl',
  //   { baseUrl: API_MODULE_URL, url, params: req.query },
  //   '->',
  //   `${completeUrl}`
  // )
  return axios
    .get(`${completeUrl}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      const results = res.data
      reply.status(200).send(results)
    })
    .catch((err) => {
      try {
        const error = errorHandler.error(err, req, { opType })
        reply.status(error.statusCode).json(error)
      } catch (error) {
        err.statusCode = !err.statusCode || isNaN(err.statusCode) ? 500 : err.statusCode
        try {
          reply.status(err.statusCode).send('An error occurred:' + (error.message || error.msg))
        } catch (e) {
          console.error(e)
        }
      }
    })
}

// Controllers

exports.getVersion = (req, res) => callApiModule(req, res, '/api/version', 'get_version')
exports.getEnum = (req, res) => callApiModule(req, res, getAdminApi('enum'), 'get_enum')
exports.getLicences = (req, res) => callApiModule(req, res, getAdminApi('licences'), 'get_licences')

exports.getThemeByLang = (req, res) =>
  callApiModule(req, res, getAdminApi(`enum/themes/${req.params?.lang}`), 'get_theme_by_lang')

exports.getApiExternalUrl = (req, res) =>
  callApiModule(req, res, getAdminApi('check/node/url'), 'get_api_url')
