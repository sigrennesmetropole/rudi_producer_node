import React, { useState } from 'react';
import { Plus, Pencil, Trash, Check } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import axios from 'axios';
import { ModalContext, DefaultOkOption, DefaultConfirmOption } from '../modals/ModalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : EditCard
 * @return {ReactNode}
 */
export default function EditCard({ formUrl, refresh }) {
  const { changeOptions, toggle } = React.useContext(ModalContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  const [editID, setEditID] = useState('');

  /**
   * met a jour le state lors de la modification de l'input de modification de JDD
   * @param {*} event event
   */
  const handleChange = (event) => {
    setEditID(event.target.value);
  };

  /**
   * call for metadata deletion
   */
  function deleteRessource() {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/admin/resources/${editID}`)
      .then((res) => {
        const options = DefaultOkOption;
        options.text = [`La métadonnée ${res.data.resource_title} a été supprimée`];
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
   * call for confirmation before metadata deletion
   */
  function triggerDeleteRessource() {
    const options = DefaultConfirmOption;
    options.text = [`Confirmez vous la suppression de la métadonné ${editID}?`];
    options.buttons = [
      {
        text: 'Oui',
        action: () => {
          deleteRessource();
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

  return (
    <div className="col-12">
      <div className="card tempMargin">
        <div className="card-body">
          <div>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Ajouter un Jeu de Donnée <Plus />
            </a>
          </div>
          <div className="card-text">
            Modifier un Jeu de donnée :
            <div className="btn-group" role="group">
              <input
                type="text"
                className="form-control"
                placeholder="global_id"
                value={editID}
                onChange={handleChange}
              />
              <button type="button" className="btn btn-success">
                <Check />
              </button>
              <a className="btn btn-warning" href={`${formUrl}?update=${editID}`}>
                <Pencil />
              </a>
              <button
                type="button"
                className="btn btn-danger"
                onClick={(e) => triggerDeleteRessource()}
              >
                <Trash />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
EditCard.propTypes = {
  formUrl: PropTypes.string,
  refresh: PropTypes.func,
};
