const mod = 'consoleCtrl'

// Internal dependencies
const { getConsoleFormUrl } = require('../config/config')
const log = require('../utils/logger')
const { UnauthorizedError } = require('../utils/errors')
const { getPortalUrl, getApiExternalUrl } = require('./dataController')
const { handleError } = require('./errorHandler')

exports.getNodeUrls = async (req, reply) => {
  const fun = 'getNodeUrls'
  try {
    const urls = await Promise.all([getConsoleFormUrl(), getApiExternalUrl(), getPortalUrl()])
    const nodeUrls = { console_url: urls[0], api_url: urls[1] }
    if (urls[2] != 'No portal connected') nodeUrls['portal_url'] = urls[2]

    return reply.status(200).send(nodeUrls)
  } catch (err) {
    log.sysError(mod, fun, err, log.getContext(req, { opType: 'get_node_urls' }))
    handleError(req, reply, err, 404, fun)
  }
}

// Controllers
exports.getFormUrl = (req, reply) => {
  try {
    reply.status(200).send(getConsoleFormUrl())
  } catch (err) {
    log.e('', '', err)
    log.sysError(mod, 'getFormUrl', err, log.getContext(req, { opType: 'get_form_url' }))
    throw err
  }
}

// Controllers
exports.getPortalConnection = (req, reply) => {
  try {
    reply.status(200).send(getPortalUrl())
  } catch (err) {
    log.e('', '', err)
    log.sysError(mod, 'getPortalConnection', err, log.getContext(req, { opType: 'get_portal_url' }))
    throw err
  }
}

exports.getUserInfo = (req, reply) => {
  const user = req.user
  if (!user) return reply.status(401).send(new UnauthorizedError('User info not available'))
  const { username, roles } = user
  return reply.status(200).json({ username, roles })
}
