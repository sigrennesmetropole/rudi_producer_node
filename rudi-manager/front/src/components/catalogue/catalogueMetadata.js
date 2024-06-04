import axios from 'axios'

import React, { useEffect, useRef, useState } from 'react'

import PropTypes from 'prop-types'
import { Search } from 'react-bootstrap-icons'
import InfiniteScroll from 'react-infinite-scroll-component'

import { getApiData } from '../../utils/frontOptions'
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler'
import { EditObjCard } from '../generic/objCard'
import ThemeDisplay from '../other/themeDisplay'
import MetadataCard, { displayStatus } from './metadataCard'

const idField = 'global_id'

const deleteUrl = (id) => getApiData(`resources/${id}`)
const deleteConfirmMsg = (id) => `Confirmez vous la suppression de la métadonnée ${id}?`
const deleteMsg = (data) => `La métadonnée ${data.resource_title} a été supprimée`

const btnTextAdd = 'Ajouter un jeu de données'
const btnTextChg = 'Modifier un jeu de données :'
const PAGE_SIZE = 20

CatalogueMetadata.propTypes = {
  editMode: PropTypes.bool,
  logout: PropTypes.func,
}

/**
 * Composant : Catalogue
 * @return {ReactNode}
 */
export default function CatalogueMetadata({ editMode, logout }) {
  const { defaultErrorHandler } = useDefaultErrorHandler()

  // console.log('-- Catalogue')
  const [isEdit, setIsEdit] = useState(!!editMode)
  useEffect(() => setIsEdit(!!editMode), [editMode])

  const [metadataList, setMetadataList] = useState([])
  const [allCountByFilters, setAllCountByFilters] = useState([])
  const [currentFilters, setCurrentFilters] = useState([{ sort_by: `-updatedAt` }])
  useEffect(() => refresh(), [currentFilters])

  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(-1)

  const initialRender = useRef(true)
  const searchText = useRef(null)
  const isSearchMode = () => searchText?.current?.value?.length > 0
  const searchMode = () => (isSearchMode() ? `/search` : '')

  const metadataDisplay = (filterValue) => (
    <span className="align-pill-left">{displayStatus(filterValue.metadata_status)}</span>
  )
  const themeDisplay = (filterValue, filter) => (
    <ThemeDisplay value={getFilterLabel(filterValue, filter)}></ThemeDisplay>
  )
  const refresh = () => {
    setHasMore(true)
    setMetadataList([])
    getInitialData()
    // console.log('-- gotInitialData')

    if (currentOffset === 0) {
      setCurrentOffset(-1)
    } else {
      setCurrentOffset(0)
    }
  }

  useEffect(() => {
    if (initialRender.current) initialRender.current = false
    else if (currentOffset < 0) setCurrentOffset(0)
    else fetchMoreData()
  }, [currentOffset])

  const filterConf = [
    {
      name: 'metadata_status',
      text: 'Statut :',
      values: [],
      toFilterParam: (elem) => {
        return { metadata_status: `"${elem?.metadata_status}"` }
      },
      display: metadataDisplay,
    },
    {
      name: 'theme',
      text: 'Thèmes :',
      values: [],
      toFilterParam: (elem) => ({ theme: `"${elem?.theme}"` }),
      display: themeDisplay,
    },
    {
      name: 'keywords',
      text: 'Mots-clés :',
      values: [],
      toFilterParam: (elem) => ({ keywords: `"${elem?.keywords}"` }),
    },
    {
      name: 'producer',
      displayName: 'organization_name',
      text: 'Sources :',
      values: [],
      toFilterParam: (elem) => {
        return { 'producer.organization_name': `"${elem.producer?.organization_name}"` }
      },
    },
    // {
    //   name: 'resource_languages',
    //   text: 'Langage :',
    //   values: [],
    //   toFilterParam: (elem) => {
    //     return { resource_languages: `"${elem?.resource_languages}"` };
    //   },
    // },
  ]
  /**
   * crée l'object params pour la requete
   * @param {*} baseParams base des params
   * @return {*} params enrichis pour la requete
   */
  function createParams(baseParams) {
    if (searchText.current.value) baseParams[searchText.current.value] = ''
    currentFilters.forEach((filter) => Object.assign(baseParams, filter))
    return baseParams
  }

  /**
   * verifie si 2 Filtre sont du même type
   * @param {*} a filtre 1
   * @param {*} b filtre 2
   * @return {boolean} true si les 2 filtre sont du même type
   */
  function isSameFilterType(a, b) {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a)
    const bProps = Object.getOwnPropertyNames(b)

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false
    }
    return aProps[0] === bProps[0]
  }

  /**
   * verifie si 2 Filtre sont identique
   * @param {*} a filtre 1
   * @param {*} b filtre 2
   * @return {boolean} true si les 2 filtre sont identique
   */
  function isSameFilter(a, b) {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a)
    const bProps = Object.getOwnPropertyNames(b)

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false
    }
    const propName = aProps[0]
    return a[propName] === b[propName]
  }

  /**
   * verifie si 1 Filtre est selectionné
   * @param {*} filterParam filtre to test
   * @return {boolean} true si le filtre est séléctionné
   */
  function isSelectedFilter(filterParam) {
    return currentFilters.findIndex((element) => isSameFilter(element, filterParam)) >= 0
  }

  /**
   * ajoute un filter pour la requete
   * @param {*} filterParam element a rajouter
   */
  function addToFilter(filterParam) {
    const filterList = currentFilters.slice()
    const indexType = filterList.findIndex((element) => isSameFilterType(element, filterParam))
    const index = filterList.findIndex((element) => isSameFilter(element, filterParam))
    // should add
    if (indexType === -1) {
      setCurrentFilters(filterList.concat(filterParam))
    } else if (index > -1) {
      // should replace/remove
      filterList.splice(index, 1)
      setCurrentFilters(filterList)
    } else {
      filterList.splice(indexType, 1)
      setCurrentFilters(filterList.concat(filterParam))
    }
  }

  const getFirstKey = (obj) => Object.keys(obj)[0]
  const getAbsFilterVal = (str, toggle) =>
    `${str}`.startsWith('-') ? `${str}`.substring(1) : `${toggle ? '-' : ''}${str}`
  const toggleFilterVal = (str) => getAbsFilterVal(str, true)
  /**
   * ajoute un filter pour la requete
   * @param {*} filterParam element a rajouter
   */
  function toggleFilter(filterParam) {
    const filterKey = getFirstKey(filterParam)
    const newFilterVal = filterParam[filterKey]

    const filterList = currentFilters.slice()
    const existingFilterIndex = filterList.findIndex(
      (existingFilter) => getFirstKey(existingFilter) === filterKey
    )
    // should add
    const newFilter = { [filterKey]: newFilterVal }
    if (existingFilterIndex === -1) {
      setCurrentFilters(filterList.concat(newFilter))
    } else {
      // should replace/remove

      const existingFilter = filterList[existingFilterIndex]
      const existingFilterVal = existingFilter[filterKey]
      if (getAbsFilterVal(existingFilterVal) !== getAbsFilterVal(newFilterVal)) {
        // We were using another reference value for this filter type
        filterList[existingFilterIndex] = newFilter
      } else {
        // Simple toggle of the actual reference value for this filter type
        filterList[existingFilterIndex] = { [filterKey]: toggleFilterVal(existingFilterVal) }
      }
      setCurrentFilters(filterList)
    }
  }

  /**
   * recup la 1er page des métadonnéees et les countBy
   */
  function getInitialData() {
    Promise.all(
      filterConf.map((count) =>
        axios.get(getApiData(`resources${searchMode()}`), {
          params: createParams({ count_by: count.name }),
        })
      )
    )
      .then((values) => {
        const updatedFilter = filterConf.map((filter, i) => {
          filter.values = values[i].data
          return filter
        })
        setAllCountByFilters(updatedFilter)
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  /**
   * récupere la page suivante
   */
  function fetchMoreData() {
    axios
      .get(getApiData(`resources${searchMode()}`), {
        params: createParams({ limit: PAGE_SIZE, offset: currentOffset }),
      })
      .then((res) => {
        const data = isSearchMode() ? res.data.items : res.data
        if (data.length < PAGE_SIZE) setHasMore(false)
        setMetadataList((metadatas) => metadatas.concat(data))
      })
      .catch((err) => (err.response?.status == 401 ? logout() : defaultErrorHandler(err)))
  }

  /**
   * récupere le label pour un element d'un countByFilter
   * @param {*} filterValue element d'un countByFilter
   * @param {*} filterObject configuration du countByFilter
   * @return {String} label de l'élément
   */
  function getFilterLabel(filterValue, filterObject) {
    try {
      // console.log('T getFilterLabel.filterValue:', filterValue)
      // console.log('T getFilterLabel.filterObject:', filterObject)
      let result = filterValue[filterObject?.name] || 'ERR: "name" not found'
      if (filterObject?.displayName && result[filterObject?.displayName]) {
        result = result[filterObject.displayName]
      }
      return result
    } catch (err) {
      if (err.response?.status == 401) logout()
      else defaultErrorHandler(err)
    }
  }

  // TODO :  sticky-top ?
  return (
    <div className="tempPaddingTop">
      <div className="row catalogue">
        <div className="col-3 rounded temp-align">
          <div className="row">
            <div className="left-hand-blocks">
              <div className="label-lv1">Trier</div>
              <div className="btn-group" role="group" aria-label="sort">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleFilter({ sort_by: `-updatedAt` })}
                >
                  Modifié
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleFilter({ sort_by: `resource_title` })}
                >
                  A à Z
                </button>

                <div className="btn-group" role="group">
                  <button
                    id="sortDrop"
                    type="button"
                    className="btn btn-secondary dropdown-toggle"
                    data-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded="false"
                  >
                    ...
                  </button>
                  <div className="dropdown-menu" aria-labelledby="sortDrop">
                    <a
                      className="dropdown-item"
                      onClick={() => addToFilter({ sort_by: `resource_title` })}
                    >
                      Alphabétique
                    </a>
                    <a
                      className="dropdown-item"
                      onClick={() => addToFilter({ sort_by: `-resource_title` })}
                    >
                      Anti alphabétique
                    </a>
                    <a
                      className="dropdown-item"
                      onClick={() => addToFilter({ sort_by: `-updatedAt` })}
                    >
                      Récemment modifiés
                    </a>
                    <a
                      className="dropdown-item"
                      onClick={() => addToFilter({ sort_by: `updatedAt` })}
                    >
                      Anciennement modifiés
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="left-hand-blocks">
              <div className="label-lv1">Rechercher</div>
              <div className="input-group flex-nowrap">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Recherche"
                  ref={searchText}
                  aria-label="Recherche"
                  aria-describedby="addon-wrapping"
                />
                <button type="button" className="btn btn-success" onClick={() => refresh()}>
                  <Search />
                </button>
              </div>
              <div>
                <div className="on-right">
                  <label htmlFor="ext_search_on">Étendre la recherche</label>
                  <input
                    type="checkbox"
                    className="checkbox"
                    id="ext_search_on"
                    name="ext_search_on"
                  />
                </div>
              </div>
            </div>
            <div className="left-hand-blocks">
              <div className="label-lv1">Filtrer</div>
              <div className="row no-row-margin">
                {allCountByFilters.map((filterObject, i) => {
                  // console.log(filter)
                  return !filterObject.values ? (
                    'No values'
                  ) : (
                    <div
                      className={i ? 'col border rounded' : 'border rounded'}
                      key={filterObject.name}
                    >
                      <div className="label-lv2">{filterObject.text}</div>
                      <ul className="list-group">
                        {filterObject.values.map((filterValue, i) => {
                          const filterLabel = getFilterLabel(filterValue, filterObject)
                          const key = filterLabel + i
                          return (
                            <li
                              className="filter-items"
                              key={key}
                              onClick={() => addToFilter(filterObject.toFilterParam(filterValue))}
                            >
                              {filterObject.display
                                ? filterObject.display(filterValue, filterObject)
                                : filterLabel}
                              <span
                                className={`badge rounded-pill text-bg-${
                                  isSelectedFilter(filterObject.toFilterParam(filterValue))
                                    ? 'success'
                                    : 'primary'
                                }`}
                              >
                                {filterValue.count}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="col-9">
          <div className="row">
            {isEdit && (
              <EditObjCard
                idField={idField}
                deleteUrl={deleteUrl}
                deleteConfirmMsg={deleteConfirmMsg}
                deleteMsg={deleteMsg}
                btnTextAdd={btnTextAdd}
                btnTextChg={btnTextChg}
                refresh={refresh}
              ></EditObjCard>
            )}
            <InfiniteScroll
              dataLength={metadataList.length}
              next={() => setCurrentOffset(currentOffset + PAGE_SIZE)}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
              endMessage={<i>Aucune donnée supplémentaire</i>}
            >
              {metadataList.map((metadata) => {
                return (
                  <MetadataCard
                    editMode={isEdit}
                    metadata={metadata}
                    refresh={refresh}
                    key={metadata.global_id}
                  ></MetadataCard>
                )
              })}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  )
}
