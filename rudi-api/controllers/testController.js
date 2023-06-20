const mod = 'devCtrl'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { RudiError } from '../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// tests
// -------------------------------------------------------------------------------------------------
export const test = async (req, res) => {
  const fun = 'test'
  try {
    // const reqSearch = req.url.substring(req.url.indexOf('?'))
    // const searchParams = new URLSearchParams(reqSearch)
    // const rudiId = searchParams.get('id')
    // const objectType = searchParams.get('type')
    // logD(mod, fun, rudiId)

    // return await isReferencedInMetadata(objectType, rudiId)
    res.code(200).send({ oh: 'ok' })
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
