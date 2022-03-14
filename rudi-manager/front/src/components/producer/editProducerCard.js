import React, { useState } from 'react';
import { Plus, Pencil, Trash } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import axios from 'axios';
import { ModalContext, DefaultOkOption, DefaultConfirmOption } from '../modals/ModalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : EditProducerCard
 * @return {ReactNode}
 */
export default function EditProducerCard({ formUrl, refresh }) {
  const [editID, setEditID] = useState('');

  const { changeOptions, toggle } = React.useContext(ModalContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();
  /**
   * met a jour le state lors de la modification de l'input de modification de JDD
   * @param {*} event event
   */
  const handleChange = (event) => {
    setEditID(event.target.value);
  };
  /**
   * call for organization deletion
   */
  function deleteOrganization() {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/admin/organizations/${editID}`)
      .then((res) => {
        const options = DefaultOkOption;
        options.text = [`Le Producteur ${res.data.organization_name} a été supprimé`];
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
   * call for confirmation before organization deletion
   */
  function triggerDeleteOrganization() {
    const options = DefaultConfirmOption;
    options.text = [`Confirmez vous la suppression du Producteur ${editID}?`];
    options.buttons = [
      {
        text: 'Oui',
        action: () => {
          deleteOrganization();
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
              Ajouter un Producteur <Plus />
            </a>
          </div>
          <div className="card-text">
            Modifier un Producteur :
            <div className="btn-group" role="group">
              <input
                type="text"
                className="form-control"
                placeholder="organization_id"
                value={editID}
                onChange={handleChange}
              />
              <a
                href={`${formUrl}?update=${editID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-warning"
              >
                <Pencil />
              </a>
              <button
                type="button"
                className="btn btn-danger"
                onClick={(e) => triggerDeleteOrganization()}
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
EditProducerCard.propTypes = {
  formUrl: PropTypes.string,
  refresh: PropTypes.func,
};
