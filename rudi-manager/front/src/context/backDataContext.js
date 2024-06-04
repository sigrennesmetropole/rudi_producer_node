import axios from 'axios'
import PropTypes from 'prop-types'
import React, { createContext, useContext, useEffect, useState } from 'react'

import { getApiFront } from '../utils/frontOptions'
import { JwtContext } from './jwtContext'

let cachedBackValues
const getCachedBackData = async (token) => {
  try {
    // User not logged in: default values
    if (!token) {
      cachedBackValues = null
      return defaultBackValues
    }
    if (cachedBackValues?.formUrl) return cachedBackValues

    cachedBackValues = (await axios.get(getApiFront('init-data?lang=fr')))?.data
    // console.info('Back vals:', cachedBackValues)
    return cachedBackValues
  } catch (err) {
    console.error('E (callBackend)', err)
    cachedBackValues = null
    return defaultBackValues
  }
}

/**
 * We use this context to memorize
 * - the URL for the console formular (formUrl)
 * - the theme labels
 */
const defaultBackValues = {
  themeLabels: {}, // the theme labels
  formUrl: '', // the URL for the console formular
  apiExtUrl: '', // the API module external URL
  portalConnected: false, // True if this RUDI node is connected to a RUDI portal
  appTag: '', // this RUDI node version
  gitHash: '', // last git hash
}

export const BackDataContext = createContext(defaultBackValues)

BackDataContextProvider.propTypes = { children: PropTypes.object }
/**
 * Returns the app general Context
 * @param {Object} children
 * @return {React.Context.Provider}
 */
export function BackDataContextProvider({ children }) {
  const { token } = useContext(JwtContext)

  const [appInfo, setAppInfo] = useState({})

  useEffect(() => {
    const getBackData = async () => setAppInfo(await getCachedBackData(token))
    getBackData()
  }, [token])

  return <BackDataContext.Provider value={{ appInfo }}>{children}</BackDataContext.Provider>
}
