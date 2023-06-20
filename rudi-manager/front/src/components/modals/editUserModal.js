import axios from 'axios'

import React, { useState } from 'react'
import PropTypes from 'prop-types'

import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import InputGroup from 'react-bootstrap/InputGroup'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { VALID_EMAIL, VALID_NOT_EMPTY_USERNAME } from './validation'
// import { showObj } from '../../utils/utils'

const urlUser = 'api/secu/users'
const modalTitle = 'Modifier l‘utilisateur'
const modalSubmitBtnTxt = 'Sauver'

const validation = {
  username: [VALID_NOT_EMPTY_USERNAME],
  email: [VALID_EMAIL],
}

EditUserModal.propTypes = {
  user: PropTypes.object.isRequired,
  roleList: PropTypes.array.isRequired,
  visible: PropTypes.bool.isRequired,
  toggleEdit: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
}

/**
 * EditUserModal component
 * @param {*} props Modal properties
 * @return {ReactNode} EditUserModal html component
 */
export default function EditUserModal({ user, roleList, visible, toggleEdit, refresh }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()
  const [userInfo, setUserInfo] = useState(user)

  const hasErrors = (prop, val) => {
    if (!userInfo) return true
    if (!val) val = userInfo[prop]
    if (prop === 'roles')
      return !(Array.isArray(val) && val.length > 0) ? 'Au moins un rôle doit être défini' : false

    if (!val) {
      // console.error('T (hasErrors)', prop, user[prop])
      return 'Ce champ est requis'
    }
    let isInvalid
    validation[prop]?.map((valid) => {
      if (!`${val}`.match(valid[0])) isInvalid = valid[1].replace('{VALUE}', val)
    })
    return isInvalid
  }

  const [errors, setErrors] = useState({
    username: hasErrors('username'),
    email: hasErrors('email'),
    roles: hasErrors('roles'),
  })
  const isValid = (prop) =>
    !!prop ? !errors[prop] : !errors.username && !errors.email && !errors.roles

  const editUserInfo = (prop, val) => {
    setErrors((errors) => {
      return { ...errors, [prop]: hasErrors(prop, val) }
    })
    setUserInfo((userInfo) => {
      return { ...userInfo, [prop]: val }
    })
  }

  const isInUserRole = (userRoles, role) =>
    !!(userRoles?.findIndex((element) => element === role.role) >= 0)

  const handleChange = (event) => {
    const prop = event.target.id
    const val = event.target.value
    // console.log('T (handleChange)', prop, '=>', val)
    editUserInfo(prop, val)
    // if (errors[prop]) console.error('(handleChange) errorDetected:', errors[prop])
    // console.log('T (handleChange) userInfo after:', showObj(userInfo))
  }

  const handleRoleChange = (event) => {
    const toggledRole = event.target.id
    const userRoles = userInfo?.roles
    let nextUserRoles
    if (!userRoles || userRoles.length == 0) {
      nextUserRoles = [toggledRole]
    } else {
      nextUserRoles = []
      let wasFound = false
      userRoles.map((actualRole) => {
        // console.log(actualRole)
        if (actualRole !== toggledRole) nextUserRoles.push(actualRole)
        else wasFound = true // toggledRole is skipped
      })
      if (!wasFound) nextUserRoles.push(toggledRole)
    }
    // console.log('(handleRoleChange) usrRoles:', userRoles, '=>', nextUserRoles)
    editUserInfo('roles', nextUserRoles)
  }
  // const hasError = (prop) => validateProp(prop, userInfo[prop]);

  // const handleClick = (event) => {
  //   const form = event.currentTarget;
  //   console.log('handleClick', event);
  //   if (form.checkValidity() === false) {
  //     event.preventDefault();
  //     event.stopPropagation();
  //   }

  //   // toggleEdit()
  // };

  const handleSubmit = async (event) => {
    event.preventDefault()
    // console.log('(handleSubmit)', 'username:', event.target.username.value)
    // console.log('(handleSubmit)', 'email:', event.target.email.value)
    // console.log('(handleSubmit)', 'userInfo:', userInfo)
    // if (!event.target.checkValidity()) event.stopPropagation()
    if (isValid()) {
      await sendUserInfo(userInfo)
      toggleEdit()
      refresh()
    } else {
      console.warn('(handleSubmit)', 'userInfo:', userInfo)
      console.warn('(handleSubmit)', 'errors:', errors)
    }
  }

  /**
   * Update user information
   */
  const sendUserInfo = async () => {
    try {
      // console.log('T (edit.sendingUserInfo)', userInfo)
      const res = await axios.put(urlUser, userInfo)
      // console.log('T (edit.sendUserInfo)', res.data)
    } catch (err) {
      defaultErrorHandler(err)
    }
  }

  return (
    <Modal show={visible} onHide={toggleEdit} animation={false}>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Group as={Col} id="formName" controlId="username">
              <Form.Label>Nom</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  required
                  type="text"
                  placeholder="Nom"
                  defaultValue={userInfo?.username}
                  onChange={handleChange}
                  isValid={isValid('username')}
                  isInvalid={hasErrors('username')}
                />
                <Form.Control.Feedback type="invalid" tooltip>
                  {errors.username}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} id="formEmail" controlId="email">
              <Form.Label>E-mail</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  required
                  type="text"
                  placeholder="e-mail"
                  defaultValue={userInfo?.email}
                  onChange={handleChange}
                  isValid={isValid('email')}
                  isInvalid={hasErrors('email')}
                />
                <Form.Control.Feedback type="invalid" tooltip>
                  {errors.email}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group className="mb-1" id="formRoles" controlId="roles">
              <Form.Label>Rôles</Form.Label>
              <InputGroup hasValidation>
                {roleList.map((role) => (
                  <Form.Check
                    key={role.role}
                    label={`${role.role} (${role.desc})`}
                    id={role.role}
                    defaultChecked={isInUserRole(userInfo?.roles, role)}
                    value={isInUserRole(userInfo?.roles, role)}
                    onChange={handleRoleChange}
                    isInvalid={hasErrors('roles')}
                  />
                ))}
                <Form.Control.Feedback type="invalid" tooltip>
                  {errors.roles}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>{' '}
          </Row>
          <Row>
            <Form.Group as={Col}>
              <p className="card-text on-right">
                id : <small className="text-muted">{userInfo?.id}</small>
              </p>
            </Form.Group>
            {/* <pre>{JSON.stringify(userInfo, null, 2)}</pre>
            <pre>{!isValid() ? JSON.stringify(errors, null, 2) : ''}</pre> */}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            type="submit"
            className="on-right"
            // onClick={handleClick}
            // onClick={() => toggleEdit()}
          >
            {modalSubmitBtnTxt}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export const useEditUserModal = () => {
  const [isVisibleEditModal, setVisible] = useState(false)
  /**
   * toggle l'affichage de la modal
   * @return {void}
   */
  const toggleEditModal = () => setVisible(!isVisibleEditModal)
  return { isVisibleEditModal, toggleEditModal }
}

export const useEditUserModalOptions = () => {
  const [editModalOptions, setOptions] = useState({})
  /**
   * change la valeur des options
   * @param {*} param nouvelles options
   * @return {void}
   */
  const changeEditModalOptions = (param) => setOptions(param)
  return { editModalOptions, changeEditModalOptions }
}
