import PropTypes from 'prop-types'
import React from 'react'
import { Plus } from 'react-bootstrap-icons'
// import { Plus, Pencil, Trash } from 'react-bootstrap-icons'

import AddUserModal, { useAddUserModal } from '../modals/addUserModal'

ActOnUserCard.propTypes = {
  roleList: PropTypes.array.isRequired,
  refresh: PropTypes.func.isRequired,
}

/**
 * Composant : EditCard
 * @return {ReactNode}
 */
export default function ActOnUserCard({ roleList, refresh }) {
  const { isVisibleAddModal, toggleAddModal } = useAddUserModal()
  const createNewUser = () => {
    toggleAddModal()
    refresh()
  }

  return (
    <div className="col-12">
      <div className="card edit-card-margin">
        <div className="card-body">
          <div className="inline">
            <a className="btn btn-secondary" onClick={createNewUser} onKeyDown={createNewUser}>
              Ajouter un utilisateur <Plus />
            </a>
          </div>

          <div className="inline card-text on-right">
            <AddUserModal
              roleList={roleList}
              visible={isVisibleAddModal}
              toggleEdit={toggleAddModal}
              refresh={refresh}
            ></AddUserModal>
          </div>
        </div>
      </div>
    </div>
  )
}
