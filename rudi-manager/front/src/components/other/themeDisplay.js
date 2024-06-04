import PropTypes from 'prop-types'
import React, { useContext, useEffect, useState } from 'react'
import { BackDataContext } from '../../context/backDataContext'

ThemeDisplay.propTypes = { value: PropTypes.string }

/**
 * Composant : ThemeDisplay
 * @return {ReactNode}
 */
export default function ThemeDisplay({ value }) {
  const { appInfo } = useContext(BackDataContext)
  const [themeLabel, setThemeLabel] = useState(value)

  useEffect(() => setThemeLabel(appInfo.themeLabels?.[value] || value), [appInfo])
  // console.log('T ThemeDisplay.value:', value)
  // console.log('T ThemeDisplay.themeLabel:', themeLabel)
  // console.log('T themeLabels:', value, appInfo.themeLabels)
  // console.log('T themeLabels:', appInfo.themeLabels?.[value])

  return <span>{themeLabel}</span>
}
