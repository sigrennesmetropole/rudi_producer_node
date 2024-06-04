import axios from 'axios'

import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import InfiniteScroll from 'react-infinite-scroll-component'

import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { EditObjCard, ObjCard } from '../generic/objCard'
import { getApiData } from '../../utils/frontOptions'

const PAGE_SIZE = 20

ObjCatalogue.propTypes = {
  editMode: PropTypes.bool,
  shouldPad: PropTypes.bool,
  shouldRefresh: PropTypes.bool,
  logout: PropTypes.func,
  hideEdit: PropTypes.bool,
  objType: PropTypes.string,
  propId: PropTypes.string,
  propName: PropTypes.string,
  propNamesToDisplay: PropTypes.object,
  propSortBy: PropTypes.string,
  btnTextAdd: PropTypes.string,
  btnTextChg: PropTypes.string,
  deleteConfirmMsg: PropTypes.func,
  deleteMsg: PropTypes.func,
}

/**
 * Composant : CatalogueContact
 * @return {void}
 */
export default function ObjCatalogue({
  editMode,
  shouldPad = true,
  shouldRefresh,
  logout,
  hideEdit,
  objType,
  propId,
  propName,
  propNamesToDisplay,
  propSortBy,
  btnTextAdd,
  btnTextChg,
  deleteConfirmMsg,
  deleteMsg,
}) {
  const { defaultErrorHandler } = useDefaultErrorHandler()

  const [isEdit, setEdit] = useState(!!editMode)
  useEffect(() => setEdit(!!editMode), [editMode])

  const [objList, setObjList] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(-1)
  const initialRender = useRef(true)

  const getApiUrlObj = (suffix) => getApiData(`${objType}${suffix ? `/${suffix}` : ''}`)
  const deleteUrl = (id) => getApiUrlObj(id)

  const refresh = () => {
    setHasMore(true)
    setObjList([])
    getInitialData()

    if (currentOffset === 0) {
      setCurrentOffset(-1)
    } else {
      setCurrentOffset(0)
    }
  }
  useEffect(() => refresh(), [shouldRefresh])

  useEffect(() => {
    if (initialRender.current) initialRender.current = false
    else if (currentOffset < 0) setCurrentOffset(0)
    else fetchMoreData()
  }, [currentOffset])

  /**
   * recup la 1er page
   */
  function getInitialData() {
    axios
      .get(getApiUrlObj(), {
        params: { sort_by: propSortBy || '-updateAt', limit: PAGE_SIZE, offset: 0 },
      })
      .then((res) => {
        if (res.data?.length < PAGE_SIZE) setHasMore(false)
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  /**
   * Fonction utilisée par InfiniteScroll
   * Récupere la page suivante
   */
  const fetchMoreData = () => {
    axios
      .get(getApiUrlObj(), {
        params: { sort_by: propSortBy || '-updateAt', limit: PAGE_SIZE, offset: currentOffset },
      })
      .then((res) => {
        const data = res.data
        if (data.length < PAGE_SIZE) setHasMore(false)
        setObjList((listObj) => listObj.concat(data))
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  return (
    <div className={shouldPad ? 'tempPaddingTop' : ''}>
      <div className="row catalogue">
        <div className="col-9">
          <div className="row">
            {isEdit && !!btnTextAdd && (
              <EditObjCard
                objType={objType}
                idField={propId}
                deleteUrl={deleteUrl}
                deleteConfirmMsg={deleteConfirmMsg}
                deleteMsg={deleteMsg}
                btnTextAdd={btnTextAdd}
                btnTextChg={btnTextChg}
                refresh={refresh}
              ></EditObjCard>
            )}
            <InfiniteScroll
              dataLength={objList.length}
              next={() => setCurrentOffset(currentOffset + PAGE_SIZE)}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
              endMessage={<i>Aucune donnée supplémentaire</i>}
            >
              {objList.map((obj) => (
                <ObjCard
                  editMode={isEdit}
                  hideEdit={hideEdit}
                  objType={objType}
                  obj={obj}
                  propId={propId}
                  propName={propName}
                  displayFields={propNamesToDisplay}
                  deleteUrl={deleteUrl}
                  deleteConfirmMsg={deleteConfirmMsg}
                  deleteMsg={deleteMsg}
                  refresh={refresh}
                  key={`${obj[propId]}`}
                ></ObjCard>
              ))}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  )
}
