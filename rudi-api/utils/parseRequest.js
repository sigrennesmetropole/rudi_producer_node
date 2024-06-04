const mod = 'parseUrl'

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

// -------------------------------------------------------------------------------------------------
// Imported Constants
// -------------------------------------------------------------------------------------------------
import {
  ACT_EXT_SEARCH,
  ACT_SEARCH,
  DEFAULT_QUERY_LIMIT,
  DEFAULT_QUERY_OFFSET,
  QUERY_CONFIRM,
  QUERY_COUNT_BY,
  QUERY_COUNT_BY_CAML,
  QUERY_FIELDS,
  QUERY_FILTER,
  QUERY_GROUP_BY,
  QUERY_GROUP_BY_CAML,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_LIMIT_CAML,
  QUERY_GROUP_OFFSET,
  QUERY_GROUP_OFFSET_CAML,
  QUERY_LANG,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SEARCH_TERMS,
  QUERY_SORT_BY,
  QUERY_SORT_BY_CAML,
  QUERY_UPDATED_AFTER,
  QUERY_UPDATED_AFTER_CAML,
  QUERY_UPDATED_BEFORE,
  QUERY_UPDATED_BEFORE_CAML,
} from '../config/constApi.js'

import {
  API_DATA_DATES_PROPERTY,
  API_DATES_CREATED,
  API_DATES_DELETED,
  API_DATES_EDITED,
  API_DATES_EXPIRES,
  API_DATES_PUBLISHED,
  API_DATES_VALIDATED,
  API_END_DATE_PROPERTY,
  API_KEYWORDS_PROPERTY,
  API_METAINFO_DATES,
  API_METAINFO_PROPERTY,
  API_PERIOD_PROPERTY,
  API_START_DATE_PROPERTY,
  DB_CREATED_AT,
  DB_ID,
  DB_PUBLISHED_AT,
  DB_UPDATED_AT,
} from '../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify, isNotEmptyArray } from './jsUtils.js'

import { logD, logT, logW } from './logging.js'

import { BadRequestError, RudiError } from './errors.js'

import { getModelPropertyNames, getNestedObject, getObjectModel } from '../db/dbQueries.js'

// -------------------------------------------------------------------------------------------------
// Local constants
// -------------------------------------------------------------------------------------------------
const QUERY_RESERVED_WORDS = [
  QUERY_CONFIRM,
  QUERY_COUNT_BY,
  QUERY_COUNT_BY_CAML,
  QUERY_FIELDS,
  QUERY_GROUP_BY,
  QUERY_GROUP_BY_CAML,
  QUERY_GROUP_LIMIT,
  QUERY_GROUP_LIMIT_CAML,
  QUERY_GROUP_OFFSET,
  QUERY_GROUP_OFFSET_CAML,
  QUERY_LANG,
  QUERY_LIMIT,
  QUERY_OFFSET,
  QUERY_SORT_BY,
  QUERY_SORT_BY_CAML,
  QUERY_UPDATED_AFTER,
  QUERY_UPDATED_AFTER_CAML,
  QUERY_UPDATED_BEFORE,
  QUERY_UPDATED_BEFORE_CAML,
]

const EXT_REFS = 'external_references' // External references needing aggregation
const EXT_OBJ = 'refObj'
const EXT_OBJ_PROP = 'refObjProp'
const EXT_OBJ_VAL = 'refObjVal'

const DATA_DATES = `${API_DATA_DATES_PROPERTY}.`
const META_DATES = `${API_METAINFO_PROPERTY}.${API_METAINFO_DATES}.`

// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------
// eslint-disable-next-line complexity
export const parseQueryParameters = async (objectType, fullUrl) => {
  const fun = 'parseQueryParameters'
  try {
    logT(mod, fun)
    // identify object model
    const ObjModel = getObjectModel(objectType)
    const modelProperties = getModelPropertyNames(ObjModel)
    // logD(mod, fun, beautify(modelProperties))
    const returnedFilter = {
      [QUERY_LIMIT]: DEFAULT_QUERY_LIMIT,
      [QUERY_GROUP_LIMIT]: DEFAULT_QUERY_LIMIT,
      [QUERY_OFFSET]: DEFAULT_QUERY_OFFSET,
      [QUERY_GROUP_OFFSET]: DEFAULT_QUERY_OFFSET,
      [QUERY_FILTER]: {},
      [QUERY_CONFIRM]: false,
      [EXT_REFS]: [],
      [QUERY_LANG]: undefined,
      [QUERY_SEARCH_TERMS]: [],
    }
    const filters = []

    // extract request parameters
    if (`${fullUrl}`.indexOf('?') === -1) {
      // logD(mod, fun, `No question mark in url: ${reqUrl}`)
      return returnedFilter
    }
    // const reqArgs = reqUrl.substring(reqUrl.indexOf('?'))
    const splitUrl = fullUrl.split('?')
    const reqUrl = splitUrl[0]
    const reqArgs = splitUrl[1]
    const urlSegments = reqUrl.split('/')
    const lastSegment = urlSegments[urlSegments.length - 1]
    const searching = lastSegment === ACT_SEARCH || lastSegment === ACT_EXT_SEARCH
    const urlParams = new URLSearchParams(reqArgs)

    // Check if parameters were actually found by URLSearchParams
    if (urlParams.keys().length < 1) {
      logD(mod, fun, `No parameters found after the question mark: ${urlParams}`)
      return returnedFilter
    }
    //  logD(mod, fun, `urlSearchParams: ${urlSearchParams}`)

    for (const [key, value] of urlParams) {
      if (!key) break
      if (QUERY_RESERVED_WORDS.includes(key)) {
        // logD(mod, fun, `Key is a reserved word: ${beautify(key)} => ${beautify(queryParameters[key])}`)
        switch (key) {
          case QUERY_LANG:
            returnedFilter[QUERY_LANG] = value
            break
          case QUERY_LIMIT:
          case QUERY_OFFSET:
          case QUERY_GROUP_LIMIT:
          case QUERY_GROUP_LIMIT_CAML:
          case QUERY_GROUP_OFFSET:
          case QUERY_GROUP_OFFSET_CAML:
            returnedFilter[key] = parseInt(value)
            break
          case QUERY_GROUP_BY:
          case QUERY_GROUP_BY_CAML:
          case QUERY_COUNT_BY:
          case QUERY_COUNT_BY_CAML:
            returnedFilter[key] = value
            break
          case QUERY_UPDATED_AFTER:
          case QUERY_UPDATED_AFTER_CAML:
            filters.push({ [DB_UPDATED_AT]: mongoose.trusted({ $gte: cleanDate(value) }) })
            break
          case QUERY_UPDATED_BEFORE:
          case QUERY_UPDATED_BEFORE_CAML:
            filters.push({ [DB_UPDATED_AT]: mongoose.trusted({ $lte: cleanDate(value) }) })
            break
          case QUERY_CONFIRM:
            if (['false', '0', 'null', 'no'].includes(value)) break
            returnedFilter[key] = !!value
            break
          case QUERY_FIELDS:
            returnedFilter[key] = value.split(',').map((field) => field.trim())
            break
          case QUERY_SORT_BY:
          case QUERY_SORT_BY_CAML:
            returnedFilter[key] = value.split(',').map((field) => {
              let trimmedField = field.trim()
              let minus = ''
              let absoluteField = trimmedField
              if (trimmedField[0] === '-') {
                minus = '-'
                absoluteField = trimmedField.substring(1)
              }
              // Dealing with virtual fields
              switch (absoluteField) {
                case `${META_DATES}${API_DATES_CREATED}`:
                  return `${minus}${DB_CREATED_AT}`
                case `${META_DATES}${API_DATES_EDITED}`:
                  return `${minus}${DB_UPDATED_AT}`
                case `${META_DATES}${API_DATES_PUBLISHED}`:
                  return `${minus}${DB_PUBLISHED_AT}`
                default:
                  return trimmedField
              }
            })
            break
          default:
            logW(mod, fun, `Query keyword not recognized: '${key}'`)
        }
      } else if (modelProperties.includes(key)) {
        // logD(mod, fun, `Key is a ${objectType} property: ${beautify(key)}`)
        // logD(mod, fun, `Corresponding value: ${value}`)
        const val = value
        if (!value) {
          // logD(mod, fun, 'searching this term')
          returnedFilter[QUERY_SEARCH_TERMS].push(key)
        } else {
          try {
            const obj = JSON.parse(val)
            logD(mod, fun, `parsed String: ${beautify(obj)}`)

            switch (key) {
              case `${DB_CREATED_AT}`:
              case `${DB_UPDATED_AT}`:
              case `${DB_PUBLISHED_AT}`:

              case `${DATA_DATES}${API_DATES_CREATED}`:
              case `${DATA_DATES}${API_DATES_EDITED}`:
              case `${DATA_DATES}${API_DATES_PUBLISHED}`:
              case `${DATA_DATES}${API_DATES_VALIDATED}`:
              case `${DATA_DATES}${API_DATES_DELETED}`:

              case `${META_DATES}${API_DATES_CREATED}`:
              case `${META_DATES}${API_DATES_EDITED}`:
              case `${META_DATES}${API_DATES_PUBLISHED}`:
              case `${META_DATES}${API_DATES_VALIDATED}`:
              case `${META_DATES}${API_DATES_DELETED}`:

              case `${API_PERIOD_PROPERTY}.${API_START_DATE_PROPERTY}`:
              case `${API_PERIOD_PROPERTY}.${API_END_DATE_PROPERTY}`:
                filters.push({ [key]: cleanDateOperations(obj) })
                break
              default:
                filters.push({ [key]: obj })
            }
          } catch (err) {
            // logD(mod, fun, `Error while parsing: '${beautify(val)}': ${err}}`)
            switch (key) {
              case `${DB_CREATED_AT}`:
              case `${DB_UPDATED_AT}`:
              case `${DB_PUBLISHED_AT}`:

              case `${DATA_DATES}${API_DATES_CREATED}`:
              case `${DATA_DATES}${API_DATES_EDITED}`:
              case `${DATA_DATES}${API_DATES_PUBLISHED}`:
              case `${DATA_DATES}${API_DATES_VALIDATED}`:
              case `${DATA_DATES}${API_DATES_DELETED}`:
              case `${DATA_DATES}${API_DATES_EXPIRES}`:

              case `${META_DATES}${API_DATES_CREATED}`:
              case `${META_DATES}${API_DATES_EDITED}`:
              case `${META_DATES}${API_DATES_PUBLISHED}`:
              case `${META_DATES}${API_DATES_VALIDATED}`:
              case `${META_DATES}${API_DATES_DELETED}`:
              case `${META_DATES}${API_DATES_EXPIRES}`:

              case `${API_PERIOD_PROPERTY}.${API_START_DATE_PROPERTY}`:
              case `${API_PERIOD_PROPERTY}.${API_END_DATE_PROPERTY}`:
                filters.push({ [key]: cleanDate(val) })
                break
              case `${API_KEYWORDS_PROPERTY}`:
                filters.push({ [key]: { $in: val.split(',') } })
                break
              default:
                filters.push({ [key]: val })
            }
          }
        }
      } else {
        const indexSeparator = key.indexOf('.')
        const nestedField = key.substring(0, indexSeparator)
        const nestedFieldProp = key.substring(indexSeparator + 1)

        if (modelProperties.includes(nestedField)) {
          try {
            const obj = JSON.parse(value) // TODO: remove !!!
            const msg = `nestedField: ${nestedField} / nestedFieldProp: ${nestedFieldProp} / value: ${obj}`
            logD(mod, fun, msg)

            returnedFilter[EXT_REFS].push({
              [EXT_OBJ]: nestedField,
              [EXT_OBJ_PROP]: nestedFieldProp,
              [EXT_OBJ_VAL]: obj,
            })
          } catch (err) {
            // const errMsg = `Couldn't parse: '${beautify(value)}': ${err}}`
            // logW(mod, fun, errMsg)
            if (!value) returnedFilter[QUERY_SEARCH_TERMS].push(nestedField)
            else
              returnedFilter[EXT_REFS].push({
                [EXT_OBJ]: nestedField,
                [EXT_OBJ_PROP]: nestedFieldProp,
                [EXT_OBJ_VAL]: value,
              })
          }
        } else if (searching) {
          logD(mod, fun, `Search term found: ${beautify(key)}`)
          key.split(',').map((term) => returnedFilter[QUERY_SEARCH_TERMS].push(term))
        } else {
          logW(mod, fun, `Key is not a property of ${objectType}: ${beautify(key)}`)
        }
        // logW(mod, fun, `Model properties: ${beautify(modelProperties)}`)
      }
    }
    // logD(mod, fun, `filterReturn: ${beautify(filterReturn)}`)

    const extRefs = returnedFilter[EXT_REFS]
    if (isNotEmptyArray(extRefs)) {
      await Promise.all(
        extRefs.map(async (extRef) => {
          const extObj = extRef[EXT_OBJ]
          const extObjProp = extRef[EXT_OBJ_PROP]
          const extObjVal = extRef[EXT_OBJ_VAL]

          const objFilter = { [extObjProp]: extObjVal }

          // logD(mod, fun, `objFilter: ${beautify(objFilter)}`)
          let nestedFieldIds
          try {
            nestedFieldIds = await getNestedObject(objectType, extObj, objFilter, DB_ID)
          } catch (err) {
            // returnedFilter[QUERY_FILTER][extObj] = 0
            throw RudiError.treatError(mod, fun, err)
          }
          // logD(mod, fun, `nestedFieldIds: ${beautify(nestedFieldIds)}`)

          const ids = await Promise.all(
            nestedFieldIds.map(async (foundObj) => {
              // logD(mod, fun, `nestedFieldId: ${beautify(foundObj[DB_ID])}`)
              return new mongoose.Types.ObjectId(foundObj[DB_ID])
            })
          )

          filters.push({ [extObj]: mongoose.trusted({ $in: ids }) })

          // logD(mod, fun, `filterReturn: ${beautify(returnedFilter)}`)
        })
      )
    }
    if (isNotEmptyArray(filters)) returnedFilter[QUERY_FILTER] = { $and: filters }
    // logD(mod, fun, `filter: ${beautify(returnedFilter[QUERY_FILTER])}`)
    return returnedFilter
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export function cleanDate(inputDate) {
  const fun = 'cleanDate'

  const cleanValue = inputDate.replace(/[\'\"\`]/g, '')
  if (cleanValue.match(new RegExp(/^[0-9]{10}$/))) return new Date(parseInt(cleanValue * 1000))
  if (cleanValue.match(new RegExp(/^[0-9]{13}$/))) return new Date(parseInt(cleanValue))
  try {
    const cleanDate = new Date(cleanValue)
    if (cleanDate == 'Invalid Date') throw new BadRequestError(`Invalid date: '${inputDate}'`)
    // logD(mod, fun, `clean date: ${cleanDate.toISOString()}`)
    return cleanDate
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

function cleanDateOperations(inputDateOperations) {
  const fun = 'cleanDateOperation'
  logT(mod, fun, `inputDateOperations: ${beautify(inputDateOperations)}`)

  const operations = {}
  for (const [operator, value] of Object.entries(inputDateOperations)) {
    // if (isObject(value)) { // case with
    //   for (const [op, val] of Object.entries(value)) {
    //     if (op === '$and' || op === '$or') {
    //       operations[op] = val.map(expr => )
    //     } else {
    //       logW(mod, fun, `Operator '${op}' not recognized for dates comparisons`)
    //     }
    //   }
    // } else {
    operations[operator] = cleanDate(value)
    // }
  }
  return operations
}
