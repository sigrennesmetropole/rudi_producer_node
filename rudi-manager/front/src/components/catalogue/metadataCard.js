import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash, Check, CloudDownload, Eye } from 'react-bootstrap-icons';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import axios from 'axios';
import { ModalContext, DefaultOkOption, DefaultConfirmOption } from '../modals/ModalContext';
import ThemeDisplay from '../other/themeDisplay';
import FileSizeDisplay from '../other/fileSizeDisplay';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : metadataCard
 * @return {ReactNode}
 */
export default function MetadataCard({ formUrl, metadata, display, refresh }) {
  const { changeOptions, toggle } = React.useContext(ModalContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  /**
   * download le fichier via media_id
   * @param {*} ressource connector du fichier
   */
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
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * call for metadata deletion
   * @param {*} metadata metadata a suppr
   */
  function deleteRessource(metadata) {
    axios
      .delete(`${process.env.PUBLIC_URL}/api/admin/resources/${metadata.global_id}`)
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
   * @param {*} metadata metadata a suppr
   */
  function triggerDeleteRessource(metadata) {
    const options = DefaultConfirmOption;
    options.text = [`Confirmez vous la suppression de la métadonnée ${metadata.resource_title}?`];
    options.buttons = [
      {
        text: 'Oui',
        action: () => {
          deleteRessource(metadata);
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

  /**
   * affiche le text en fonction de la langue choisi
   * @param {*} langObjectArray Array d'objet au format {lang:'', text:''}
   * @param {String} lang langue selectionnée
   * @return {String} text dans la langue appropriée
   */
  function getLangText(langObjectArray, lang) {
    // TODO
    return langObjectArray[0].text;
  }
  /**
   * calcule la taille total des fichiers
   * @return {Number} taille totale
   */
  function getTotalFileSize() {
    return metadata.available_formats.reduce((acc, cur) => acc + cur.file_size, 0);
  }

  return (
    <div className="col-12" key={metadata.global_id}>
      <div className="card tempMargin">
        <h5 className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <a
              href={`${formUrl}?read-only=${metadata.global_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {metadata.resource_title}
            </a>
            {!metadata.metadata_info.metadata_dates?.published &&
              !metadata.metadata_info.metadata_dates?.deleted && (
                <span className="badge badge-warning badge-pill">waiting</span>
              )}
            {metadata.metadata_info.metadata_dates?.published &&
              !metadata.metadata_info.metadata_dates?.deleted && (
                <span className="badge badge-success badge-pill">published</span>
              )}
            {metadata.metadata_info.metadata_dates?.deleted && (
              <span className="badge badge-danger badge-pill">deleted</span>
            )}
            {display && display.editJDD && (
              <div className="btn-group" role="group">
                <button type="button" className="btn btn-success">
                  <Check />
                </button>
                <a
                  className="btn btn-warning"
                  href={`${formUrl}?update=${metadata.global_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Pencil />
                </a>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={(e) => triggerDeleteRessource(metadata)}
                >
                  <Trash />
                </button>
              </div>
            )}
          </div>

          <div>
            {metadata.metadata_info.metadata_dates?.updated && (
              <small className="text-muted">
                Modifié le :
                <Moment format=" DD/MM/YYYY HH:mm:ss">
                  {metadata.metadata_info.metadata_dates.updated}
                </Moment>
              </small>
            )}
            <FileSizeDisplay number={getTotalFileSize()}></FileSizeDisplay>
          </div>

          {metadata.metadata_info.metadata_dates?.published && (
            <div>
              <small className="text-muted">
                Publié le :
                <Moment format=" DD/MM/YYYY HH:mm:ss">
                  {metadata.metadata_info.metadata_dates.published}
                </Moment>
              </small>
            </div>
          )}
        </h5>
        <div className="card-body">
          <p className="card-text">{getLangText(metadata.summary)}</p>
          <p className="card-text">
            Producteur :<small className="text-muted">{metadata.producer.organization_name}</small>
          </p>
          <p className="card-text">
            global_id : <small className="text-muted"> {metadata.global_id}</small>
          </p>
          <span className="card-text">
            media_id :
            {metadata.available_formats.map((ressource, i) => {
              return (
                <div key={`${ressource.media_id}`}>
                  <small className="text-muted"> {ressource.media_id} </small>
                  <small> {ressource.media_name} </small>
                  <FileSizeDisplay number={ressource.file_size}></FileSizeDisplay>
                  <button
                    type="button"
                    className="btn btn-success button-margin"
                    onClick={(e) => downloadFile(ressource)}
                  >
                    Download <CloudDownload />
                  </button>
                  <Link to={`/show/${ressource.media_id}`}>
                    <span className="btn btn-success button-margin">
                      Visualisation <Eye />
                    </span>
                  </Link>
                </div>
              );
            })}
          </span>

          <a href="#" className="btn btn-secondary button-margin">
            <ThemeDisplay value={metadata.theme}></ThemeDisplay>
          </a>
        </div>
      </div>
    </div>
  );
}
MetadataCard.propTypes = {
  metadata: PropTypes.object,
  formUrl: PropTypes.string,
  display: PropTypes.object,
  refresh: PropTypes.func,
};
