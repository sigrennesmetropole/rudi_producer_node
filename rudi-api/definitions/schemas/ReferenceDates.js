const mod = 'refDates'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
import {
  API_DATES_CREATED,
  API_DATES_DELETED,
  API_DATES_EDITED,
  API_DATES_EXPIRES,
  API_DATES_PUBLISHED,
  API_DATES_VALIDATED,
} from '../../db/dbFields.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { nowISO } from '../../utils/jsUtils.js'
import { logD } from '../../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
export const ReferenceDatesSchema = {
  [API_DATES_CREATED]: {
    type: Date,
    default: nowISO(),
  },
  [API_DATES_EDITED]: Date,
  [API_DATES_VALIDATED]: Date,
  [API_DATES_PUBLISHED]: Date,
  [API_DATES_EXPIRES]: Date,
  [API_DATES_DELETED]: Date,
}

function toISOString(dateStr) {
  try {
    return new Date(dateStr).toISOString()
  } catch (err) {
    throw new BadRequestError(`This is not a date: '${dateStr}'`)
  }
}

function toEpoch(dateStr) {
  try {
    return new Date(dateStr).getTime()
  } catch (err) {
    throw new BadRequestError(`This is not a date: '${dateStr}'`)
  }
}

export function checkDates(datesObj, firstDateProp, secondDateProp, shouldInitialize) {
  const fun = 'checkDates'
  try {
    // logT(mod, fun, ``)
    if (!datesObj) return

    if (!datesObj[secondDateProp]) {
      if (datesObj[firstDateProp] && shouldInitialize)
        datesObj[secondDateProp] = datesObj[firstDateProp]
      return
    }

    const date1 = toEpoch(datesObj[firstDateProp])
    const date2 = toEpoch(datesObj[secondDateProp])

    logD(
      mod,
      fun,
      `${firstDateProp}: ${toISOString(date1)} ${
        date1 <= date2 ? '<=' : '>'
      } ${secondDateProp}: ${toISOString(date2)}`
    )
    if (date1 <= date2) return true

    throw new BadRequestError(
      `Date '${secondDateProp}' = '${toISOString(date2)}' should be subsequent ` +
        `to '${firstDateProp}' = '${toISOString(date1)}' `
    )
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export default ReferenceDatesSchema
