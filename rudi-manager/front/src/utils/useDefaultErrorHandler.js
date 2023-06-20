import React from 'react'

import { DefaultErrorOption, ModalContext } from '../components/modals/genericModalContext'

/**
 * defaultErrorHandler hooks
 * @return {*} defaultErrorHandler hooks
 */
export default function useDefaultErrorHandler() {
  const { changeOptions, toggle } = React.useContext(ModalContext)
  const errorHandler = (err) => {
    // console.error(err)
    const options = DefaultErrorOption
    if (!err.response) {
      options.text = [displayMsg(err.message)]
    } else {
      if (err.response.data?.message) {
        options.text = [displayMsg(err.response.data.message)]
        if (err.response.data.moreInfo?.message)
          options.text.push(displayMsg(err.response.data.moreInfo.message))
      } else {
        if (err.response?.data?.status == 'error') options.text = [displayMsg(err.response.data.msg)]
        else options.text = [displayMsg(err.response.data)]
      }
    }

    changeOptions(options)
    toggle()
  }

  const displayMsg = (msg) => (typeof msg == 'string' ? msg : JSON.stringify(msg))

  return {
    defaultErrorHandler: errorHandler,
  }
}
