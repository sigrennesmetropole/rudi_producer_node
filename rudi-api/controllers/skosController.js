const mod = 'skosCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the thesaurus
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  PARAM_THESAURUS_CODE,
  PARAM_THESAURUS_LANG,
  URL_PV_THESAURUS_ACCESS,
  USER_AGENT,
} from '../config/constApi.js'

import {
  API_CONCEPT_CHILDREN_PROPERTY,
  API_CONCEPT_CLASS_PROPERTY,
  API_CONCEPT_PARENTS_PROPERTY,
  API_CONCEPT_RELATIVE_PROPERTY,
  API_CONCEPT_SIBLINGS_PROPERTY,
  API_SCHEME_TOPS_PROPERTY,
  API_SKOS_CONCEPT_CODE,
  API_SKOS_CONCEPT_ID,
  API_SKOS_SCHEME_CODE,
  API_SKOS_SCHEME_ID,
  DB_ID,
  LicenceTypes,
} from '../db/dbFields.js'

const PROPERTIES_WITH_CONCEPT_REFS = [
  API_CONCEPT_PARENTS_PROPERTY,
  API_CONCEPT_CHILDREN_PROPERTY,
  API_CONCEPT_SIBLINGS_PROPERTY,
  API_CONCEPT_RELATIVE_PROPERTY,
]

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import {
  beautify,
  deepClone,
  isNotEmptyArray,
  isNotEmptyObject,
  toPaddedBase64url,
} from '../utils/jsUtils.js'

import { getSkosmosConf } from '../config/confSystem.js'
import { accessProperty, accessReqParam } from '../utils/jsonAccess.js'
import { logD, logE, logT, logW, sysAlert } from '../utils/logging.js'

import {
  BadRequestError,
  NotFoundError,
  ParameterExpectedError,
  RudiError,
} from '../utils/errors.js'

import {
  getConceptDbIdWithRudiId,
  getConceptWithJson,
  getEnsuredSchemeDbIdWithRudiId,
} from '../db/dbQueries.js'

import { directGet } from '../utils/httpReq.js'

// -------------------------------------------------------------------------------------------------
// Thesauri
// -------------------------------------------------------------------------------------------------
import { get as getEncodings } from '../definitions/thesaurus/Encodings.js'
import { getExtensions, get as getFileTypes } from '../definitions/thesaurus/FileTypes.js'
import { get as getHashAlgorithms } from '../definitions/thesaurus/HashAlgorithms.js'
import Keywords from '../definitions/thesaurus/Keywords.js'
import { get as getLanguages } from '../definitions/thesaurus/Languages.js'
import { get as getProjections } from '../definitions/thesaurus/Projections.js'
import { get as getStorageStatus } from '../definitions/thesaurus/StorageStatus.js'
import Themes from '../definitions/thesaurus/Themes.js'

// -------------------------------------------------------------------------------------------------
// Controllers
// -------------------------------------------------------------------------------------------------
import { getLicenceCodes } from './licenceController.js'

// -------------------------------------------------------------------------------------------------
// Data models
// -------------------------------------------------------------------------------------------------
import { InterfaceContract } from '../definitions/models/Media.js'
import SkosConcept from '../definitions/models/SkosConcept.js'
import SkosScheme from '../definitions/models/SkosScheme.js'

// -------------------------------------------------------------------------------------------------
// Controllers: Scheme
// -------------------------------------------------------------------------------------------------

/**
 * Creation of a new Scheme.
 * This is made in two times: first we create the Scheme without the
 * "top concepts" references.
 * Then we can create the referenced concepts, and update the Scheme.
 * @param {JSON description of a new SKOS Scheme in RUDI system} rudiScheme
 * @returns
 */
export const newSkosScheme = async (rudiScheme) => {
  const fun = 'newScheme'
  try {
    logT(mod, fun)

    if (!rudiScheme) throw new ParameterExpectedError('rudiScheme', mod, fun)

    const topConcepts = await deepClone(rudiScheme[API_SCHEME_TOPS_PROPERTY])

    delete rudiScheme[API_SCHEME_TOPS_PROPERTY]

    const dbReadySchemeNoRef = new SkosScheme(rudiScheme)
    const dbScheme = await dbReadySchemeNoRef.save()

    const schemeDbId = dbScheme[DB_ID]

    if (isNotEmptyArray(topConcepts)) {
      dbScheme[API_SCHEME_TOPS_PROPERTY] = await createConceptHierarchy(topConcepts, schemeDbId)
    }
    // TODO: reinforce the associations between concepts through siblings/relative properties
    await dbScheme.save()

    return await dbSchemeToRudi(dbScheme)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const CONCEPT_HIERARCHY_DISPLAY = `${API_SKOS_CONCEPT_ID} ${API_SKOS_CONCEPT_CODE} ${API_CONCEPT_CHILDREN_PROPERTY}` // -${DB_ID}

export const dbSchemeToRudi = async (dbScheme) => {
  const fun = 'dbSchemeToRudi'
  logT(mod, fun)

  // logD(mod, fun, `dbScheme: ${beautify(dbScheme)}`)

  const rudiScheme = await dbScheme.populate([
    {
      path: API_SCHEME_TOPS_PROPERTY,
      select: CONCEPT_HIERARCHY_DISPLAY,
    },
  ])
  // .execPopulate()

  rudiScheme[API_SCHEME_TOPS_PROPERTY] = await dbConceptListToRudiRecursive(
    rudiScheme[API_SCHEME_TOPS_PROPERTY]
  )
  // logD(mod, fun, `rudiScheme: ${rudiScheme}`)

  return rudiScheme
}
/**
 * Create every concept in the hierarchy if they are not created yet.
 * These informations are changed if not set properly:
 * - Update the "SchemeClass" property to the current Scheme
 * - Follows the "children" (narrower) links and make sure "parents" (broader)
 * are updated accordingly.
 * Siblings and Relatives are not created through this operation.
 * @param {The list of top concepts} topConcepts
 * @param {The current Scheme class object ID} schemeDbId
 * @returns
 */
export const createConceptHierarchy = async (listConcepts, schemeDbId, parentConcept) => {
  const fun = 'createConceptHierarchy'
  try {
    // logT(mod, fun)
    // Check input parameters
    if (!listConcepts) throw new ParameterExpectedError('listConcepts', mod, fun)
    if (!schemeDbId) throw new ParameterExpectedError('schemeDbId', mod, fun)

    // Create all concept in the list
    const conceptDbIds = []
    await Promise.all(
      listConcepts.map(async (conceptJson) => {
        let dbConcept = getConceptWithJson(conceptJson)
        // logD(mod, fun, `dbConcept: ${beautify(dbConcept)}`)

        if (isNotEmptyObject(dbConcept)) {
          // logD(mod, fun, `Concept already created: ${beautify(dbConcept[API_SKOS_CONCEPT_ID])} `)
        } else {
          // logD(mod, fun, `Creating new concept: ${conceptJson[API_SKOS_CONCEPT_ID]} `)

          // Backup reference lists
          let conceptChildren = []
          if (isNotEmptyArray(conceptJson[API_CONCEPT_CHILDREN_PROPERTY])) {
            conceptChildren = deepClone(conceptJson[API_CONCEPT_CHILDREN_PROPERTY])
          }

          // Remove references to other concepts
          PROPERTIES_WITH_CONCEPT_REFS.forEach((propertyReferencingOtherconcepts) => {
            delete conceptJson[propertyReferencingOtherconcepts]
          })

          // Ensure the current scheme is the one referenced in the class property
          conceptJson[API_CONCEPT_CLASS_PROPERTY] = schemeDbId

          // Create concept without references
          // logD(mod, fun, `Saving the new Concept`)
          // logD(mod, fun, `conceptJson: ${beautify(conceptJson)}`)
          dbConcept = new SkosConcept(conceptJson)
          await dbConcept.save()
          // logD(mod, fun, `=> done`)
          const conceptDbId = dbConcept[DB_ID]

          conceptDbIds.push(conceptDbId)

          // Update children property
          if (isNotEmptyArray(conceptChildren)) {
            // Create each children hierarchy
            const childrenDbIds = await createConceptHierarchy(
              conceptChildren,
              schemeDbId,
              conceptDbId
            )
            dbConcept[API_CONCEPT_CHILDREN_PROPERTY] = childrenDbIds
          }

          // logD(mod, fun, `${beautify(conceptJson)} -> ${conceptDbId}`)
        }

        // Update parents property
        if (!parentConcept) {
          delete dbConcept[API_CONCEPT_PARENTS_PROPERTY]
        } else {
          const parents = dbConcept[API_CONCEPT_PARENTS_PROPERTY]
          // logD(mod, fun, `Updating 'parents' property`)
          if (!isNotEmptyArray(parents)) {
            // logD(mod, fun, `dbConcept[API_CONCEPT_PARENTS_PROPERTY]: ${beautify(dbConcept[API_CONCEPT_PARENTS_PROPERTY])}`)
            dbConcept[API_CONCEPT_PARENTS_PROPERTY] = []
          }
          if (parents.indexOf(parentConcept) === -1) {
            dbConcept[API_CONCEPT_PARENTS_PROPERTY].push(parentConcept)
          }
        }
        try {
          await dbConcept.save()
        } catch (err) {
          throw RudiError.treatError(mod, fun, err)
        }
      })
    )
    return conceptDbIds
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Controllers: Concept
// -------------------------------------------------------------------------------------------------

/**
 * Creates a concept in DB from a Concept in RUDI format,
 * that references an existing scheme through its RUDI ID
 */
export const newSkosConcept = async (rudiConcept, inSchemeDbId) => {
  const fun = 'newConcept'
  try {
    logT(mod, fun)

    await setDbScheme(rudiConcept, inSchemeDbId)

    // Scanning every property with concept references
    await Promise.all(
      PROPERTIES_WITH_CONCEPT_REFS.map(async (prop) => {
        await setDbConceptRefs(rudiConcept, prop)
      })
    )

    const dbConcept = new SkosConcept(rudiConcept)
    // logD(mod, fun, `dbConcept: ${beautify(dbConcept)}`)
    await dbConcept.save()
    // logD(mod, fun, `=> saved`)

    const rudiReadyConcept = await dbConceptToRudiMinimal(dbConcept)
    return rudiReadyConcept
    // return dbConcept
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

/**
 *
 * @param {SKOS concept in RUDI format} rudiConcept
 * @param {*} inSchemeDbId
 * @returns
 */
export const setDbScheme = async (rudiConcept, inSchemeDbId) => {
  const fun = 'setDbScheme'
  try {
    logT(mod, fun)

    let schemeDbId
    if (!inSchemeDbId) {
      // Retrieveing Scheme information
      const conceptScheme = accessProperty(rudiConcept, API_CONCEPT_CLASS_PROPERTY)
      schemeDbId = rudiConcept[API_CONCEPT_CLASS_PROPERTY][DB_ID]
      if (!schemeDbId) {
        const schemeRudiId = accessProperty(conceptScheme, API_SKOS_SCHEME_ID)
        schemeDbId = await getEnsuredSchemeDbIdWithRudiId(schemeRudiId)
      }
      // logD(mod, fun, `schemeDbId: ${schemeDbId}`)
    } else {
      // logD(mod, fun, `inSchemeDbId: ${inSchemeDbId}`)
      schemeDbId = inSchemeDbId
    }
    rudiConcept[API_CONCEPT_CLASS_PROPERTY] = schemeDbId
    return schemeDbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
export const getDbIdForConceptCode = async (conceptRudiId) => {
  const fun = 'getDbIdForConceptCode'
  try {
    logT(mod, fun)
    const conceptDbId = await getConceptDbIdWithRudiId(conceptRudiId)
    return conceptDbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const setDbConceptRefs = async (rudiConcept, prop) => {
  const fun = 'setDbConceptRefs'
  try {
    logT(mod, fun)
    const listConceptsReferences = rudiConcept[prop]

    // logD(mod, fun, `listConceptsReferences: ${beautify(listConceptsReferences)}`)
    if (!listConceptsReferences) return

    const listRefs = []

    // Scanning every concept referenced
    await Promise.all(
      listConceptsReferences.map(async (referencedConcept) => {
        let refConceptDbId = referencedConcept[DB_ID]

        if (!refConceptDbId) {
          // The property isn't already a DB object : let's fetch it
          const refConceptRudiId = accessProperty(referencedConcept, API_SKOS_CONCEPT_ID)
          logD(mod, fun, `refConceptRudiId: ${refConceptRudiId}`)
          refConceptDbId = await getDbIdForConceptCode(refConceptRudiId)
          logD(mod, fun, `refConceptDbId: ${refConceptDbId}`)
        }
        if (!refConceptDbId) {
          logW(mod, fun, `Referenced concept not created: ${beautify(referencedConcept)}`)
          // TODO: throw an error here?
        } else {
          logD(mod, fun, `refConceptDbId: ${refConceptDbId}`)
          listRefs.push(refConceptDbId)
        }
      })
    )
    rudiConcept[prop] = listRefs
    return listRefs
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const SCHEME_SHORT_DISPLAY = `${API_SKOS_SCHEME_ID} ${API_SKOS_SCHEME_CODE}` //  -${DB_ID}
const CONCEPT_SHORT_DISPLAY = `${API_SKOS_CONCEPT_ID} ${API_SKOS_CONCEPT_CODE}` //  -${DB_ID}

export const dbConceptToRudiMinimal = async (dbConcept) => {
  const fun = 'dbConceptToRudi'
  try {
    logT(mod, fun)

    const rudiConcept = await dbConcept.populate([
      {
        path: API_CONCEPT_CLASS_PROPERTY,
        select: SCHEME_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_PARENTS_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_CHILDREN_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_SIBLINGS_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_RELATIVE_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
    ])
    // .execPopulate()

    return rudiConcept
    // TODO: populate ref fileds ?
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const dbConceptToRudiRecursive = async (dbConcept) => {
  const fun = 'dbConceptToRudiRecursive'
  try {
    // logT(mod, fun)

    // logD(mod, fun, `dbConcept: ${beautify(dbConcept)}`)
    if (!dbConcept) return

    const rudiConcept = await dbConcept.populate([
      {
        path: API_CONCEPT_CLASS_PROPERTY,
        select: SCHEME_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_PARENTS_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_CHILDREN_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_SIBLINGS_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
      {
        path: API_CONCEPT_RELATIVE_PROPERTY,
        select: CONCEPT_SHORT_DISPLAY,
      },
    ])
    // .execPopulate()

    rudiConcept[API_CONCEPT_CHILDREN_PROPERTY] = await dbConceptListToRudiRecursive(
      rudiConcept[API_CONCEPT_CHILDREN_PROPERTY]
    )
    // logD(mod, fun, `rudiConcept: ${beautify(rudiConcept)}`)

    return rudiConcept
    // TODO: populate ref fileds ?
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const dbConceptListToRudiRecursive = async (dbConceptList) => {
  const fun = 'dbConceptListToRudiRecursive'
  try {
    // logT(mod, fun)

    // logD(mod, fun, `dbConceptList: ${beautify(dbConceptList)}`)
    if (!dbConceptList) return

    const rudiConceptList = []
    await Promise.all(
      dbConceptList.map(async (dbConcept) => {
        const rudiConcept = await dbConceptToRudiRecursive(dbConcept)
        rudiConceptList.push(rudiConcept)
      })
    )
    return rudiConceptList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Thesaurus
// -------------------------------------------------------------------------------------------------

export const getThesaurusList = async (lang) => {
  const fun = 'getThesaurusList'
  try {
    const keywords = Keywords.get(lang)
    const themes = Themes.get(lang)
    const licences = await getLicenceCodes()

    const thesauri = {
      encodings: getEncodings(),
      fileextensions: getExtensions(),
      filetypes: getFileTypes(),
      hashalgorithms: getHashAlgorithms(),
      interfacecontracts: Object.values(InterfaceContract),
      keywords: keywords,
      languages: getLanguages(),
      licences: licences,
      licencetypes: Object.values(LicenceTypes),
      projections: getProjections(),
      storagestatus: getStorageStatus(),
      themes: themes,
    }

    return thesauri
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getThesaurus = async (thesaurusCode) => {
  const fun = 'getThesaurus'
  try {
    const code = thesaurusCode.toLowerCase()

    if (code === 'keywords') return Keywords.get()
    if (code === 'themes') return Themes.get()
    if (code === 'licences') return await getLicenceCodes()
    if (code === 'interfacecontracts') return Object.values(InterfaceContract)

    switch (code) {
      case 'encodings':
        return getEncodings()
      case 'filetypes':
        return getFileTypes()
      case 'fileextensions':
        return getExtensions()
      case 'hashalgorithms':
        return getHashAlgorithms()
      case 'languages':
        return getLanguages()
      case 'projections':
        return getProjections()
      default:
        throw new BadRequestError(`This is not a valid thesaurus code: '${thesaurusCode}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getThesaurusLabel = async (thesaurusCode, lang) => {
  const fun = 'getThesaurusLabel'
  try {
    const code = thesaurusCode.toLowerCase()

    if (code === 'themes') return Themes.getLabels(lang)

    return await getThesaurus(thesaurusCode)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// API functions
// -------------------------------------------------------------------------------------------------
export const getEveryThesaurus = async (req, reply) => {
  const fun = 'getEveryThesaurus'
  try {
    logT(mod, fun, `< GET ${URL_PV_THESAURUS_ACCESS}`)
    logT(mod, fun)

    const lang = req.query[PARAM_THESAURUS_LANG]
    // logD(mod, fun, `lang: ${lang}`)

    const listThesauri = await getThesaurusList(lang)

    return listThesauri
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getSingleThesaurus = async (req, reply) => {
  const fun = 'getSingleThesaurus'
  try {
    logT(mod, fun, `< GET ${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}`)

    const thesaurusCode = accessReqParam(req, PARAM_THESAURUS_CODE)
    logD(mod, fun, `thesaurusCode: ${thesaurusCode}`)

    const thesaurus = await getThesaurus(thesaurusCode)
    if (!thesaurus)
      throw new NotFoundError(
        `Thesaurus not found for such required code: ${beautify(thesaurusCode)}`
      )
    return thesaurus
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const getSingleThesaurusLabels = async (req, reply) => {
  const fun = 'getThesaurusLabels'
  try {
    // logT(
    //   mod,
    //   fun,
    //   `< GET ${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}/:${PARAM_THESAURUS_LANG}`
    // )

    const thesaurusCode = accessReqParam(req, PARAM_THESAURUS_CODE)
    const thesaurusLang = accessReqParam(req, PARAM_THESAURUS_LANG)
    // logD(mod, fun, `thesaurusCode: ${thesaurusCode}`)

    const thesaurus = await getThesaurusLabel(thesaurusCode, thesaurusLang)
    if (!thesaurus)
      throw new NotFoundError(
        `Thesaurus not found for such required code: ${beautify(thesaurusCode)}`
      )
    return thesaurus
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// SKOSMOS server calls
// -------------------------------------------------------------------------------------------------

export const widenSearch = async (searchTerms, lang) => {
  const fun = 'widenSearch'
  try {
    logT(mod, fun)
    if (!searchTerms || !getSkosmosConf()) return searchTerms

    const widenedSearchTerms = []
    await Promise.all(searchTerms.map((term) => askSkosmos(term, lang)))
    logD(mod, fun, `widened search terms: ${widenedSearchTerms}`)
    return widenedSearchTerms
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// export NODE_TLS_REJECT_UNAUTHORIZED=0;
let SKOSMOS_URL, SKOSMOS_AUTH // cache
/**
 *
 * @param {String} term A term to look for in SKOSMOS server vocabularies
 * @returns List of neighbor terms to expand the search
 */
export const askSkosmos = async (term, lang = 'fr', vocabulary) => {
  const fun = 'askSkosmos'
  try {
    logT(mod, fun, `term: ${term}`)

    if (!SKOSMOS_URL) {
      SKOSMOS_URL = getSkosmosConf('url')
    }
    // const reqUrl = 'http://127.0.0.1:3030/api/v1/resources'
    const reqUrl = `${SKOSMOS_URL}/search?clang=${lang}${
      vocabulary ? '&vocab=' + vocabulary : ''
    }&query=${encodeURIComponent(term)}`

    if (!SKOSMOS_AUTH) {
      const skosmosUsr = getSkosmosConf('usr')
      const skosmosPwd = getSkosmosConf('pwd')
      const basicAuth = toPaddedBase64url(skosmosUsr + ':' + skosmosPwd)
      // logD(mod, fun, 'skosmosUsr: ' + skosmosUsr)
      // logD(mod, fun, 'skosmosPwd: ' + skosmosPwd)
      // logD(mod, fun, 'encodedAuth: ' + encodedAuth)

      SKOSMOS_AUTH = {
        headers: {
          'User-Agent': USER_AGENT,
          Authorization: `Basic ${basicAuth}`,
        },
      }
      // SKOSMOS_AUTH = {
      //   auth: {
      //     username: getSkosmosConf('usr'),
      //     password: getSkosmosConf('pwd'),
      //   },
      // }
    }

    // logD(mod, fun, 'reqUrl: ' + reqUrl)
    // logD(mod, fun, 'auth: ' + beautify(SKOSMOS_AUTH))
    try {
      const reply = await directGet(reqUrl, SKOSMOS_AUTH)
      // logD(mod, fun, 'reply: ' + beautify(reply))
      // logD(mod, fun, 'status: ' + reply.status)
      // logD(mod, fun, 'data: ' + beautify(reply.data))
      // logD(mod, fun, 'results: ' + beautify(reply.data?.results))
      const labels = []
      reply.data?.results?.map((result) => {
        if (result.prefLabel) labels.push(result.prefLabel)
        if (result.altLabel) labels.push(result.altLabel)
      })
      return labels
    } catch (error) {
      if (error.message?.startsWith('getaddrinfo ENOTFOUND'))
        error.message = `Skosmos server can't be reached: ${error.message}`
      else if (error.message === 'Request failed with status code 404')
        error.message = `URL to reach Skosmos server is wrong : ${reqUrl}`
      const e = RudiError.treatCommunicationError(mod, fun, error)
      sysAlert(error.message, 'skosController.askSkosmos', {}, { error: e })
      throw e
    }
  } catch (err) {
    logE(mod, fun, err)
    throw RudiError.treatError(mod, fun, err)
  }
}
