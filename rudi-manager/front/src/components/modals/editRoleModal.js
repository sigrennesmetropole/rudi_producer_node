import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import { Plus, Trash } from 'react-bootstrap-icons';
import axios from 'axios';
import { ModalContext, DefaultOkOption } from '../modals/ModalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * EditRoleModal component
 * param {*} param0 (token hooks)
 * @return {ReactNode} EditRoleModal html component
 */
export default function EditRoleModal({ visible, toggleEdit, options }) {
  const { changeOptions, toggle } = React.useContext(ModalContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  const isInUserRole = (role, user) => {
    return user.roles ? user.roles.findIndex((element) => element === role.role) : -1;
  };

  /**
   * call for user_role deletion
   * @param {*} role role
   * @param {*} user utilisateur
   */
  function deleteUserRole(role, user) {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/v1/user-roles/${user.id}/${role.role}`)
      .then((res) => {
        user.roles.splice(
          user.roles.findIndex((element) => element === role.role),
          1,
        );
        const options = DefaultOkOption;
        options.text = [`Le role ${role.role} a été supprimé pour l'utilisateur ${user.username}`];
        changeOptions(options);
        toggle();
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * call for user_role addition
   * @param {*} role role
   * @param {*} user utilisateur
   */
  function addUserRole(role, user) {
    axios
      .post(
        `${process.env.PUBLIC_URL}/api/v1/user-roles`,
        JSON.stringify({ userId: user.id, role: role.role }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      .then((res) => {
        if (!user.roles) {
          user.roles = [];
        }
        user.roles.push(role.role);
        const options = DefaultOkOption;
        options.text = [`Le role ${role.role} a été ajouté à l'utilisateur ${user.username}`];
        changeOptions(options);
        toggle();
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  return (
    <>
      <Modal show={visible} onHide={toggleEdit}>
        <Modal.Header closeButton>
          <Modal.Title>Edition des Roles de {options.user && options.user.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {options.roles &&
            options.roles.map((role, i) => {
              return (
                <span key={i}>
                  {isInUserRole(role, options.user) < 0 && (
                    <Button
                      variant="light"
                      onClick={() => {
                        addUserRole(role, options.user);
                      }}
                    >
                      {role.role}
                      <Plus color="green" />
                    </Button>
                  )}
                  {isInUserRole(role, options.user) >= 0 && (
                    <Button
                      variant="light"
                      onClick={() => {
                        deleteUserRole(role, options.user);
                      }}
                    >
                      {role.role} <Trash color="red" />
                    </Button>
                  )}
                </span>
              );
            })}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => {
              toggleEdit();
            }}
          >
            Terminer
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
EditRoleModal.propTypes = {
  visible: PropTypes.bool,
  toggleEdit: PropTypes.func,
  options: PropTypes.object,
};

export const useEditRoleModal = () => {
  const [visible, setVisible] = useState(false);
  /**
   * toggle l'affichage de la modal
   * @return {void}
   */
  function toggleEdit() {
    setVisible(!visible);
  }
  return { toggleEdit, visible };
};

export const useEditRoleModalOptions = () => {
  const [options, setOptions] = useState({});
  /**
   * change la valeur des options
   * @param {*} param nouvelles options
   * @return {void}
   */
  function changeOptionsEdit(param) {
    setOptions(param);
  }
  return { changeOptionsEdit, options };
};
