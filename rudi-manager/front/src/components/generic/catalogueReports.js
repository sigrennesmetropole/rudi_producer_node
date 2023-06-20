import axios from 'axios'

import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Trash } from 'react-bootstrap-icons'

import { lastMonth } from '../../utils/utils'
import { getApiData } from '../../utils/frontOptions'
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import ObjCatalogue from './objCatalogue'
import { getOptConfirm, getOptOk, useModalContext } from '../modals/genericModalContext'

CatalogueReports.propTypes = {
  editMode: PropTypes.bool,
  logout: PropTypes.func,
}

const getApiUrlReports = (suffix) => getApiData(`reports${suffix ? `/${suffix}` : ''}`)

/**
 * Composant : CatalogueReports
 * @return {void}
 */
export default function CatalogueReports({ editMode, logout }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()
  const { changeOptions, toggle } = useModalContext()
  const [refreshState, setRefreshState] = useState(editMode)
  /**
   * call for confirmation before object deletion
   */
  const deleteOldReports = () => {
    axios
      .delete(getApiUrlReports(`?treatedBefore=${lastMonth().toISOString()}`))
      .then((res) => {
        const deletedCount = res?.data?.deletedCount
        const msg = !deletedCount
          ? `Aucun rapport d'intégration n'a été supprimé`
          : deletedCount == 1
          ? `Un ancien rapport d'intégration a été supprimé`
          : `${deletedCount} anciens rapports d'intégration ont été supprimés`
        changeOptions(getOptOk(msg, () => {}))
        toggle()
        setRefreshState(!refreshState)
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  /**
   * call for confirmation before organization deletion
   * @param {*} id Identifier of the organization to delete
   */
  const triggerDeleteOldReports = () => {
    changeOptions(
      getOptConfirm(
        "Voulez-vous supprimer les rapports d'intégration d'il y a plus d'un mois ?",
        deleteOldReports
      )
    )
    toggle()
  }

  return (
    <div className="tempPaddingTop">
      <div className="row catalogue">
        <div className="col-9">
          <div className="card edit-card-margin ">
            <div className="card-body align-right valign-middle inline">
              <div className="text-button inline-block">
                Supprimer les rapports des mois précédents
              </div>
              <button
                type="button"
                title="Supprimer les rapports des mois précédents"
                className="btn btn-danger inline-block on-right"
                onClick={() => triggerDeleteOldReports()}
              >
                <Trash />
              </button>
            </div>
          </div>
        </div>
        <ObjCatalogue
          editMode={editMode}
          shouldPad={false}
          shouldRefresh={refreshState}
          hideEdit={true}
          objType="reports"
          propId="report_id"
          propName="resource_title"
          propNamesToDisplay={{
            id: 'report_id',
            resource_id: 'resource_id',
            submission_date: 'soumission',
            treatment_date: 'traitement',
            integration_status: 'statut',
            comment: 'commentaire',
            integration_errors: 'erreurs',
          }}
          propSortBy="-submission_date"
          deleteConfirmMsg={(id) => `Confirmez vous la suppression du rapport ${id}?`}
          deleteMsg={(id) => `Le rapport ${id} a été supprimé`}
        />
      </div>
    </div>
  )
}
