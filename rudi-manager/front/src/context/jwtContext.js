import PropTypes from 'prop-types'
import React, { createContext, useState } from 'react'

import { getCookie } from '../utils/utils'

const FRONT_JWT_NAME = 'pmFrontToken'

/**
 * Gets the JSON Web token delivered by the backend for this user
 * @return {string} the JSON Web token for this user
 */
const getToken = () => getCookie(FRONT_JWT_NAME)

export const JwtContext = createContext('')
JwtContextProvider.propTypes = { children: PropTypes.object }
/**
 * Returns the current user token
 * @param {Object} children
 * @return {React.Context.Provider}
 */
export function JwtContextProvider({ children }) {
  const [token, setToken] = useState(getToken())
  const updateToken = () => setToken(getToken())
  return <JwtContext.Provider value={{ token, updateToken }}> {children} </JwtContext.Provider>
}
