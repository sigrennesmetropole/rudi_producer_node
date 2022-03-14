import React from 'react';
import { Pencil, Trash } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import axios from 'axios';
import { ModalContext, DefaultOkOption, DefaultConfirmOption } from '../modals/ModalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : ProducerCard
 * @return {ReactNode}
 */
export default function ProducerCard({ formUrl, organization, refresh }) {
  const { changeOptions, toggle } = React.useContext(ModalContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  /**
   * call for organization deletion
   * @param {*} organization organization a suppr
   */
  function deleteOrganization(organization) {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/admin/organizations/${organization.organization_id}`)
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
   * @param {*} organization organization a suppr
   */
  function triggerDeleteOrganization(organization) {
    const options = DefaultConfirmOption;
    options.text = [
      `Confirmez vous la suppression du Producteur ${organization.organization_name}?`,
    ];
    options.buttons = [
      {
        text: 'Oui',
        action: () => {
          deleteOrganization(organization);
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
    <div className="col-12" key={organization.organization_id}>
      <div className="card tempMargin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <a>{organization.organization_name}</a>
            <div className="btn-group" role="group">
              <a
                href={`${formUrl}?update=${organization.organization_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-warning"
              >
                <Pencil />
              </a>
              <button
                type="button"
                className="btn btn-danger"
                onClick={(e) => triggerDeleteOrganization(organization)}
              >
                <Trash />
              </button>
            </div>
          </div>
        </h5>
        <div className="card-body">
          <p className="card-text">
            organization_id :<small className="text-muted">{organization.organization_id}</small>
          </p>
        </div>
      </div>
    </div>
  );
}
ProducerCard.propTypes = {
  organization: PropTypes.object,
  formUrl: PropTypes.string,
  refresh: PropTypes.func,
};
