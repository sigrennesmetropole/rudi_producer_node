import axios from 'axios'
import PropTypes from 'prop-types'
import React, { createContext, useContext, useEffect, useState } from 'react'

import { getApiFront } from '../utils/frontOptions'
import { JwtContext } from './jwtContext'

const hasRoleAdmin = (userInfo) =>
  userInfo?.roles?.findIndex((role) => role === 'SuperAdmin' || role === 'Admin') > -1 || false

const hasRoleEditor = (userInfo) =>
  userInfo?.roles?.findIndex(
    (role) => role === 'SuperAdmin' || role === 'Admin' || role === 'Editeur'
  ) > -1 || false

const callAuthBackend = async (token) => {
  try {
    return !token ? {} : (await axios.get(getApiFront('user-info')))?.data
  } catch (err) {
    console.error('E (callAuthBackend)', err)
    return {}
  }
}
/**
 * We use this context to memorize
 * - the user info (username + roles)
 * - the function to update the user info
 * - the display flags that set if the user sees the Users menu (isAdmin) + the Data management menu (isEditor))
 */
const defaultUserProfile = {
  userInfo: {}, // the user info (username + roles)
  isEditor: false, // set true if the user sees the Data management menu ("Gestion")
  isAdmin: false, // set true if the user sees  the Users menu ("Utilisateurs")
}

export const UserContext = createContext(defaultUserProfile)

UserContextProvider.propTypes = { children: PropTypes.object }
/**
 * Returns the user information as a context
 * @param {Object} children
 * @return {React.Context.Provider}
 */
export function UserContextProvider({ children }) {
  const { token } = useContext(JwtContext)

  const [userInfo, setUserInfo] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditor, setIsEditor] = useState(false)

  useEffect(() => {
    setIsAdmin(hasRoleAdmin(userInfo))
    setIsEditor(hasRoleEditor(userInfo))
  }, [userInfo])

  useEffect(() => {
    const updateUserInfo = async () => setUserInfo(await callAuthBackend(token))
    updateUserInfo()
  }, [token])

  return (
    <UserContext.Provider value={{ userInfo, isAdmin, isEditor }}>{children}</UserContext.Provider>
  )
}
