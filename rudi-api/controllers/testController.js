'use strict'

const mod = 'devCtrl'

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')
const db = require('../db/dbQueries')
const { treatError } = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// tests
// ------------------------------------------------------------------------------------------------
exports.test = async (req, reply) => {
  const fun = 'test'
  try {
    const reqSearch = req.url.substring(req.url.indexOf('?'))
    const searchParams = new URLSearchParams(reqSearch)
    const rudiId = searchParams.get('id')
    const objectType = searchParams.get('type')
    log.d(mod, fun, rudiId)

    return await db.isReferencedInMetadata(objectType, rudiId)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
