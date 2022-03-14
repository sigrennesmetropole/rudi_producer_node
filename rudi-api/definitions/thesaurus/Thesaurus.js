'use strict'

const mod = 'thsrClass'

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const { parameterExpected } = require('../../utils/msg')

const DynamicEnum = require('../models/DynamicEnum')
const {
  MethodNotAllowedError,
  BadRequestError,
  NotFoundError,
  RudiError,
} = require('../../utils/errors')

// ------------------------------------------------------------------------------------------------
// Thesaurus class
// ------------------------------------------------------------------------------------------------
module.exports = class Thesaurus {
  #isInit
  #code
  #initValues
  #initLabels
  #currentValues

  /**
   *
   * @param {string} code Identifier for this enum
   * @param {string[]} initValues Default values to be used when none are provided
   */
  constructor(code, initValues, initLabels) {
    // const fun = 'constructor'
    // log.d(mod, fun, `${code}`)

    this.#isInit = false
    this.#code = code
    this.#initValues = initValues
    this.#initLabels = initLabels
  }

  /**
   * Initialize the enum values
   * Should be called only once
   * If no DB values are found, object initValues are used
   * @param {*} shouldReset If true, values are reset
   */
  init = async (shouldReset) => {
    const fun = 'init'
    try {
      // log.d(mod, fun, `Thesaurus: ${this.#code}`)
      if (this.#isInit) throw new MethodNotAllowedError('Init should be called only once.')

      if (shouldReset) {
        this.#currentValues = []
        await this.#storeCurrentValues()
      } else {
        try {
          await this.#retrieveDbValues()
        } catch (err) {
          log.t(mod, fun, 'No values found in DB')
          this.#currentValues = this.#initValues
          try {
            await this.#storeCurrentValues()
            log.t(mod, fun, 'Current values stored in DB')
          } catch (err) {
            log.w(mod, fun, 'Failed to store current enum values')
          }
        }
      }
      this.#isInit = true
      // log.d(mod, fun, `Thesaurus initialized: ${this.#code}`)
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  get(lang) {
    const fun = 'get'
    try {
      if (!this.#isInit) {
        const errMsg = 'Init first'
        log.w(mod, fun, errMsg)
        throw new MethodNotAllowedError(errMsg)
      }
      if (lang) return this.getLabels(lang)
      return this.#currentValues.sort()
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  getLabels(lang) {
    const fun = 'getLabels'
    try {
      log.t(mod, fun, ``)

      if (!this.#isInit) {
        const errMsg = 'Init first'
        log.w(mod, fun, errMsg)
        throw new MethodNotAllowedError(errMsg)
      }

      if (!this.#initLabels) return this.#currentValues

      if (!lang) return this.#initLabels
      const labels = {}
      Object.keys(this.#initLabels).map((key) => {
        const val = this.#initLabels[key][lang]
        const label = val ? val : key
        // log.d(mod, fun, `${beautify(key)}: ${val}`)
        labels[key] = label
      })
      return labels
    } catch (err) {
      throw RudiError.treatError(mod, fun, err)
    }
  }

  addSingleValue = async (newValue) => {
    const fun = 'addSingleValue'
    try {
      if (!this.#isInit) throw new MethodNotAllowedError('Init first')
      if (!newValue) {
        const errMsg = parameterExpected(fun, 'newValue')
        log.w(mod, fun, errMsg)
        throw new BadRequestError(errMsg)
      }

      newValue = `${newValue}`.trim()
      if (this.#currentValues.indexOf(newValue) === -1) {
        this.#currentValues.push(newValue)
        await this.#storeCurrentValues()
      }
    } catch (err) {
      // log.w(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  isValid = async (val, shouldInit) => {
    const fun = 'isValid'
    try {
      if (!this.#isInit) throw new MethodNotAllowedError('Init first')

      if (!val) {
        log.w(mod, fun, parameterExpected(fun, 'value'))
        return false
      }
      const isIn = this.#currentValues.indexOf(val) > -1
      if (!isIn && shouldInit) {
        await this.addSingleValue(val)
        return true
      }
      return isIn
    } catch (err) {
      // log.w(mod, fun, err)
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
      // log.d(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #storeCurrentValues = async () => {
    const fun = '#storeCurrentValues'
    try {
      if (!this.#currentValues) throw new MethodNotAllowedError('Values not inititalized')
      await this.#storeEnum(this.#code, this.#currentValues)
    } catch (err) {
      // log.w(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #getEnum = async (typeThesaurus) => {
    const fun = '#getEnum'
    // log.t(mod, fun, ``)

    try {
      const dbEnum = await DynamicEnum.findOne({ code: typeThesaurus })
      if (dbEnum) return dbEnum.values
      else throw new NotFoundError(`Enum '${typeThesaurus}' was not found`)
    } catch (err) {
      // log.d(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #getLabels = async (typeThesaurus) => {
    const fun = '#getEnum'
    // log.t(mod, fun, ``)

    try {
      const dbEnum = await DynamicEnum.findOne({ code: typeThesaurus })
      if (dbEnum) return dbEnum.values
      else throw new NotFoundError(`Enum '${typeThesaurus}' was not found`)
    } catch (err) {
      // log.d(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }

  #storeEnum = async (typeThesaurus, listValues) => {
    const fun = '#storeEnum'
    // log.t(mod, fun, ``)

    try {
      await DynamicEnum.findOneAndUpdate(
        { code: typeThesaurus },
        { $set: { values: listValues } },
        { upsert: true, new: true }
      )
    } catch (err) {
      // log.w(mod, fun, err)
      throw RudiError.treatError(mod, fun, err)
    }
  }
}
