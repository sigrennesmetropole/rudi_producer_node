import React from 'react'
import PropTypes from 'prop-types'

const BYTE_UNITS = ['o', 'ko', 'Mo', 'Go', 'To']
/**
 * Composant : FileSizeDisplay
 * @return {ReactNode}
 */
export default function FileSizeDisplay({ number }) {
  /**
   * get size Label
   * inspire from https://github.com/sindresorhus/pretty-byte
   * @return {String} text to display
   */
  function getLabel() {
    if (!Number.isFinite(number))
      throw new TypeError(`Expected a finite number, got ${typeof number}: ${number}`)

    const UNITS = BYTE_UNITS

    if (number < 1) return Number(number).toLocaleString('fr', {}) + ' ' + UNITS[0]

    const exponent = Math.min(Math.floor(Math.log10(number) / 3), UNITS.length - 1)
    number /= Math.pow(1000, exponent)
    number = number.toPrecision(3)

    return Number(number).toLocaleString('fr') + ' ' + UNITS[exponent]
  }
  return number ? <span className="file-size-pill text-bg-primary">{getLabel()}</span> : ''
}
FileSizeDisplay.propTypes = {
  number: PropTypes.number,
}
