import axios from 'axios'
import React from 'react'
import PropTypes from 'prop-types'
import { ArrowCounterclockwise, Pencil, Trash } from 'react-bootstrap-icons'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { getOptOk, getOptConfirm, useModalContext } from '../modals/genericModalContext'
import EditUserModal, { useEditUserModal } from '../modals/editUserModal'

const resetPwdConfirmMsg = (id) =>
  `Confirmez vous la réinitialisation du mot de passe de l'utilisateur ${id}?`
const resetPwdCaption =
  `L'utilisateur devra utiliser l'invite "Modifier le mot de passe" pour changer son mot de passe. ` +
  `Le champ "mot de passe actuel" pourra être un simple espace`

const resetPwdMsg = (id) => `Le mot de passe de l'utilisateur ${id} a été réinitialisé.`

const resetPasswordUrl = (id) => `api/secu/users/${id}/reset-password`

const deleteConfirmMsg = (id) => `Confirmez vous la suppression de l'utilisateur ${id}?`
const deleteMsg = (id) => `L'utilisateur ${id} a été supprimé`
const deleteUrl = (id) => `api/secu/users/${id}`

UserCard.propTypes = {
  user: PropTypes.object,
  roleList: PropTypes.array,
  display: PropTypes.object,
  refresh: PropTypes.func,
}

// put('/users/:id/reset-password'
/**
 * Composant : UserCard
 * @return {ReactNode}
 */
export default function UserCard({ user, roleList, refresh }) {
  const { changeOptions, toggle } = useModalContext()
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const { isVisibleEditModal, toggleEditModal } = useEditUserModal()
  // const { editModalOptions, changeEditModalOptions } = useEditUserModalOptions()

  /**
   * call for user deletion
   * @param {*} user utilisateur
   * @return {void}
   */
  const deleteUser = () =>
    axios
      .delete(deleteUrl(user.id))
      .then((res) => {
        changeOptions(getOptOk(deleteMsg(user.username), () => refresh()))
        toggle()
      })
      .catch((err) => defaultErrorHandler(err))

  /**
   * call for confirmation before user deletion
   * @return {void}
   */
  const triggerDeleteUser = () => {
    changeOptions(getOptConfirm(deleteConfirmMsg(user.username), () => deleteUser()))
    toggle()
  }

  /**
   * Call for reseting a user's password
   * @return {void}
   */
  const resetPassword = () =>
    axios
      .put(resetPasswordUrl(user.id))
      .then((res) => {
        changeOptions(getOptOk(resetPwdMsg(user.username), () => refresh(), resetPwdCaption))
        toggle()
      })
      .catch((err) => defaultErrorHandler(err))

  /**
   * call for confirmation before resetting user password
   * @return {void}
   */
  const triggerResetPwd = () => {
    changeOptions(getOptConfirm(resetPwdConfirmMsg(user.username), () => resetPassword(user)))
    toggle()
  }

  /**
   * call for user update
   * @return {void}
   */
  const updateUser = () => {
    toggleEditModal()
    refresh()
  }

  return (
    <div className="col-12" key={user.id}>
      <div className="card card-margin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            {user.username}
            <div className="btn-group" role="group">
              <button type="button" className="btn btn-warning" onClick={() => updateUser(user)}>
                <Pencil />
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => triggerResetPwd(user)}
              >
                <ArrowCounterclockwise />
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => triggerDeleteUser(user)}
              >
                <Trash />
              </button>
            </div>
            <EditUserModal
              visible={isVisibleEditModal}
              toggleEdit={toggleEditModal}
              user={user}
              roleList={roleList}
              refresh={refresh}
            ></EditUserModal>
          </div>
        </h5>
        <div className="card-body">
          <p className="card-text">
            id&nbsp;: <small className="text-muted">{user.id}</small>
          </p>
          <p className="card-text">
            e-mail&nbsp;: <small className="text-muted">{user.email}</small>
          </p>
          {user.roles && (
            <p className="card-text">
              {user.roles.map((role, i) => (
                <span key={`${i}`} className="badge rounded-pill text-bg-success">
                  {role}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
