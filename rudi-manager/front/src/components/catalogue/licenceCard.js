import React, { useEffect, useState } from 'react'
import { Pencil, Trash, Check } from 'react-bootstrap-icons'
import PropTypes from 'prop-types'

LicenceCard.propTypes = {
  obj: PropTypes.object,
  editMode: PropTypes.bool,
}

/**
 * Composant : LicenceCard
 * @return {ReactNode}
 */
export default function LicenceCard({ obj, editMode }) {
  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(editMode), [editMode])

  /**
   * affiche le text en fonction de la langue choisi
   * @param {*} langObjectArray Array d'objet au format {lang:'', text:''}
   * @param {String} userLang langue selectionnée
   * @return {String} text dans la langue appropriée
   */
  const getLangText = (langObjectArray, userLang) => {
    langObjectArray.map((textObj) => {
      const { lang, text } = textObj
      if (lang === userLang) return text
    })
    return langObjectArray[0].text
  }

  return (
    <div className="col-12" key={obj.concept_id}>
      <div className="card card-margin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <a>{getLangText(obj.pref_label)}</a>
            {isEdit && (
              <div className="btn-group" role="group">
                <button type="button" className="btn btn-success">
                  <Check />
                </button>
                <a className="btn btn-warning">
                  <Pencil />
                </a>
                <button type="button" className="btn btn-danger">
                  <Trash />
                </button>
              </div>
            )}
          </div>
        </h5>
        <div className="card-body">
          <p className="card-text">
            id : <small className="text-muted">{obj.concept_id}</small>
          </p>
          <p className="card-text">
            code : <small className="text-muted">{obj.concept_code}</small>
          </p>
          <p className="card-text">
            role : <small className="text-muted"> {obj.concept_role}</small>
          </p>
          <p className="card-text">
            uri :
            <small className="text-muted">
              <a href={obj.concept_uri}> {obj.concept_uri}</a>
            </small>
          </p>
        </div>
      </div>
    </div>
  )
}
