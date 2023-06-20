import { useState } from 'react'

export const getCookie = (name) =>
  document.cookie
    ?.split('; ')
    ?.find((row) => row.startsWith(`${name}`))
    ?.split('=')[1]

/**
 * Token hooks
 * @return {object} Token hooks
 */
export default function useToken() {
  // console.log('-- useToken');

  const getToken = () => getCookie('pmFrontToken')

  const [token, setToken] = useState(getToken())
  const updateToken = () => setToken(getToken())

  return { token, updateToken }
}
