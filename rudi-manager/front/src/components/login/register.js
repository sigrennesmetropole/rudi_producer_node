import axios from 'axios'

import React, { useState } from 'react'
import PropTypes from 'prop-types'

import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import InputGroup from 'react-bootstrap/InputGroup'
import { Eye, EyeSlash } from 'react-bootstrap-icons'

import './login.css'
import GenericModal, { useGenericModal, useGenericModalOptions } from '../modals/genericModal'
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'

export const btnColor = 'warning'
export const btnText = 'Créer un compte'

export const showPill = (condition, showState) =>
  condition ? (
    <div className={'login-pill text-bg-' + btnColor} onClick={showState}>
      {btnText}
    </div>
  ) : (
    ''
  )

Register.propTypes = {
  backToLogin: PropTypes.func.isRequired,
}

/**
 * Register component
 * @param {*} param0 (token hooks)
 * @return {ReactNode} Register html component
 */
export default function Register({ backToLogin }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [username, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
   * call server to Register user
   * @param {*} credentials
   * @return {Promise} Register promise
   */
  const registerUser = (credentials) =>
    axios.post(`api/front/register`, JSON.stringify(credentials), {
      headers: {
        'Content-Type': 'application/json',
      },
    })

  /**
   * handle submit Register form
   * @param {*} event
   */
  function handleSubmit(event) {
    event.preventDefault()
    registerUser({
      username,
      email,
      password,
      confirmPassword,
    })
      .then((res) => {
        changeOptions({
          text: [`L'utilisateur '${username}' a bien été créé.`],
          title: 'Action Validée',
          type: 'success',
          buttons: [
            {
              text: 'Connexion',
              action: () => backToLogin(),
            },
          ],
        })
        toggle()
      })
      .catch((err) => {
        toggle()
        defaultErrorHandler(err)
      })
  }

  const formGroup = (id, label, val, type, onChangeMethod, autoCompl, hasFocus) => {
    return (
      <div className="login-form">
        <Form.Group size="lg" controlId={id}>
          <Form.Label>{label}</Form.Label>
          <Form.Control
            autoFocus={hasFocus}
            type={type}
            value={val}
            autoComplete={autoCompl}
            onChange={(e) => onChangeMethod(e.target.value)}
          />
        </Form.Group>
      </div>
    )
  }

  const inputPassword = (id, label, password, setPassword) => {
    return (
      <div className="login-form">
        <Form.Group size="lg" controlId={id}>
          <Form.Label>{label}</Form.Label>
          <InputGroup className="login-pwd">
            <Form.Control
              type={stateType()}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="warning" id={`button-${id}`} onClick={togglePwdVisibility}>
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
        {formGroup('username', 'Nom', username, 'text', setUserName, 'username', true)}
        {formGroup('email', 'E-mail', email, 'text', setEmail, 'email')}
        {inputPassword('pwd', 'Mot de passe', password, setPassword)}
        {inputPassword('pwd2', 'Confirmation du mot de passe', confirmPassword, setConfirmPassword)}
        <div className="login-button">
          <Button type="submit" variant={btnColor} disabled={!isFormValid()}>
            {btnText}
          </Button>
        </div>
      </Form>
    </div>
  )
}
