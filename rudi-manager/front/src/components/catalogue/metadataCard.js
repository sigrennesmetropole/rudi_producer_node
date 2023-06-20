import axios from 'axios'

import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { BoxArrowUpRight, Pencil, Trash, CloudDownload, Eye, Share } from 'react-bootstrap-icons'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { getObjFormUrl, getLocaleFormatted } from '../../utils/utils'
import { getBackUrl } from '../../utils/frontOptions'
import {
  DefaultOkOption,
  DefaultConfirmOption,
  useModalContext,
} from '../modals/genericModalContext'
import ThemeDisplay from '../other/themeDisplay'
import FileSizeDisplay from '../other/fileSizeDisplay'
import { usePMFrontContext } from '../../generalContext'

MetadataCard.propTypes = {
  editMode: PropTypes.bool,
  metadata: PropTypes.object,
  refresh: PropTypes.func,
  logout: PropTypes.func,
}

/**
 * Composant : metadataCard
 * @return {ReactNode}
 */
export default function MetadataCard({ editMode, metadata, refresh, logout }) {
  const { appInfo } = usePMFrontContext()
  const { changeOptions, toggle } = useModalContext()

  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(!!editMode), [editMode])
  /**
   * download le fichier via media_id
   * @param {*} ressource connector du fichier
   */
  /*
  function downloadFile(ressource) {
    axios
      .get(`${ressource.connector.url}`, {
        responseType: 'blob',
        headers: { 'media-access-method': 'Direct' },
      })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${ressource.media_name}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch((err) => {
        defaultErrorHandler(err);
      });
  }
   */

  /**
   * call for metadata deletion
   */
  function deleteRessource() {
    axios
      .delete(`api/data/resources/${metadata.global_id}`)
      .then((res) => {
        const options = DefaultOkOption
        options.text = [`La métadonnée ${res.data.resource_title} a été supprimée`]
        options.buttons = [
          {
            text: 'Ok',
            action: () => refresh(),
          },
        ]
        changeOptions(options)
        toggle()
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }
  /**
   * call for confirmation before metadata deletion
   * @param {*} metadata metadata a suppr
   */
  const triggerDeleteRessource = () => {
    const options = DefaultConfirmOption
    options.text = [`Confirmez vous la suppression de la métadonnée ${metadata.resource_title}?`]
    options.buttons = [
      {
        text: 'Oui',
        action: () => deleteRessource(),
      },
      {
        text: 'Non',
        action: () => {},
      },
    ]
    changeOptions(options)
    toggle()
  }

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

  /**
   * calcule la taille total des fichiers
   * @return {Number} taille totale
   */
  const getTotalFileSize = () =>
    metadata.available_formats.reduce((acc, cur) => acc + cur.file_size, 0)

  /**
   * Check if the metadata has restricted access
   * @param {*} metadata
   * @return {boolean} True if letadata has restricted access
   */
  const isRestricted = (metadata) =>
    !!metadata?.access_condition?.confidentiality?.restricted_access

  const metaDates = metadata.metadata_info.metadata_dates
  /**
   * Display the metadata status
   * @return {html} A round pill that shows the status
   */
  function displayStatus() {
    const displaySpan = (level, text) => (
      <span className={'status-pill text-bg-' + level} id="status-pill">
        {text}
      </span>
    )
    if (metadata.collection_tag) return displaySpan('dark', metadata.collection_tag)
    if (metadata.storage_status === 'pending') return displaySpan('danger', 'Incomplet')
    if (metadata.integration_error_id) return displaySpan('danger', 'Refus portail')
    if (!metaDates?.published && !metaDates?.deleted) return displaySpan('warning', 'Envoyé')
    if (metaDates?.published && !metaDates?.deleted) return displaySpan('success', 'Publié')
    if (metaDates?.deleted) return displaySpan('danger', 'Supprimé')
  }

  const button = {
    share: (
      <a
        className="btn btn-success"
        title="Partager la métadonnée"
        href={`${appInfo.apiExtUrl}api/v1/resources/${metadata.global_id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Share />
      </a>
    ),
    edit: (
      <a
        className="btn btn-warning"
        href={`${appInfo.formUrl}?update=${metadata.global_id}`}
        title="Editer"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Pencil />
      </a>
    ),
    delete: (
      <button
        type="button"
        className="btn btn-danger"
        title="Supprimer"
        onClick={() => triggerDeleteRessource()}
      >
        <Trash />
      </button>
    ),
    download: (url) => (
      <button type="button" className="btn btn-success button-margin">
        <a id="downloadMedia" title="Télécharger" href={url}>
          <CloudDownload />
        </a>
      </button>
    ),
    external: (url) => (
      <button type="button" className="btn btn-success margin-right">
        <a id="downloadMedia" title="Site externe" href={url}>
          <BoxArrowUpRight />
        </a>
      </button>
    ),
    visualize: (id) => (
      <Link to={getBackUrl(`show/${id}`)}>
        <span className="btn btn-success" title="Aperçu">
          <Eye />
        </span>
      </Link>
    ),
  }
  return (
    <div className="col-12" key={metadata.global_id}>
      <div className="card card-margin">
        <h5 className={isRestricted(metadata) ? 'card-header restricted' : 'card-header'}>
          <div className="d-flex justify-content-between align-items-center">
            <a
              href={getObjFormUrl(appInfo.formUrl, '', `?read-only=${metadata.global_id}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={metadata.storage_status === 'pending' ? 'danger' : ''}>
                {metadata.resource_title}
              </span>
            </a>
            {displayStatus()}
            {isEdit ? (
              <div className="btn-group" role="group">
                {button.share}
                {button.edit}
                {button.delete}
              </div>
            ) : (
              <div className="btn-group" role="group">
                {button.share}
              </div>
            )}
          </div>

          <div>
            {metaDates?.updated && (
              <small className="text-muted">
                Modifié le : {getLocaleFormatted(metaDates.updated)}
              </small>
            )}
            <FileSizeDisplay number={getTotalFileSize()}></FileSizeDisplay>
          </div>

          {metaDates?.published && (
            <div>
              <small className="text-muted">
                Publié le : {getLocaleFormatted(metaDates.published)}
              </small>
            </div>
          )}
        </h5>
        <div className="card-body">
          <p className="card-text">{getLangText(metadata.summary)}</p>
          <p className="card-text">
            Producteur : <span className="text-muted">{metadata.producer?.organization_name}</span>
          </p>
          <a href="#" className="btn btn-secondary card-margin">
            <ThemeDisplay value={metadata.theme}></ThemeDisplay>
          </a>
          <span className="card-text">
            {metadata.available_formats.map((ressource) =>
              ressource.file_size ? (
                <div key={`${ressource.media_id}`}>
                  {button.visualize(ressource.media_id)}
                  {button.download(ressource.connector.url)}
                  <FileSizeDisplay number={ressource.file_size}></FileSizeDisplay>
                  <span className="">
                    <a href={ressource.connector.url}>{ressource.media_name}</a>
                  </span>
                </div>
              ) : (
                <div key={`${ressource.media_id}`}>
                  {button.external(ressource.connector.url)}
                  <span className="">
                    <a href={ressource.connector.url}>{ressource.connector.url}</a>
                  </span>
                </div>
              )
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
