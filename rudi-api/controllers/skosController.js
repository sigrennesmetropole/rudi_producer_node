'use strict'

const mod = 'skosCtrl'
/*
 * In this file are made the different steps followed for each
 * action on the thesaurus
 */

// ------------------------------------------------------------------------------------------------
// External dependancies
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Internal dependancies
// ------------------------------------------------------------------------------------------------
const log = require('../utils/logging')

const json = require('../utils/jsonAccess')
const utils = require('../utils/jsUtils')

const db = require('../db/dbQueries')

// log.d(mod, 'init', 'Schemas, Models and definitions')
const Themes = require('../definitions/thesaurus/Themes')
const Keywords = require('../definitions/thesaurus/Keywords')

// ------------------------------------------------------------------------------------------------
// Thesauri
// ------------------------------------------------------------------------------------------------
const Encodings = require('../definitions/thesaurus/Encodings')
const FileTypes = require('../definitions/thesaurus/FileTypes')
const HashAlgorithms = require('../definitions/thesaurus/HashAlgorithms')
const Languages = require('../definitions/thesaurus/Languages')
const Projections = require('../definitions/thesaurus/Projections')
const StorageStatus = require('../definitions/thesaurus/StorageStatus')

// ------------------------------------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------------------------------------
const licenceController = require('./licenceController')

// ------------------------------------------------------------------------------------------------
// Data models
// ------------------------------------------------------------------------------------------------
const SkosScheme = require('../definitions/models/SkosScheme')
const SkosConcept = require('../definitions/models/SkosConcept')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const {
  DB_ID,

  API_SKOS_SCHEME_ID,
  API_SKOS_SCHEME_CODE,
  API_SKOS_CONCEPT_ID,
  API_SKOS_CONCEPT_CODE,

  API_SCHEME_TOPS_PROPERTY,

  API_CONCEPT_CLASS_PROPERTY,

  API_CONCEPT_PARENTS_PROPERTY,
  API_CONCEPT_CHILDREN_PROPERTY,
  API_CONCEPT_SIBLINGS_PROPERTY,
  API_CONCEPT_RELATIVE_PROPERTY,
  LicenceTypes,
} = require('../db/dbFields')

const PROPERTIES_WITH_CONCEPT_REFS = [
  API_CONCEPT_PARENTS_PROPERTY,
  API_CONCEPT_CHILDREN_PROPERTY,
  API_CONCEPT_SIBLINGS_PROPERTY,
  API_CONCEPT_RELATIVE_PROPERTY,
]

const {
  URL_PV_THESAURUS_ACCESS,
  PARAM_THESAURUS_CODE,
  PARAM_THESAURUS_LANG,
} = require('../config/confApi')
const {
  ParameterExpectedError,
  NotFoundError,
  RudiError,
  BadRequestError,
} = require('../utils/errors')

// ------------------------------------------------------------------------------------------------
// Controllers: Scheme
// ------------------------------------------------------------------------------------------------

/**
 * Creation of a new Scheme.
 * This is made in two times: first we create the Scheme without the
 * "top concepts" references.
 * Then we can create the referenced concepts, and update the Scheme.
 * @param {JSON description of a new SKOS Scheme in RUDI system} rudiScheme
 * @returns
 */
exports.newSkosScheme = async (rudiScheme) => {
  const fun = 'newScheme'
  try {
    log.t(mod, fun, ``)

    if (!rudiScheme) throw new ParameterExpectedError('rudiScheme', mod, fun)

    const topConcepts = await utils.deepClone(rudiScheme[API_SCHEME_TOPS_PROPERTY])

    delete rudiScheme[API_SCHEME_TOPS_PROPERTY]

    const dbReadySchemeNoRef = await new SkosScheme(rudiScheme)
    const dbScheme = await dbReadySchemeNoRef.save()

    const schemeDbId = dbScheme[DB_ID]

    if (utils.isNotEmptyArray(topConcepts)) {
      dbScheme[API_SCHEME_TOPS_PROPERTY] = await this.createConceptHierarchy(
        topConcepts,
        schemeDbId
      )
    }
    // TODO: reinforce the associations between concepts through siblings/relative properties
    dbScheme.save()

    return await this.dbSchemeToRudi(dbScheme)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

const CONCEPT_HIERARCHY_DISPLAY = `${API_SKOS_CONCEPT_ID} ${API_SKOS_CONCEPT_CODE} ${API_CONCEPT_CHILDREN_PROPERTY}` // -${DB_ID}

exports.dbSchemeToRudi = async (dbScheme) => {
  const fun = 'dbSchemeToRudi'
  log.t(mod, fun, ``)

  // log.d(mod, fun, `dbScheme: ${utils.beautify(dbScheme)}`)

  const rudiScheme = await dbScheme.populate([
    {
      path: API_SCHEME_TOPS_PROPERTY,
      select: CONCEPT_HIERARCHY_DISPLAY,
    },
  ])
  // .execPopulate()

  rudiScheme[API_SCHEME_TOPS_PROPERTY] = await this.dbConceptListToRudiRecursive(
    rudiScheme[API_SCHEME_TOPS_PROPERTY]
  )
  // log.d(mod, fun, `rudiScheme: ${rudiScheme}`)

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
exports.createConceptHierarchy = async (listConcepts, schemeDbId, parentConcept) => {
  const fun = 'createConceptHierarchy'
  try {
    log.t(mod, fun, ``)
    // Check input parameters
    if (!listConcepts) throw new ParameterExpectedError('listConcepts', mod, fun)
    if (!schemeDbId) throw new ParameterExpectedError('schemeDbId', mod, fun)

    // Create all concept in the list
    const conceptDbIds = []
    await Promise.all(
      listConcepts.map(async (conceptJson) => {
        let dbConcept = db.getConceptWithJson(conceptJson)
        // log.d(mod, fun, `dbConcept: ${utils.beautify(dbConcept)}`)

        if (utils.isNotEmptyObject(dbConcept)) {
          // log.d(mod, fun, `Concept already created: ${utils.beautify(dbConcept[API_SKOS_CONCEPT_ID])} `)
        } else {
          // log.d(mod, fun, `Creating new concept: ${conceptJson[API_SKOS_CONCEPT_ID]} `)

          // Backup reference lists
          let conceptChildren = []
          if (utils.isNotEmptyArray(conceptJson[API_CONCEPT_CHILDREN_PROPERTY])) {
            conceptChildren = utils.deepClone(conceptJson[API_CONCEPT_CHILDREN_PROPERTY])
          }

          // Remove references to other concepts
          PROPERTIES_WITH_CONCEPT_REFS.forEach((propertyReferencingOtherconcepts) => {
            delete conceptJson[propertyReferencingOtherconcepts]
          })

          // Ensure the current scheme is the one referenced in the class property
          conceptJson[API_CONCEPT_CLASS_PROPERTY] = schemeDbId

          // Create concept without references
          // log.d(mod, fun, `Saving the new Concept`)
          // log.d(mod, fun, `conceptJson: ${utils.beautify(conceptJson)}`)
          dbConcept = await new SkosConcept(conceptJson)
          await dbConcept.save()
          // log.d(mod, fun, `=> done`)
          const conceptDbId = dbConcept[DB_ID]

          conceptDbIds.push(conceptDbId)

          // Update children property
          if (utils.isNotEmptyArray(conceptChildren)) {
            // Create each children hierarchy
            const childrenDbIds = await this.createConceptHierarchy(
              conceptChildren,
              schemeDbId,
              conceptDbId
            )
            dbConcept[API_CONCEPT_CHILDREN_PROPERTY] = childrenDbIds
          }

          // log.d(mod, fun, `${utils.beautify(conceptJson)} -> ${conceptDbId}`)
        }

        // Update parents property
        if (!parentConcept) {
          delete dbConcept[API_CONCEPT_PARENTS_PROPERTY]
        } else {
          const parents = dbConcept[API_CONCEPT_PARENTS_PROPERTY]
          // log.d(mod, fun, `Updating 'parents' property`)
          if (!utils.isNotEmptyArray(parents)) {
            // log.d(mod, fun, `dbConcept[API_CONCEPT_PARENTS_PROPERTY]: ${utils.beautify(dbConcept[API_CONCEPT_PARENTS_PROPERTY])}`)
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

// ------------------------------------------------------------------------------------------------
// Controllers: Concept
// ------------------------------------------------------------------------------------------------

/**
 * Creates a concept in DB from a Concept in RUDI format,
 * that references an existing scheme through its RUDI ID
 */
exports.newSkosConcept = async (rudiConcept, inSchemeDbId) => {
  const fun = 'newConcept'
  try {
    log.t(mod, fun, ``)

    await this.setDbScheme(rudiConcept, inSchemeDbId)

    // Scanning every property with concept references
    await Promise.all(
      PROPERTIES_WITH_CONCEPT_REFS.map(async (prop) => {
        await this.setDbConceptRefs(rudiConcept, prop)
      })
    )

    const dbConcept = await new SkosConcept(rudiConcept)
    // log.d(mod, fun, `dbConcept: ${utils.beautify(dbConcept)}`)
    await dbConcept.save()
    // log.d(mod, fun, `=> saved`)

    const rudiReadyConcept = await this.dbConceptToRudiMinimal(dbConcept)
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
exports.setDbScheme = async (rudiConcept, inSchemeDbId) => {
  const fun = 'setDbScheme'
  try {
    log.t(mod, fun, ``)

    let schemeDbId
    if (!inSchemeDbId) {
      // Retrieveing Scheme information
      const conceptScheme = json.accessProperty(rudiConcept, API_CONCEPT_CLASS_PROPERTY)
      schemeDbId = rudiConcept[API_CONCEPT_CLASS_PROPERTY][DB_ID]
      if (!schemeDbId) {
        const schemeRudiId = json.accessProperty(conceptScheme, API_SKOS_SCHEME_ID)
        schemeDbId = await db.getEnsuredSchemeDbIdWithRudiId(schemeRudiId)
      }
      // log.d(mod, fun, `schemeDbId: ${schemeDbId}`)
    } else {
      // log.d(mod, fun, `inSchemeDbId: ${inSchemeDbId}`)
      schemeDbId = inSchemeDbId
    }
    rudiConcept[API_CONCEPT_CLASS_PROPERTY] = schemeDbId
    return schemeDbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
exports.getDbIdForConceptCode = async (conceptRudiId) => {
  const fun = 'getDbIdForConceptCode'
  try {
    log.t(mod, fun, ``)
    const conceptDbId = await db.getConceptDbIdWithRudiId(conceptRudiId)
    return conceptDbId
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.setDbConceptRefs = async (rudiConcept, prop) => {
  const fun = 'setDbConceptRefs'
  try {
    log.t(mod, fun, ``)
    const listConceptsReferences = rudiConcept[prop]

    // log.d(mod, fun, `listConceptsReferences: ${utils.beautify(listConceptsReferences)}`)
    if (!listConceptsReferences) return

    const listRefs = []

    // Scanning every concept referenced
    await Promise.all(
      listConceptsReferences.map(async (referencedConcept) => {
        let refConceptDbId = referencedConcept[DB_ID]

        if (!refConceptDbId) {
          // The property isn't already a DB object : let's fetch it
          const refConceptRudiId = json.accessProperty(referencedConcept, API_SKOS_CONCEPT_ID)
          log.d(mod, fun, `refConceptRudiId: ${refConceptRudiId}`)
          refConceptDbId = await this.getDbIdForConceptCode(refConceptRudiId)
          log.d(mod, fun, `refConceptDbId: ${refConceptDbId}`)
        }
        if (!refConceptDbId) {
          log.w(mod, fun, `Referenced concept not created: ${utils.beautify(referencedConcept)}`)
          // TODO: throw an error here?
        } else {
          log.d(mod, fun, `refConceptDbId: ${refConceptDbId}`)
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

exports.dbConceptToRudiMinimal = async (dbConcept) => {
  const fun = 'dbConceptToRudi'
  try {
    log.t(mod, fun, ``)

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

exports.dbConceptToRudiRecursive = async (dbConcept) => {
  const fun = 'dbConceptToRudiRecursive'
  try {
    // log.t(mod, fun, ``)

    // log.d(mod, fun, `dbConcept: ${utils.beautify(dbConcept)}`)
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

    rudiConcept[API_CONCEPT_CHILDREN_PROPERTY] = await this.dbConceptListToRudiRecursive(
      rudiConcept[API_CONCEPT_CHILDREN_PROPERTY]
    )
    // log.d(mod, fun, `rudiConcept: ${utils.beautify(rudiConcept)}`)

    return rudiConcept
    // TODO: populate ref fileds ?
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.dbConceptListToRudiRecursive = async (dbConceptList) => {
  const fun = 'dbConceptListToRudiRecursive'
  try {
    // log.t(mod, fun, ``)

    // log.d(mod, fun, `dbConceptList: ${utils.beautify(dbConceptList)}`)
    if (!dbConceptList) return

    const rudiConceptList = []
    await Promise.all(
      dbConceptList.map(async (dbConcept) => {
        const rudiConcept = await this.dbConceptToRudiRecursive(dbConcept)
        rudiConceptList.push(rudiConcept)
      })
    )
    return rudiConceptList
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// Thesaurus
// ------------------------------------------------------------------------------------------------

exports.getThesaurusList = async (lang) => {
  const fun = 'getThesaurusList'
  try {
    const keywords = await Keywords.get(lang)
    const themes = await Themes.get(lang)
    const licences = await await licenceController.getAllLicenceCodes()

    const thesauri = {
      encodings: Encodings.get(lang),
      filetypes: FileTypes.get(lang),
      fileextensions: FileTypes.getExtensions(),
      hashalgorithms: HashAlgorithms.get(lang),
      keywords: keywords,
      languages: Languages.get(lang),
      licences: licences,
      licencetypes: Object.values(LicenceTypes),
      projections: Projections.get(lang),
      storagestatus: StorageStatus.get(lang),
      themes: themes,
    }

    return thesauri
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getThesaurus = async (thesaurusCode) => {
  const fun = 'getThesaurus'
  try {
    const code = thesaurusCode.toLowerCase()

    if (code === 'keywords') return await Keywords.get()
    if (code === 'themes') return await Themes.get()
    if (code === 'licences') return await licenceController.getAllLicenceCodes()

    switch (code) {
      case 'encodings':
        return Encodings.get()
      case 'filetypes':
        return FileTypes.get()
      case 'fileextensions':
        return FileTypes.getExtensions()
      case 'hashalgorithms':
        return HashAlgorithms.get()
      case 'languages':
        return Languages.get()
      case 'projections':
        return Projections.get()
      default:
        throw new BadRequestError(`This is not a valid thesaurus code: '${thesaurusCode}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getThesaurusLabel = async (thesaurusCode, lang) => {
  const fun = 'getThesaurusLabel'
  try {
    const code = thesaurusCode.toLowerCase()

    if (code === 'themes') return await Themes.getLabels(lang)

    if (code === 'keywords') return await Keywords.get()
    if (code === 'licences') return await licenceController.getAllLicenceCodes()

    switch (code) {
      case 'encodings':
        return Encodings.get()
      case 'filetypes':
        return FileTypes.get()
      case 'fileextensions':
        return FileTypes.getExtensions()
      case 'hashalgorithms':
        return HashAlgorithms.get()
      case 'languages':
        return Languages.get()
      case 'projections':
        return Projections.get()
      default:
        throw new BadRequestError(`This is not a valid thesaurus code: '${thesaurusCode}'`)
    }
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// ------------------------------------------------------------------------------------------------
// API functions
// ------------------------------------------------------------------------------------------------
exports.getEveryThesaurus = async (req, reply) => {
  const fun = 'getEveryThesaurus'
  try {
    log.t(mod, fun, `< GET ${URL_PV_THESAURUS_ACCESS}`)
    log.t(mod, fun, ``)

    const lang = req.query[PARAM_THESAURUS_LANG]
    // log.d(mod, fun, `lang: ${lang}`)

    const listThesauri = await this.getThesaurusList(lang)

    return listThesauri
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getSingleThesaurus = async (req, reply) => {
  const fun = 'getSingleThesaurus'
  try {
    log.t(mod, fun, `< GET ${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}`)

    const thesaurusCode = json.accessReqParam(req, PARAM_THESAURUS_CODE)
    log.d(mod, fun, `thesaurusCode: ${thesaurusCode}`)

    const thesaurus = await this.getThesaurus(thesaurusCode)
    if (!thesaurus)
      throw new NotFoundError(
        `Thesaurus not found for such required code: ${utils.beautify(thesaurusCode)}`
      )
    return thesaurus
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

exports.getSingleThesaurusLabels = async (req, reply) => {
  const fun = 'getThesaurusLabels'
  try {
    log.v(
      mod,
      fun,
      `< GET ${URL_PV_THESAURUS_ACCESS}/:${PARAM_THESAURUS_CODE}/:${PARAM_THESAURUS_LANG}`
    )

    const thesaurusCode = json.accessReqParam(req, PARAM_THESAURUS_CODE)
    const thesaurusLang = json.accessReqParam(req, PARAM_THESAURUS_LANG)
    log.d(mod, fun, `thesaurusCode: ${thesaurusCode}`)

    const thesaurus = await this.getThesaurusLabel(thesaurusCode, thesaurusLang)
    if (!thesaurus)
      throw new NotFoundError(
        `Thesaurus not found for such required code: ${utils.beautify(thesaurusCode)}`
      )
    return thesaurus
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}
