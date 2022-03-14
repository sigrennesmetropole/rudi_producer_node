import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './login.css';
import PropTypes from 'prop-types';
import axios from 'axios';
import GenericModal, { useGenericModal, useGenericModalOptions } from '../modals/genericModal';

/**
 * Login component
 * @param {*} param0 (token hooks)
 * @return {ReactNode} Login html component
 */
export default function Login({ setToken }) {
  const [username, setUserName] = useState('');
  const [password, setPassword] = useState('');

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
   * call server to log user
   * @param {*} credentials
   * @return {Promise} login promise
   */
  function loginUser(credentials) {
    return axios
      .post(`${process.env.PUBLIC_URL}/api/v1/login`, JSON.stringify(credentials), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .catch((error) => {
        changeOptions({
          text: [`Echec de connexion`],
          title: 'une erreur est survenue',
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

  /**
   * handle submit login form
   * @param {*} event
   */
  function handleSubmit(event) {
    event.preventDefault();
    loginUser({
      username,
      password,
    }).then((res) => setToken());
  }

  return (
    <div className="Login">
      <GenericModal visible={visible} toggle={toggle} options={options}></GenericModal>
      <Form onSubmit={handleSubmit}>
        <Form.Group size="lg" controlId="email">
          <Form.Label>User</Form.Label>
          <Form.Control
            autoFocus
            type="text"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
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
        <Button block size="lg" type="submit" disabled={!validateForm()}>
          Login
        </Button>
      </Form>
    </div>
  );
}
Login.propTypes = {
  setToken: PropTypes.func.isRequired,
};
