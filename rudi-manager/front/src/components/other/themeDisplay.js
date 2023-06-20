import React from 'react'
import PropTypes from 'prop-types'
import { usePMFrontContext } from '../../generalContext'

ThemeDisplay.propTypes = {
  value: PropTypes.string,
}

/**
 * Composant : ThemeDisplay
 * @return {ReactNode}
 */
export default function ThemeDisplay({ value }) {
  const { appInfo } = usePMFrontContext()
  /**
   * get Theme Label
   * @return {String} text to display
   */
  const getLabel = () =>
    appInfo.themeLabels && appInfo.themeLabels[value] ? appInfo.themeLabels[value] : value

  return <span>{getLabel()}</span>
}
