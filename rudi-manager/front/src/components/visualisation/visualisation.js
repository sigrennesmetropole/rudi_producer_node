import axios from 'axios'

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'react-bootstrap-icons'
// import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types'

import jspreadsheet from 'jspreadsheet-ce'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import { JsonViewer } from '@textea/json-viewer'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { getBackUrl } from '../../utils/frontOptions'

Visualisation.propTypes = {
  logout: PropTypes.func,
}
/**
 * Composant : Visualisation
 * @return {ReactNode}
 */
function Visualisation({ logout }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const { id } = useParams()
  const [mediaId, setMediaId] = useState(id ? id : '')
  const [visuOption, setVisuOption] = useState({ displayType: 'TXT', data: '- Aucune donnée -' })

  const wrapper = React.useRef()
  const [el, setEl] = useState(null)

  useEffect(() => {
    if (visuOption.displayType === 'CSV')
      setEl(
        jspreadsheet(wrapper.current, {
          data: [[]],
          minDimensions: [10, 10],
        })
      )
    if (mediaId.length) {
      handleOnClick()
    }
  }, [])

  useEffect(() => {
    if (el) {
      el.destroy(wrapper.current, false)
    }
    if (visuOption.displayType === 'CSV') {
      setJSpreadsheet()
    }
  }, [visuOption])

  /**
   * met a jour le state lors de la modification de l'input du mediaId
   * @param {*} event event
   */
  function handleChange(event) {
    setMediaId(event.target.value)
  }

  /**
   * convert CSV string to array
   * @param {String} str CSV string
   * @param {String} delimiter delemiter of the cell
   * @return {*} array of the CSV
   */
  function csvToArray(str, delimiter = ',') {
    const csvStr = `${str}`
    // TODO : better option => https://www.papaparse.com/ ? https://www.npmjs.com/package/csv-string ?
    const titles = csvStr.slice(0, csvStr.indexOf('\n')).split(delimiter)
    const rows = csvStr.slice(csvStr.indexOf('\n') + 1).split('\n')
    return rows.map((row) => {
      const values = row.split(delimiter)
      return titles.reduce((object, curr, i) => ((object[curr] = values[i]), object), {})
    })
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
        // includeHeadersOnDownload: true,
        parseTableAutoCellType: true,
        parseTableFirstRowAsHeader: true,
        minSpareRows: 10,
        minSpareCols: 10,
      }
      setEl(jspreadsheet(wrapper.current, options))
    }
  }

  const [imgUrl, setImgUrl] = useState()
  const getImg = async (imageUrl) => {
    const response = await fetch(imageUrl)
    const imageBlob = await response.blob()
    const reader = new FileReader()
    reader.readAsDataURL(imageBlob)
    reader.onloadend = () => {
      const base64data = reader.result
      setImgUrl(base64data)
    }
  }

  /**
   * get the doc
   */
  function handleOnClick() {
    // First: let's get the media metadata from the "RUDI API" module
    axios
      .get(getBackUrl(`api/media/${mediaId}`))
      .then((resApi) => {
        const mediaInfo = resApi?.data
        // console.debug('T (visu) getMediaInfo', mediaInfo)
        if (!mediaInfo)
          return defaultErrorHandler({
            statusCode: 404,
            message: `Info introuvable pour le media ${id}`,
          })
        const mediaUrl = mediaInfo.connector.url

        const mediaMimeStr = mediaInfo.file_type
        // console.log(mediaMimeStr);
        const mediaMimeElements = mediaMimeStr.split(';')
        const mediaMime = mediaMimeElements[0].trim().toLowerCase()
        let mediaCharset
        if (mediaMimeElements.length > 1) {
          mediaCharset = mediaMimeElements[1].trim().toLowerCase() || 'charset=utf-8'
          switch (mediaCharset) {
            case 'charset=utf-8':
            case 'charset=us-ascii':
            case 'charset=iso-8859-1':
            case 'charset=iso-8859-15':
              break
            default:
              defaultErrorHandler({
                message: `l'encodage ${mediaCharset} n'est pas supporté`,
              })
              break
          }
        }
        // Let's then get the media data from the "RUDI Media" module
        if (mediaMime.startsWith('image')) {
          try {
            return getImg(mediaUrl)
              .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
              .then((res) => setVisuOption({ displayType: 'IMG', data: imgUrl }))
          } catch (error) {
            if (error.response?.status == 401) logout()
            else defaultErrorHandler(error)
          }
        } else {
          axios
            .get(mediaUrl)
            .then((resMedia) => {
              const media = resMedia?.data
              if (!media)
                return defaultErrorHandler({
                  statusCode: 404,
                  message: `Aucun media n'a été trouvé à l'adresse ${mediaUrl}`,
                })

              switch (mediaMime) {
                case 'application/geo+json':
                case 'application/json':
                case 'text/json':
                  setVisuOption({ displayType: 'JSON', data: media })
                  break

                case 'text/csv':
                case 'application/vnd.oasis.opendocument.spreadsheet':
                case 'application/vnd.ms-excel':
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                  try {
                    setVisuOption({
                      displayType: 'CSV',
                      data: csvToArray(media),
                      opts: { url: mediaUrl },
                    })
                  } catch (error) {
                    if (error.response?.status == 401) logout()
                    else defaultErrorHandler(error)
                  }
                  break

                case 'text/plain':
                case 'text/css':
                  try {
                    setVisuOption({ displayType: 'TXT', data: media })
                  } catch (error) {
                    if (error.response?.status == 401) logout()
                    else defaultErrorHandler(error)
                  }
                  break

                default:
                  defaultErrorHandler({
                    message: `le type ${mediaMimeStr} n'est pas supporté`,
                  })

                  break
              }
            })
            .catch((err) => {
              // console.error('T (visu) getMediaInfo url:', mediaUrl)
              if (err.msg === 'media uuid not found') {
                err.statusCode = 404
                err.msg = `Aucun media n'a été trouvé à l'adresse ${mediaUrl}`
              } else if (!err.statusCode) err.statusCode = 500
              if (err.response?.status == 401) logout()
              else defaultErrorHandler(err)
            })
        }
      })
      .catch((err) => {
        // console.error('T (visu) getMediaInfo url:', getBackUrl(`api/media/${mediaId}`))
        if (err.msg === 'media uuid not found') {
          err.msg = `Aucun media n'a été trouvé pour l'id ${mediaId}`
          err.statusCode = 404
        } else if (!err.statusCode) err.statusCode = 500
        if (err.response?.status == 401) logout()
        else defaultErrorHandler(err)
      })
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
          JSON: <JsonViewer value={visuOption.data} collapsed={2} />,
          TXT: (
            <div className="body">
              <div className="text-visu">
                <pre>{visuOption.data}</pre>
              </div>
            </div>
          ),
          IMG: <img src={imgUrl} alt="image" className="image90" />,
        }[visuOption.displayType]
      }
    </div>
  )
}
Visualisation.propTypes = { match: PropTypes.object }

export default Visualisation
