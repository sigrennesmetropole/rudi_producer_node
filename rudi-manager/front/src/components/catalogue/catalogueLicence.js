import axios from 'axios'

import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import InfiniteScroll from 'react-infinite-scroll-component'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import LicenceCard from './licenceCard'

CatalogueLicence.propTypes = {
  editMode: PropTypes.bool,
  logout: PropTypes.func,
}

/**
 * Composant : CatalogueLicence
 * @return {ReactNode}
 */
export default function CatalogueLicence({ editMode, logout }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(!!editMode), [editMode])

  const [licences, setLicences] = useState([])
  const [hasMore] = useState(false)

  useEffect(() => getInitialData(), [])
  /**
   * recup la 1er page des métadonnéees
   */
  function getInitialData() {
    axios
      .get(`api/data/licences`)
      .then((res) => setLicences(res.data))
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  return (
    <div className="tempPaddingTop">
      <div className="row catalogue">
        <div className="col-9">
          <div className="row">
            {licences.length ? (
              <InfiniteScroll
                dataLength={licences.length}
                hasMore={hasMore}
                loader={<h4>Loading...</h4>}
              >
                {licences.map((licence) => {
                  return (
                    <LicenceCard
                      obj={licence}
                      editMode={isEdit}
                      key={licence.concept_id}
                    ></LicenceCard>
                  )
                })}
              </InfiniteScroll>
            ) : (
              'Aucune donnée trouvée'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
