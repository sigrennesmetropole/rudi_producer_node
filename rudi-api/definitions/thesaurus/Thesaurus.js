const mod = 'thsrClass'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import { DICT_LANG, DICT_TEXT } from '../../db/dbFields.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { isObject, isString } from '../../utils/jsUtils.js'
import { logD, logT, logW } from '../../utils/logging.js'
import { parameterExpected } from '../../utils/msg.js'
import {
  MethodNotAllowedError,
  BadRequestError,
  NotFoundError,
  RudiError,
} from '../../utils/errors.js'

import {
  DynamicEnum,
  ENUM_KEY,
  ENUM_LABELS,
  ENUM_CODE,
  ENUM_LABELLED_VALUES,
  ENUM_VALUES,
} from '../models/DynamicEnum.js'

// -------------------------------------------------------------------------------------------------
// Thesaurus class
// -------------------------------------------------------------------------------------------------
export class Thesaurus {
  #isInit
  #code
  #initValues
  #currentValues
  #hasLabels

  /**
   *
   * @param {string} code Identifier for this enum
   * @param {string[]} initValues Default values to be used when none are provided
   */
  constructor(code, initValues) {
    // const fun = 'constructor'
    // logD(mod, fun, `${code}: ${beautify(initValues)}`)

    this.#isInit = false
    this.#code = code

    if (Array.isArray(initValues)) {
      this.#hasLabels = false
    } else if (isObject(initValues)) {
      this.#hasLabels = true
    } else throw new BadRequestError(`Wrong initialisation values for Thesaurus '${code}'`)

    this.#initValues = initValues
    this.#currentValues = initValues
  }

  /**
   * Initialize the enum values
   * Should be called only once
   * If no DB values are found, object initValues are used
   * @param {*} shouldReset If true, values are reset
   */
  initialize = async (shouldReset) => {
    const fun = 'init'
    try {
      logT(mod, fun, `Thesaurus: ${this.#code}`)
      if (this.#isInit) throw new MethodNotAllowedError('Init should be called only once.')

      if (shouldReset) {
        this.#currentValues = []
        await this.#storeCurrentValues()
      } else {
        try {
          await this.#retrieveDbValues()
        } catch (err) {
          logT(mod, fun, 'No values found in DB')
          this.#currentValues = this.#initValues
          try {
            await this.#storeCurrentValues()
            logT(mod, fun, 'Current values stored in DB')
          } catch (err) {
            logW(mod, fun, 'Failed to store current enum values')
          }
        }
      }

      this.#isInit = true
      logD(mod, fun, `Thesaurus initialized: ${this.#code}`) // : ${beautify(this.#currentValues)}
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  /**
   * Method to access a list of thesaurus values.
   * If lang is not defined, raw current thesaurus values are delivered
   * It it is, a list of pairs thesaurus {values -> label for this language} is delivered if available.
   * @param {*} lang
   * @returns
   */
  get(lang) {
    const fun = 'get'
    try {
      if (!this.#isInit) {
        const errMsg = `Init first Thesaurus '${this.#code}'`
        logW(mod, fun, errMsg)
        throw new MethodNotAllowedError(errMsg, mod, fun)
      }
      if (!this.#hasLabels) return this.#currentValues.sort()
      if (!lang) return Object.keys(this.#currentValues).sort()
      return this.getLabels(lang)
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  /**
   * Method to access the labels corresponding to each thesaurus values.
   * If labels were not provided for initialization, raw current values are returned
   * If labels were provided, but no language is provided, all language labels are returned for every values
   * If a language is provided, the label is given for every value (if a language label exists for this value)
   * @param {*} lang
   * @returns
   */
  getLabels(lang) {
    const fun = 'getLabels'
    try {
      logT(mod, fun, ``)

      if (!this.#isInit) {
        const errMsg = 'Init first'
        logW(mod, fun, errMsg)
        throw new MethodNotAllowedError(errMsg, mod, fun)
      }

      if (!this.#hasLabels || !lang) return this.#currentValues

      // There is a lang labels for each value AND a language is asked
      // logD(mod, fun, beautify(this.#currentValues))
      const langLabels = {}
      Object.keys(this.#currentValues)
        .sort()
        .map((key) => {
          langLabels[key] = this.#currentValues[key][lang] || key
        })
      return langLabels
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  addSingleValue = async (newThesaurusValue) => {
    const fun = 'addSingleValue'
    try {
      if (!this.#isInit) throw new MethodNotAllowedError('Init first', mod, fun)
      if (!newThesaurusValue) {
        const errMsg = parameterExpected(fun, 'newValue')
        logW(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      }
      if (!this.#hasLabels) {
        // Simple case : we do not deal with labels
        newThesaurusValue = `${newThesaurusValue}`.trim()
        if (this.#currentValues.indexOf(newThesaurusValue) === -1)
          this.#currentValues.push(newThesaurusValue)
      } else {
        if (isString(newThesaurusValue)) {
          // We should have been given an object with the shape
          // {thesaurusValue: {lang1: label1, lang2: label2}}
          newThesaurusValue = `${newThesaurusValue}`.trim()
          if (!this.#currentValues[newThesaurusValue]) {
            this.#currentValues[newThesaurusValue] = {}
          }
        } else {
          // We were given an object with the shape
          // {thesaurusValue: {lang1: label1, lang2: label2}}
          const keys = Object.keys(newThesaurusValue)
          if (keys.length !== 1) {
            throw new BadRequestError(
              `Adding a value to '${
                this.#code
              }' shoud be done with an object {thesaurusValue: {lang1: label1, lang2: label2}}`,
              mod,
              fun
            )
          }
          const key = keys[0]
          if (!this.#currentValues[key]) {
            this.#currentValues[key] = newThesaurusValue[key]
          } else {
            // this.#currentValues[key] exists, let's update labels
            const newLabels = newThesaurusValue[key]
            Object.keys(newLabels).map((lang) => {
              this.#currentValues[key][lang] = newLabels[lang]
            })
          }
        }
      }
      await this.#storeCurrentValues()
    } catch (err) {
      // logW(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  traduce = (val, lang) => {
    const list = this.getLabels(lang)
    return Object.keys(list).find((key) => list[key] === val)
  }

  isValid = async (val, shouldInit) => {
    const fun = 'isValid'
    try {
      logT(this.#code, fun, `val: ${val}`)

      if (!this.#isInit) throw new MethodNotAllowedError('Init first')

      if (!val) {
        logW(mod, fun, parameterExpected(fun, 'value'))
        return false
      }
      const isIn = !this.#hasLabels
        ? this.get().indexOf(val) > -1
        : Object.keys(this.get()).indexOf(val) > -1

      if (!isIn && shouldInit) {
        await this.addSingleValue(val)
        return true
      }
      return isIn
    } catch (err) {
      // logW(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #retrieveDbValues = async () => {
    const fun = '#retrieveDbValues'
    try {
      const dbValues = await this.#getEnum(this.#code)
      if (dbValues) {
        this.#currentValues = dbValues
      } else {
        throw new NotFoundError(`No values found for thesaurus '${this.#code}'`)
      }
    } catch (err) {
      // logD(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #storeCurrentValues = async () => {
    const fun = '#storeCurrentValues'
    try {
      if (!this.#currentValues) throw new MethodNotAllowedError('Values not inititalized')
      await this.#storeEnum(this.#currentValues)
    } catch (err) {
      // logW(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #getEnum = async () => {
    const fun = '#getEnum'
    // logT(mod, fun, ``)

    try {
      const dbEnum = await DynamicEnum.findOne({ code: this.#code })
      if (!dbEnum) throw new NotFoundError(`Enum '${this.#code}' was not found`)

      if (!this.#hasLabels) {
        return dbEnum[ENUM_VALUES]
      } else {
        const labelledValues = {}
        dbEnum[ENUM_LABELLED_VALUES].map((entry) => {
          const labels = {}
          entry[ENUM_LABELS].map((langLabel) => {
            labels[langLabel[DICT_LANG]] = langLabel[DICT_TEXT]
          })

          labelledValues[entry[ENUM_KEY]] = labels
        })
        return labelledValues
      }
    } catch (err) {
      // logD(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #storeEnum = async (thesaurusValues) => {
    const fun = '#storeEnum'
    try {
      let dbAction
      logT(mod, fun, ``)
      if (!this.#hasLabels) {
        // case where thesaurusValues = [value1, value2]
        dbAction = await DynamicEnum.findOneAndUpdate(
          { [ENUM_CODE]: this.#code },
          { $set: { [ENUM_VALUES]: thesaurusValues } },
          { upsert: true, new: true }
        )
      } else {
        // case where thesaurusValues = {
        //    thesaurusValue1: { lang1: labelA, lang2: labelB },
        //    thesaurusValue2: { lang1: labelX, lang2: labelY }
        // }
        const storableEntries = []

        Object.keys(thesaurusValues).map((key) => {
          const storableLabels = []
          const labels = thesaurusValues[key]
          Object.keys(labels).map((lang) => {
            storableLabels.push({
              [DICT_LANG]: lang,
              [DICT_TEXT]: labels[lang],
            })
          })
          storableEntries.push({ [ENUM_KEY]: key, [ENUM_LABELS]: storableLabels })
        })
        // logD(mod, fun, beautify(storableEntries))
        dbAction = await DynamicEnum.findOneAndUpdate(
          { [ENUM_CODE]: this.#code },
          { $set: { [ENUM_LABELLED_VALUES]: storableEntries } },
          { upsert: true, new: true }
        )
      }
      // logD(mod, fun, beautify(dbAction))
      return dbAction
    } catch (err) {
      logW(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }
}
