import axios from 'axios'

import React, { useState, useEffect } from 'react'
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

  const [isEdit, setEdit] = useState(editMode)
  useEffect(() => setEdit(editMode), [editMode])

  useEffect(() => getInitialData(), [shouldRefresh])

  const [listObj, setListObj] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)

  const getApiUrlObj = (suffix) => getApiData(`${objType}${suffix ? `/${suffix}` : ''}`)

  // useEffect(() => getInitialData(), [])

  const deleteUrl = (id) => getApiUrlObj(id)
  const refresh = () => {
    setHasMore(true)
    getInitialData()
  }

  /**
   * recup la 1er page des contacts
   */
  function getInitialData() {
    // const params = new URLSearchParams(`limit=${PAGE_SIZE}&offset=0`);
    // const fetchUrl = getApiUrlObj(`?sort_by=-updateAt&limit=${PAGE_SIZE}&offset=0`);
    const fetchUrl = getApiUrlObj(
      `?sort_by=${propSortBy || '-updateAt'}&limit=${PAGE_SIZE}&offset=0`
    )
    // console.log('url:', fetchUrl);
    axios
      .get(fetchUrl)
      .then((res) => {
        setCurrentOffset(PAGE_SIZE)
        setListObj(res.data)
        if (listObj.length < PAGE_SIZE) setHasMore(false)
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  /**
   * Fonction utilisée par InfiniteScroll
   * Récupere la page suivante
   */
  const fetchMoreData = () => {
    const fetchUrl = getApiUrlObj()
    // console.log(fetchUrl);
    axios
      .get(fetchUrl, {
        params: { sort_by: propSortBy || '-updateAt', limit: PAGE_SIZE, offset: currentOffset },
      })
      .then((res) => {
        const partialListObj = res.data
        setCurrentOffset(currentOffset + PAGE_SIZE)
        if (partialListObj.length < PAGE_SIZE) {
          setHasMore(false)
          // console.log('(fetchMoreData 0) partialListObj.length=', partialListObj.length)
          // console.log('(fetchMoreData 0) hasMore=', hasMore)
        } else {
          // console.log('(fetchMoreData +) partialListObj.length=', partialListObj.length)
          // console.log('(fetchMoreData +) hasMore=', hasMore)

          setListObj(listObj.concat(partialListObj))
        }
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
              dataLength={listObj.length}
              next={fetchMoreData}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
            >
              {listObj.map((obj, i) => (
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
                  key={`${obj[propId]}-${i}`}
                ></ObjCard>
              ))}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  )
}
