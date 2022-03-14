import React from 'react';
import { Pencil, Trash } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import axios from 'axios';
import { ModalContext, DefaultOkOption, DefaultConfirmOption } from '../modals/ModalContext';
import EditRoleModal, { useEditRoleModal, useEditRoleModalOptions } from '../modals/editRoleModal';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : UserCard
 * @return {ReactNode}
 */
export default function UserCard({ user, display, refresh }) {
  const { changeOptions, toggle } = React.useContext(ModalContext);

  const { toggleEdit, visible } = useEditRoleModal();
  const { options, changeOptionsEdit } = useEditRoleModalOptions();
  const { defaultErrorHandler } = useDefaultErrorHandler();

  /**
   * call for user deletion
   * @param {*} user utilisateur
   */
  function deleteUser(user) {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/v1/users/${user.username}`)
      .then((res) => {
        const options = DefaultOkOption;
        options.text = [`L'Utilisateur' ${res.data.username} a été supprimé`];
        options.buttons = [
          {
            text: 'Ok',
            action: () => {
              refresh();
            },
          },
        ];
        changeOptions(options);
        toggle();
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * call for confirmation before user deletion
   * @param {*} user user a suppr
   */
  function triggerDeleteUser(user) {
    const options = DefaultConfirmOption;
    options.text = [`Confirmez vous la suppression de l'utilisateur ${user.username}?`];
    options.buttons = [
      {
        text: 'Oui',
        action: () => {
          deleteUser(user);
        },
      },
      {
        text: 'Non',
        action: () => {},
      },
    ];
    changeOptions(options);
    toggle();
  }

  /**
   * call for user update
   * @param {*} user utilisateur
   */
  function updateUser(user) {
    axios
      .get(`${process.env.PUBLIC_URL}/api/v1/roles`)
      .then((res) => {
        changeOptionsEdit({ user, roles: res.data });
        toggleEdit();
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  return (
    <div className="col-12" key={user.id}>
      <div className="card tempMargin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            {user.username}
            <div className="btn-group" role="group">
              <button type="button" className="btn btn-warning" onClick={(e) => updateUser(user)}>
                <Pencil />
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={(e) => triggerDeleteUser(user)}
              >
                <Trash />
              </button>
            </div>
            <EditRoleModal
              visible={visible}
              toggleEdit={toggleEdit}
              options={options}
            ></EditRoleModal>
          </div>
        </h5>
        <div className="card-body">
          <p className="card-text">
            email :<small className="text-muted">{user.email}</small>
          </p>
          {user.roles && (
            <p className="card-text">
              {user.roles.map((role, i) => {
                return (
                  <span key={`${i}`} className="badge badge-success badge-pill">
                    {role}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
UserCard.propTypes = {
  user: PropTypes.object,
  display: PropTypes.object,
  refresh: PropTypes.func,
};
