import React from 'react'
import PropTypes from 'prop-types'

import GenericModal, { useGenericModal, useGenericModalOptions } from './genericModal'

export const ModalContext = React.createContext('modal')
export const useModalContext = () => React.useContext(ModalContext)
const { Provider } = ModalContext

ModalProvider.propTypes = { children: PropTypes.node }

/**
 * Provides a context for modals
 * @param {*} param0
 * @return {Provider}
 */
export default function ModalProvider({ children }) {
  const { toggle, visible } = useGenericModal()
  const { options, changeOptions } = useGenericModalOptions()
  return (
    <Provider value={{ toggle, visible, options, changeOptions }}>
      <GenericModal
        visible={visible}
        toggle={toggle}
        options={options}
        animation={false}
      ></GenericModal>
      {children}
    </Provider>
  )
}

export const DefaultErrorOption = {
  text: ``,
  title: 'Une erreur est survenue',
  type: 'error',
  buttons: [{ text: 'Ok', action: () => {} }],
}
export const DefaultOkOption = {
  text: ``,
  title: 'Succès',
  type: 'success',
  buttons: [{ text: 'Ok', action: () => {} }],
}
export const DefaultConfirmOption = {
  text: `Confirmez vous l'action?`,
  title: 'Confirmation',
  type: 'confirm',
  buttons: [{ text: 'Oui', action: () => {} }],
}

export const getOptOk = (label, action = () => {}, caption) => {
  const opt = DefaultOkOption
  opt.text = [label]
  opt.buttons = [{ text: 'Ok', action: () => action() }]
  if (caption) opt.caption = caption
  return opt
}
export const getOptConfirm = (label, action = () => {}) => {
  const opt = DefaultConfirmOption
  opt.text = [label]
  opt.buttons = [
    { text: 'Oui', action: () => action() },
    { text: 'Non', action: () => {} },
  ]
  return opt
}
