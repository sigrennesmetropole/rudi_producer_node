import axios from 'axios'

import PropTypes from 'prop-types'
import React, { useState } from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Modal from 'react-bootstrap/Modal'
import Row from 'react-bootstrap/Row'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { VALID_EMAIL, VALID_NOT_EMPTY_USERNAME } from './validation'

const urlUser = 'api/secu/users'
const modalTitle = 'Ajouter un nouvel utilisateur'
const modalSubmitBtnTxt = 'Sauver'

const validation = {
  username: [VALID_NOT_EMPTY_USERNAME],
  email: [VALID_EMAIL],
}

AddUserModal.propTypes = {
  roleList: PropTypes.array.isRequired,
  visible: PropTypes.bool.isRequired,
  toggleEdit: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
}

/**
 * AddUserModal component
 * @param {*} param0 Modal properties
 * @return {ReactNode} AddUserModal html component
 */
export default function AddUserModal({ roleList, visible, toggleEdit, refresh }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()
  const [userInfo, setUserInfo] = useState({})

  const hasErrors = (prop, val) => {
    if (!userInfo) {
      // console.error('T (hasErrors) No userInfo')
      return true
    }
    if (!val) val = userInfo[prop]
    if (prop === 'roles') {
      return !(Array.isArray(val) && val.length > 0) ? 'Au moins un rôle doit être défini' : false
    }

    if (!val) {
      // console.error(`T (hasErrors) Required: '${prop}'`)
      return `Ce champ est requis: '${prop}'`
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
    prop ? !errors[prop] : !errors.username && !errors.email && !errors.roles

  const editUserInfo = (prop, val) => {
    setErrors((errors) => ({ ...errors, [prop]: hasErrors(prop, val) }))
    setUserInfo((userInfo) => ({ ...userInfo, [prop]: val }))
  }

  const isInUserRole = (role, rolesList) =>
    !!(rolesList && rolesList.findIndex((element) => element === role.role) >= 0)

  const handleChange = (event) => {
    const prop = event.target.id
    const val = event.target.value
    editUserInfo(prop, val)
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
  const resetState = () => setUserInfo(() => ({}))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isValid()) {
      await sendUserInfo()
      resetState()
      toggleEdit()
      refresh()
    }
  }

  /**
   * call for user_role deletion
   * @param {*} role role
   * @param {*} user utilisateur
   */
  const sendUserInfo = async () => {
    try {
      if (!userInfo) {
        console.error('T (sendUserInfo) No user info!')
        return
      }
      await axios.post(`${urlUser}`, userInfo)
      // console.log('T (add.sendingUserInfo)', userInfo)
      // const res = await axios.post(`${urlUser}`, userInfo)
      // console.log('T (add.sendUserInfo)', res.data)
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
                {roleList?.map((role) => (
                  <Form.Check
                    key={role.role}
                    label={`${role.role} (${role.desc})`}
                    id={role.role}
                    value={isInUserRole(role, userInfo?.roles)}
                    onChange={handleRoleChange}
                    isInvalid={hasErrors('roles')}
                  />
                ))}
                <Form.Control.Feedback type="invalid" tooltip>
                  {errors.roles}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
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

export const useAddUserModal = () => {
  const [isVisibleAddModal, setIsVisibleAddModal] = useState(false)
  /**
   * toggle l'affichage de la modal
   * @return {void}
   */
  const toggleAddModal = () => setIsVisibleAddModal(!isVisibleAddModal)
  return { isVisibleAddModal, toggleAddModal }
}
