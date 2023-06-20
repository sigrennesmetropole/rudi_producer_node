import React, { createContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import axios from 'axios'

import useToken from './useToken'
import { getApiData, getApiFront, getApiOpen } from './utils/frontOptions'

/**
 * We use this context to memorize
 * - the URL for the console formular (formUrl)
 * - the theme labels
 * - the user info (username + roles)
 * - the display flags that set if the user sees the Users menu (isAdmin) + the Data management menu (isEditor))
 */
export const defaultFrontContext = {
  themeLabels: {}, // the theme labels
  userInfo: {}, // the user info (username + roles)
  formUrl: '', // the URL for the console formular
  isEditor: false, // set true if the user sees the Data management menu ("Gestion")
  isAdmin: false, // set true if the user sees  the Users menu ("Utilisateurs")
}
const PMFrontContext = createContext(defaultFrontContext)

export const usePMFrontContext = () => React.useContext(PMFrontContext)

PMFrontContextProvider.propTypes = {
  children: PropTypes.object,
}
/**
 * Returns the app general Context
 * @param {Object} param0
 * @return {React.Context.Provider}
 */
export function PMFrontContextProvider({ children }) {
  const { token } = useToken()

  const [appInfo, setAppInfo] = useState({})
  const [isLoaded, setIsLoaded] = useState(false)

  const isAdmin = (roles = []) =>
    roles.findIndex((role) => role === 'SuperAdmin' || role === 'Admin') > -1
  const isEditor = (roles = []) =>
    roles.findIndex((role) => role === 'SuperAdmin' || role === 'Admin' || role === 'Editeur') > -1

  useEffect(() => {
    const callBackApi = async () => {
      try {
        if (!token) {
          const values = await Promise.all([
            axios.get(getApiOpen('tag')),
            axios.get(getApiOpen('hash')),
          ])
          const backValues = Object.assign(defaultFrontContext, {
            appTag: `${values[0].data}`,
            gitHash: `${values[1].data}`,
          })
          return backValues
        }
        const values = await Promise.all([
          axios.get(getApiData('enum/themes/fr')),
          axios.get(getApiFront('user-info')),
          axios.get(getApiFront('form-url')),
          axios.get(getApiFront('ext-api-url')),
          axios.get(getApiOpen('tag')),
          axios.get(getApiOpen('hash')),
        ])
        const userInfo = values[1].data
        const formUrlReceived = `${values[2].data}`
        const apiExtUrlReceived = `${values[3].data}`
        const backValues = {
          themeLabels: values[0].data,
          userInfo,
          isEditor: !!isEditor(userInfo?.roles || []),
          isAdmin: !!isAdmin(userInfo?.roles || []),
          formUrl: formUrlReceived.endsWith('/') ? formUrlReceived : `${formUrlReceived}/`,
          apiExtUrl: apiExtUrlReceived.endsWith('/') ? apiExtUrlReceived : `${apiExtUrlReceived}/`,
          appTag: `${values[4].data}`,
          gitHash: `${values[5].data}`,
        }
        // console.debug('T (context.useEffect) backValues:', backValues)

        return backValues
      } catch (err) {
        console.error('E (callBackApi)', err)
        return defaultFrontContext
      }
    }

    const getBackData = async () => {
      setIsLoaded(false)
      const newData = await callBackApi()
      setAppInfo(newData)
      setIsLoaded(true)
    }

    getBackData()
  }, [token])

  const setUserInfo = (userInfo) => {
    setAppInfo((appInfo) => {
      return {
        ...appInfo,
        userInfo,
        isAdmin: isAdmin(userInfo?.roles || []),
        isEditor: isEditor(userInfo?.roles || []),
      }
    })
  }

  return (
    <PMFrontContext.Provider value={{ appInfo, isLoaded, setUserInfo }}>
      {children}
    </PMFrontContext.Provider>
  )
}
