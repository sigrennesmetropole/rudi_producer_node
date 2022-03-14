import React, { useState } from 'react';
import { Plus, Pencil, Trash } from 'react-bootstrap-icons';
import axios from 'axios';
import { ModalContext, DefaultOkOption } from '../modals/ModalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : EditCard
 * @return {ReactNode}
 */
export default function EditCard({}) {
  const [editID, setEditID] = useState('');
  const { defaultErrorHandler } = useDefaultErrorHandler();

  const { changeOptions, toggle } = React.useContext(ModalContext);
  /**
   * met a jour le state lors de la modification de l'input de modification de JDD
   * @param {*} event event
   */
  const handleChange = (event) => {
    setEditID(event.target.value);
  };
  /**
   * call for user deletion
   */
  function deleteUser() {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/v1/users/${editID}`)
      .then((res) => {
        const options = DefaultOkOption;
        options.text = [`L'Utilisateur' ${res.data.username} a été supprimé`];
        changeOptions(options);
        toggle();
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  return (
    <div className="col-12 hideWIP">
      <div className="card tempMargin">
        <div className="card-body">
          <div>
            <a className="btn btn-secondary">
              Ajouter un Utilisateur <Plus />
            </a>
          </div>
          <div className="card-text">
            Modifier un Utilisateur :
            <div className="btn-group" role="group">
              <input
                type="text"
                className="form-control"
                placeholder="username"
                value={editID}
                onChange={handleChange}
              />
              <a className="btn btn-warning">
                <Pencil />
              </a>
              <button type="button" className="btn btn-danger" onClick={(e) => deleteUser()}>
                <Trash />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
EditCard.propTypes = {};
