import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './login.css';
import PropTypes from 'prop-types';
import axios from 'axios';
import GenericModal, { useGenericModal, useGenericModalOptions } from '../modals/genericModal';

/**
 * Register component
 * @param {*} param0 (token hooks)
 * @return {ReactNode} Register html component
 */
export default function Register({ backToLogin }) {
  const [username, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { toggle, visible } = useGenericModal();
  const { options, changeOptions } = useGenericModalOptions();

  /**
   * is form valid?
   * @return {Boolean} return true is the form is valid
   */
  function validateForm() {
    return username.length > 0 && password.length > 0;
  }
  /**
   * call server to Register user
   * @param {*} credentials
   * @return {Promise} Register promise
   */
  function registerUser(credentials) {
    return axios.post(`${process.env.PUBLIC_URL}/api/v1/register`, JSON.stringify(credentials), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * handle submit Register form
   * @param {*} event
   */
  function handleSubmit(event) {
    event.preventDefault();
    registerUser({
      username,
      email,
      password,
      confirmPassword,
    })
      .then((res) => {
        changeOptions({
          text: [`L'utilisateur '${res.data.username}' a bien été créé.`],
          title: 'Action Validée',
          type: 'success',
          buttons: [
            {
              text: 'Connexion',
              action: () => {
                backToLogin();
              },
            },
          ],
        });
        toggle();
      })
      .catch((error) => {
        changeOptions({
          text: ['' + error.response.data],
          title: 'Une erreur est survenue',
          type: 'error',
          buttons: [
            {
              text: 'Ok',
              action: () => {},
            },
          ],
        });
        toggle();
      });
  }

  return (
    <div className="Login">
      <GenericModal visible={visible} toggle={toggle} options={options}></GenericModal>
      <Form onSubmit={handleSubmit}>
        <Form.Group size="lg" controlId="username">
          <Form.Label>User</Form.Label>
          <Form.Control
            autoFocus
            type="text"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
          />
        </Form.Group>
        <Form.Group size="lg" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            autoFocus
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>
        <Form.Group size="lg" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>
        <Form.Group size="lg" controlId="confirmPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Form.Group>
        <Button block size="lg" type="submit" disabled={!validateForm()}>
          Register
        </Button>
      </Form>
    </div>
  );
}
Register.propTypes = {
  backToLogin: PropTypes.func.isRequired,
};
