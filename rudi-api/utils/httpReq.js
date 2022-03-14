'use strict'

const mod = 'http'

// ------------------------------------------------------------------------------------------------
// External dependecies
// ------------------------------------------------------------------------------------------------
// const https = require('https')
// const http = require('http')
const axios = require('axios')

// ------------------------------------------------------------------------------------------------
// Internal dependecies
// ------------------------------------------------------------------------------------------------
const log = require('./logging')
const utils = require('./jsUtils')
const { RudiError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// Functions: header treatments
// ------------------------------------------------------------------------------------------------
exports.getHeaderRedirectUrls = (req) => {
  if (!req.headers) return
  return req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']
}

// ------------------------------------------------------------------------------------------------
// Functions: http requests
// ------------------------------------------------------------------------------------------------

exports.httpGet = async (destUrl, authorizationToken) => {
  const fun = 'httpGet'
  log.t(mod, fun, ``)
  try {
    const reqOpts = {
      headers: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await this.directGet(destUrl, reqOpts)
    // log.d(mod, fun, `answer: ${utils.beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.httpDelete = async (destUrl, authorizationToken) => {
  const fun = 'httpDelete'
  try {
    log.t(mod, fun, ``)

    const reqOpts = {
      headers: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await axios.delete(destUrl, reqOpts)
    log.d(mod, fun, `answer: ${utils.beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.getWithOpts = async (options, authorizationToken) => {
  const fun = 'getWithOpts'
  log.t(mod, fun, ``)
  try {
    const destUrl = `${options.protocol}://${options.hostname}/${options.path}`
    const answer = await this.httpGet(destUrl, authorizationToken)
    return answer.data
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.httpPost = async (destUrl, dataToSend, authorizationToken) => {
  const fun = 'httpPost'
  try {
    log.t(mod, fun, ``)
    const reqOpts = {
      headers: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await this.directPost(destUrl, dataToSend, reqOpts)

    log.d(mod, fun, `answer: ${utils.beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.httpPut = async (destUrl, dataToSend, authorizationToken) => {
  const fun = 'httpPut'
  try {
    log.t(mod, fun, ``)
    const reqOpts = {
      headers: {
        'User-Agent': 'Rudi-Producer',
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await this.directPut(destUrl, dataToSend, reqOpts)

    log.d(mod, fun, `answer: ${utils.beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.directGet = async (destUrl, reqOpts) => {
  const fun = 'directGet'
  log.t(mod, fun, ``)
  // log.d(mod, fun, `destUrl: ${destUrl}`)
  // if (reqOpts) reqOpts.httpsAgent = sslAgent
  // else reqOpts = { httpsAgent: sslAgent }
  try {
    const answer = await axios.get(destUrl, reqOpts)
    log.logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.directPost = async (destUrl, dataToSend, reqOpts) => {
  const fun = 'directPost'
  log.t(mod, fun, ``)
  // log.d(mod, fun, `${destUrl}`)
  // if (reqOpts) reqOpts.httpsAgent = sslAgent
  // else reqOpts = { httpsAgent: sslAgent }
  try {
    const answer = await axios.post(destUrl, dataToSend, reqOpts)
    log.logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    // log.w(mod, fun, utils.beautify(err) || err)
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

exports.directPut = async (destUrl, dataToSend, reqOpts) => {
  const fun = 'directPut'
  log.t(mod, fun, ``)
  // log.d(mod, fun, `${destUrl}`)
  // if (reqOpts) reqOpts.httpsAgent = sslAgent
  // else reqOpts = { httpsAgent: sslAgent }
  try {
    const answer = await axios.put(destUrl, dataToSend, reqOpts)
    log.logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    // log.w(mod, fun, utils.beautify(err) || err)
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

/* function doHttpRequest(options, protocol, data) {
  const fun = 'doHttpRequest'
  // log.t(mod, fun, ``)

  const httpProtocol = protocol === PROTOCOL.HTTP ? http : https
  // options.agent = new httpProtocol.Agent({rejectUnauthorized: false})
  log.d(mod, fun, `options: ${utils.beautify(options)}`)

  return new Promise((resolve, reject) => {
    const req = httpProtocol.request(options, (res) => {
      log.d(mod, fun, `statusCode: ${res.statusCode}`)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`statusCode: ${res.statusCode}`))
      }
      // res.setEncoding('utf8')
      let body = []

      res.on('data', (chunk) => {
        // log.d(mod, fun, `chunk: ${utils.beautify(chunk)}`)
        body.push(chunk)
      })

      res.on('end', () => {
        try {
          body = JSON.parse(Buffer.concat(body).toString())
        } catch (e) {
          log.w(mod, fun, e)
          // reject(e)
        }
        resolve(body)
      })
    })

    req.on('error', (err) => {
      log.w(mod, fun, `${err.stack} - ${utils.beautify(err)}`)
      reject(err)
    })

    if (data) req.write(data)

    req.end()
  })
}
 */
