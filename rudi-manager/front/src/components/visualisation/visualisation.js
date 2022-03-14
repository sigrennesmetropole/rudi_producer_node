import React, { useState, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import { Check } from 'react-bootstrap-icons';
import axios from 'axios';
import PropTypes from 'prop-types';
import ReactJson from 'react-json-view';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : Visualisation
 * @return {ReactNode}
 */
function Visualisation({ match }) {
  const [mediaId, setMediaId] = useState(match.params.id ? match.params.id : '');
  const [visuOption, setVisuOption] = useState({ displayType: 'CSV', data: null });
  const { defaultErrorHandler } = useDefaultErrorHandler();

  const wrapper = React.createRef();
  const [el, setEl] = useState(null);

  useEffect(() => {
    setEl(
      jspreadsheet(wrapper.current, {
        data: [[]],
        minDimensions: [10, 10],
      }),
    );
    if (mediaId.length) {
      handleOnClick();
    }
  }, []);

  useEffect(() => {
    if (el) {
      el.destroy(wrapper.current, false);
    }
    if (visuOption.displayType === 'CSV') {
      setJSpreadsheet();
    }
  }, [visuOption]);

  /**
   * met a jour le state lors de la modification de l'input du mediaId
   * @param {*} event event
   */
  function handleChange(event) {
    setMediaId(event.target.value);
  }

  /**
   * convert CSV string to array
   * @param {String} str CSV string
   * @param {String} delimiter delemiter of the cell
   * @return {*} array of the CSV
   */
  function csvToArray(str, delimiter = ',') {
    // TODO : better option => https://www.papaparse.com/ ? https://www.npmjs.com/package/csv-string ?
    const titles = str.slice(0, str.indexOf('\n')).split(delimiter);
    const rows = str.slice(str.indexOf('\n') + 1).split('\n');
    return rows.map((row) => {
      const values = row.split(delimiter);
      return titles.reduce((object, curr, i) => ((object[curr] = values[i]), object), {});
    });
  }
  /**
   * setup the jspreadsheet element
   * @param {*} res response of the request
   * @param {*} data array of the CSV
   */
  function setJSpreadsheet() {
    if (visuOption.data) {
      const options = {
        data: visuOption.data,
        csvHeaders: true,
        csvDelimiter: ';',
        editable: false,
        tableOverflow: true,
        lazyLoading: true,
        loadingSpin: true,
      };
      setEl(jspreadsheet(wrapper.current, options));
    }
  }

  /**
   * get the doc
   */
  function handleOnClick() {
    axios
      .get(`${process.env.PUBLIC_URL}/api/media/${mediaId}`)
      .then((res) => {
        axios
          .get(`${res.data.url}`)
          .then((res2) => {
            const mediaMimeStr = res2.headers['content-type']; // Ex: 'application/json; charset=utf-8'
            const mediaMimeElements = mediaMimeStr.split(';');
            const mediaMime = mediaMimeElements[0].trim().toLowerCase();

            if (mediaMimeElements.length > 1) {
              const mediaCharset = mediaMimeElements[1].trim().toLowerCase();
              switch (mediaCharset) {
                case 'charset=utf-8':
                case 'charset=us-ascii':
                case 'charset=iso-8859-1':
                case 'charset=iso-8859-15':
                  break;
                default:
                  defaultErrorHandler({
                    message: `l'encodage ${mediaCharset} n'est pas supporté`,
                  });
                  break;
              }
            }
            switch (mediaMime) {
              case 'application/geo+json':
              case 'application/json':
                setVisuOption({ displayType: 'JSON', data: res2.data });
                break;

              case 'text/csv':
              case 'application/vnd.oasis.opendocument.spreadsheet':
              case 'application/vnd.ms-excel':
              case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                try {
                  const array = csvToArray(res2.data);
                  setVisuOption({ displayType: 'CSV', data: array });
                } catch (error) {
                  defaultErrorHandler(error);
                }
                break;
              default:
                defaultErrorHandler({
                  message: `le type ${mediaMimeStr} n'est pas supporté`,
                });

                break;
            }
          })
          .catch((e) => {
            defaultErrorHandler(e);
          });
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  return (
    <div className="tempPaddingTop">
      Afficher une donnée (csv ou JSON) :
      <div className="btn-group" role="group">
        <input
          type="text"
          className="form-control"
          placeholder="media_id"
          value={mediaId}
          onChange={handleChange}
        />
        <button type="button" className="btn btn-success" onClick={handleOnClick}>
          <Check />
        </button>
      </div>
      <br></br>
      {
        {
          CSV: <div ref={wrapper} />,
          JSON: <ReactJson src={visuOption.data} collapsed={2} />,
        }[visuOption.displayType]
      }
    </div>
  );
}
Visualisation.propTypes = { match: PropTypes.object };

export default withRouter(Visualisation);
