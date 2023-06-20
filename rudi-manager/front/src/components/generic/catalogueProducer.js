import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import ObjCatalogue from './objCatalogue'

CatalogueProducer.propTypes = {
  editMode: PropTypes.bool,
  logout: PropTypes.func,
}

/**
 * Composant : CatalogueProducer
 * @return {void}
 */
export default function CatalogueProducer({ editMode, logout }) {
  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(editMode), [editMode])

  return (
    <ObjCatalogue
      editMode={isEdit}
      logout={logout}
      objType="organizations"
      propId="organization_id"
      propName="organization_name"
      propNamesToDisplay={{
        organization_id: 'organization_id',
      }}
      btnTextAdd="Ajouter un producteur"
      btnTextChg="Modifier un producteur :"
      deleteConfirmMsg={(id) => `Confirmez vous la suppression du producteur ${id}?`}
      deleteMsg={(id) => `Le producteur ${id} a été supprimé`}
    />
  )
}
