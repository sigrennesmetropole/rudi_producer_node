import { useState } from 'react';

/**
 * Token hooks
 * @return {*} Token hooks
 */
export default function useToken() {
  const getCookie = (name) => {
    try {
      return document.cookie
        .split('; ')
        .find((row) => row.startsWith(name))
        .split('=')[1];
    } catch (error) {
      // console.log(error)
      return null;
    }
  };
  const getToken = () => {
    return getCookie('publicToken');
  };

  const [token, setToken] = useState(getToken());

  const saveToken = () => {
    setToken(getCookie('publicToken'));
  };

  return {
    updateToken: saveToken,
    token,
  };
}
