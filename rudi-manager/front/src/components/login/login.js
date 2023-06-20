import './login.css'

import axios from 'axios'

import React, { useState } from 'react'
import PropTypes from 'prop-types'

import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/esm/Button'
import InputGroup from 'react-bootstrap/InputGroup'
import { Eye, EyeSlash } from 'react-bootstrap-icons'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import GenericModal, { useGenericModal, useGenericModalOptions } from '../modals/genericModal'

export const btnColor = 'success'
export const btnText = 'Accéder à l‘application'

export const showPill = (condition, showState) =>
  condition ? (
    <div className={'login-pill text-bg-' + btnColor} onClick={showState}>
      {btnText}
    </div>
  ) : (
    ''
  )

Login.propTypes = {
  setToken: PropTypes.func.isRequired,
  setUserInfo: PropTypes.func.isRequired,
}

/**
 * Login component
 * @param {*} param0 (token hooks)
 * @return {ReactNode} Login html component
 */
export default function Login({ setToken, setUserInfo }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()
  // console.log('-- Login');
  const [username, setUserName] = useState('')
  const [password, setPassword] = useState('')

  const [isPwdShown, setPasswordShown] = useState(false)
  const togglePwdVisibility = () => setPasswordShown(!isPwdShown)
  const stateType = () => (isPwdShown ? 'text' : 'password')

  const { toggle, visible } = useGenericModal()
  const { options, changeOptions } = useGenericModalOptions()

  /**
   * is form valid?
   * @return {Boolean} return true is the form is valid
   */
  const isFormValid = () => username.length > 0 && password.length > 0

  /**
   * call server to log user
   * @param {*} credentials
   * @return {Promise} login promise
   */
  const loginUser = (credentials) =>
    axios
      .post('api/front/login', JSON.stringify(credentials), {
        headers: { 'Content-Type': 'application/json' },
      })
      .catch((error) => {
        const resMsg = error.response?.data
        let errMsg
        if (resMsg == 'No user found' || resMsg.startsWith('User not found or incorrect password'))
          errMsg = ['Utilisateur ou mot de passe incorrect']
        else if (resMsg.startsWith('Admin validation required for user')) {
          errMsg = [
            'Ce compte utilisateur requiert une validation : ',
            'veuillez contacter l‘administrateur de votre nœud Rudi ' +
              'pour qu‘il assigne un rôle à votre compte utilisateur.',
          ]
        } else errMsg = `Mot de passe incorrect`

        changeOptions({
          text: [errMsg],
          title: 'Une erreur est survenue',
          type: 'error',
          buttons: [
            {
              text: 'Ok',
              action: () => {},
            },
          ],
        })
        toggle()
      })

  /**
   * handle submit login form
   * @param {*} event
   */
  function handleSubmit(event) {
    event.preventDefault()
    loginUser({
      username,
      password,
    })
      .then((res) => {
        setToken()
        const userInfo = res?.data
        // console.debug('T (Login) user', userInfo)
        setUserInfo(userInfo)
      })
      .catch((err) => {
        console.error('T (handleSubmit) handleSubmit ERR', err)
        defaultErrorHandler(err)
      })
  }

  const inputPassword = () => {
    return (
      <div className="login-form">
        <Form.Group size="lg" controlId="pwd">
          <Form.Label>Mot de passe</Form.Label>
          <InputGroup className="login-pwd">
            <Form.Control
              type={stateType()}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="warning" id="button-addon2" onClick={togglePwdVisibility}>
              {isPwdShown ? <Eye></Eye> : <EyeSlash></EyeSlash>}
            </Button>
          </InputGroup>
        </Form.Group>
      </div>
    )
  }

  return (
    <div className="Login">
      <GenericModal
        visible={visible}
        toggle={toggle}
        options={options}
        animation={false}
      ></GenericModal>
      <Form onSubmit={handleSubmit}>
        <div className="login-form">
          <Form.Group size="lg" controlId="usr">
            <Form.Label>Nom</Form.Label>
            <Form.Control
              autoFocus={true}
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => setUserName(e.target.value)}
            />
          </Form.Group>
        </div>
        {inputPassword()}
        <div className="login-button">
          <Button type="submit" variant={btnColor} disabled={!isFormValid()}>
            {btnText}
          </Button>
        </div>
      </Form>
    </div>
  )
}
