const mod = 'http'

// -------------------------------------------------------------------------------------------------
// External dependecies
// -------------------------------------------------------------------------------------------------
import axios from 'axios'

// -------------------------------------------------------------------------------------------------
// Debug axios
// -------------------------------------------------------------------------------------------------
// if (getEnvironment() === ENV_LOCAL) {
//   const AxiosCurlirize = await import('axios-curlirize')
//   AxiosCurlirize(axios)
// }
// -------------------------------------------------------------------------------------------------
// Internal dependecies
// -------------------------------------------------------------------------------------------------
import { USER_AGENT } from '../config/confApi.js'
// import { ENV_LOCAL } from '../config/appOptions.js'
import { beautify } from './jsUtils.js'
// import { getEnvironment } from '../controllers/sysController.js'
import { logD, logHttpAnswer, logT } from './logging.js'
import { RudiError, BadRequestError } from './errors.js'

// -------------------------------------------------------------------------------------------------
// Functions: header treatments
// -------------------------------------------------------------------------------------------------
export const getHeaderRedirectUrls = (req) => {
  if (!req.headers) return
  return req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']
}

// -------------------------------------------------------------------------------------------------
// Functions: extracting URL parameters (after the quote sign)
// -------------------------------------------------------------------------------------------------
export const getUrlParameters = (reqUrl) => {
  const fun = 'getUrlParameters'
  try {
    logT(mod, fun, ``)
    const splitUrl = reqUrl.split('?')
    if ((splitUrl.length = 1 || !splitUrl[1])) return // No parameters found
    if (splitUrl.length > 2)
      throw new BadRequestError('Wrong URL, quote character used several times')

    const extractedUrlParameters = []
    const urlParameterSections = splitUrl[1].split('&')
    urlParameterSections.map((paramSection) => {
      const keyVal = paramSection.split('=')
      if (keyVal.length === 0) return // Empty section
      if (keyVal.length === 1 && !!keyVal[0]) extractedUrlParameters.push(keyVal)
      if (keyVal.length === 2) extractedUrlParameters.push({ [keyVal[0]]: keyVal[1] })
      if (keyVal.length === 3) return // Badly formed section
    })
    return extractedUrlParameters
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Functions: http requests
// -------------------------------------------------------------------------------------------------

export const httpGet = async (destUrl, authorizationToken) => {
  const fun = 'httpGet'
  logT(mod, fun, ``)
  try {
    const reqOpts = {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await directGet(destUrl, reqOpts)
    // logD(mod, fun, `answer: ${beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

export const httpDelete = async (destUrl, authorizationToken) => {
  const fun = 'httpDelete'
  try {
    logT(mod, fun, ``)

    const reqOpts = {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await axios.delete(destUrl, reqOpts)
    logD(mod, fun, `answer: ${beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

export const getWithOpts = async (options, authorizationToken) => {
  const fun = 'getWithOpts'
  logT(mod, fun, ``)
  try {
    const destUrl = `${options.protocol}://${options.hostname}/${options.path}`
    const answer = await httpGet(destUrl, authorizationToken)
    return answer.data
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const httpPost = async (destUrl, dataToSend, authorizationToken) => {
  const fun = 'httpPost'
  try {
    logT(mod, fun, ``)
    const reqOpts = {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await directPost(destUrl, dataToSend, reqOpts)

    logD(mod, fun, `answer: ${beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const httpPut = async (destUrl, dataToSend, authorizationToken) => {
  const fun = 'httpPut'
  try {
    logT(mod, fun, ``)
    const reqOpts = {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
    }
    if (authorizationToken) reqOpts.headers.Authorization = `Bearer ${authorizationToken}`

    const answer = await directPut(destUrl, dataToSend, reqOpts)

    logD(mod, fun, `answer: ${beautify(answer.data)}`)
    return answer.data
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// AxiosCurlirize(axios, (result, err) => {
//   const fun = 'AxiosCurlirize'
//   const { command } = result
//   if (err) {
//     logE(mod, fun, err)
//     throw RudiError.treatCommunicationError(mod, fun, err)
//   } else {
//     logT(mod, fun, command)
//     return result
//     // use your logger here
//   }
// })

export const directGet = async (destUrl, reqOpts) => {
  const fun = 'directGet'
  try {
    logT(mod, fun, ``)

    const answer = await axios.get(destUrl, reqOpts)

    logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

export const directPost = async (destUrl, dataToSend, reqOpts) => {
  const fun = 'directPost'
  logT(mod, fun, ``)

  try {
    const answer = await axios.post(destUrl, dataToSend, reqOpts)
    logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    // logW(mod, fun, beautify(err) || err)
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

export const directPut = async (destUrl, dataToSend, reqOpts) => {
  const fun = 'directPut'
  logT(mod, fun, ``)
  try {
    const answer = await axios.put(destUrl, dataToSend, reqOpts)
    logHttpAnswer(mod, fun, answer)
    return answer
  } catch (err) {
    // logW(mod, fun, beautify(err) || err)
    throw RudiError.treatCommunicationError(mod, fun, err)
  }
}

/* function doHttpRequest(options, protocol, data) {
  const fun = 'doHttpRequest'
  // logT(mod, fun, ``)

  const httpProtocol = protocol === PROTOCOL.HTTP ? http : https
  // options.agent = new httpProtocol.Agent({rejectUnauthorized: false})
  logD(mod, fun, `options: ${beautify(options)}`)

  return new Promise((resolve, reject) => {
    const req = httpProtocol.request(options, (res) => {
      logD(mod, fun, `statusCode: ${res.statusCode}`)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`statusCode: ${res.statusCode}`))
      }
      // res.setEncoding('utf8')
      let body = []

      res.on('data', (chunk) => {
        // logD(mod, fun, `chunk: ${beautify(chunk)}`)
        body.push(chunk)
      })

      res.on('end', () => {
        try {
          body = JSON.parse(Buffer.concat(body).toString())
        } catch (e) {
          logW(mod, fun, e)
          // reject(e)
        }
        resolve(body)
      })
    })

    req.on('error', (err) => {
      logW(mod, fun, `${err.stack} - ${beautify(err)}`)
      reject(err)
    })

    if (data) req.write(data)

    req.end()
  })
}
 */
