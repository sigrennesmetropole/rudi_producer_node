import axios from 'axios'

import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Pencil, Plus, Trash } from 'react-bootstrap-icons'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { ModalContext, getOptConfirm, getOptOk } from '../modals/genericModalContext'
import { usePMFrontContext } from '../../generalContext'
import { getObjFormUrl } from '../../utils/utils'

ObjCard.propTypes = {
  editMode: PropTypes.bool,
  hideEdit: PropTypes.bool,
  objType: PropTypes.string,
  obj: PropTypes.object,
  propId: PropTypes.string,
  propName: PropTypes.string,
  displayFields: PropTypes.object,
  deleteUrl: PropTypes.func,
  deleteConfirmMsg: PropTypes.func,
  deleteMsg: PropTypes.func,
  refresh: PropTypes.func,
}

/**
 * Composant : ProducerCard
 * @return {ReactNode}
 */
export function ObjCard({
  editMode,
  hideEdit,
  objType,
  obj,
  propId,
  propName,
  displayFields,
  deleteUrl,
  deleteConfirmMsg,
  deleteMsg,
  refresh,
}) {
  const { appInfo } = usePMFrontContext()
  const { changeOptions, toggle } = useContext(ModalContext)
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(!!editMode), [editMode])

  const objId = obj[propId]
  const objName = obj[propName]

  /**
   * Call for organization deletion
   * @param {*} id Identifier of the object to delete
   */
  const deleteObj = (id) => {
    axios
      .delete(deleteUrl(id))
      .then((res) => {
        changeOptions(getOptOk(deleteMsg(id), () => refresh()))
        toggle()
      })
      .catch((err) => defaultErrorHandler(err))
  }
  /**
   * call for confirmation before organization deletion
   * @param {*} id Identifier of the organization to delete
   */
  const triggerDeleteObj = (id) => {
    changeOptions(getOptConfirm(deleteConfirmMsg(objName), () => deleteObj(id)))
    toggle()
  }

  return (
    <div className="col-12" key={objId}>
      <div className="card card-margin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <a>{objName}</a>
            {isEdit && (
              <div className="btn-group" role="group">
                {!hideEdit && (
                  <a
                    href={getObjFormUrl(appInfo.formUrl, objType, `?update=${objId}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-warning"
                  >
                    <Pencil />
                  </a>
                )}
                <button
                  type={'button'}
                  className="btn btn-danger"
                  onClick={() => triggerDeleteObj(objId)}
                >
                  <Trash />
                </button>
              </div>
            )}
          </div>
        </h5>
        <div className="card-body">
          {Object.keys(displayFields).map(
            (key) =>
              obj[key] && (
                <p className="card-text" key={`${objId}.${key}`}>
                  {displayFields[key]} :{' '}
                  <small className="text-muted">
                    {!Array.isArray(obj[key]) ? obj[key] : JSON.stringify(obj[key])}
                  </small>
                </p>
              )
          )}
        </div>
      </div>
    </div>
  )
}

EditObjCard.propTypes = {
  objType: PropTypes.string,
  idField: PropTypes.string,
  refresh: PropTypes.func,
  deleteUrl: PropTypes.func,
  deleteConfirmMsg: PropTypes.func,
  deleteMsg: PropTypes.func,
  btnTextAdd: PropTypes.string,
  btnTextChg: PropTypes.string,
}

/**
 * Composant : EditCard
 * @return {ReactNode}
 */
export function EditObjCard({
  objType = '',
  idField,
  btnTextAdd,
  btnTextChg,
  deleteUrl,
  deleteConfirmMsg,
  deleteMsg,
  refresh,
}) {
  const { appInfo } = usePMFrontContext()
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [editID, setEditID] = useState('')
  const { changeOptions, toggle } = useContext(ModalContext)

  /**
   * met a jour le state lors de la modification de l'input de modification de JDD
   * @param {*} event event
   * @return {void}
   */
  const handleChange = (event) => setEditID(event.target.value)

  /**
   * Call for organization deletion
   * @param {*} id Identifier of the object to delete
   */
  const deleteObj = (id) => {
    axios
      .delete(deleteUrl(id))
      .then((res) => {
        changeOptions(getOptOk(deleteMsg(id), () => refresh()))
        toggle()
      })
      .catch((err) => defaultErrorHandler(err))
  }
  /**
   * call for confirmation before object deletion
   * @param {*} id Identifier of the object to delete
   */
  const triggerDeleteObj = (id) => {
    changeOptions(getOptConfirm(deleteConfirmMsg(id), () => deleteObj(id)))
    toggle()
  }

  const button = {
    edit: (
      <a
        href={getObjFormUrl(appInfo.formUrl, objType, `?update=${editID}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-warning"
      >
        <Pencil />
      </a>
    ),
    delete: (
      <button type="button" className="btn btn-danger" onClick={() => triggerDeleteObj(editID)}>
        <Trash />
      </button>
    ),
  }
  return (
    <div className="col-12">
      <div className="card edit-card-margin">
        <div className="card-body">
          <div className="inline">
            <a
              href={getObjFormUrl(appInfo.formUrl, objType)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              {btnTextAdd} <Plus />
            </a>
          </div>
          <div className="inline card-text on-right">
            {btnTextChg}&nbsp;
            <div className="btn-group" role="group">
              <input
                type="text"
                className="form-control"
                placeholder={idField}
                value={editID}
                onChange={handleChange}
              />

              {button.edit}
              {button.delete}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
