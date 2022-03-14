import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import PropTypes from 'prop-types';
import MetadataCard from './metadataCard';
import EditCard from './editCard';
import { filterConf } from './conf';
import { GeneralContext } from '../../generalContext';
import ThemeDisplay from '../other/themeDisplay';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';
import { Search } from 'react-bootstrap-icons';

/**
 * Composant : Catalogue
 * @return {ReactNode}
 */
export default function Catalogue({ display, specialSearch, editMode }) {
  const [metadatas, setMetadatas] = useState([]);
  const [countBy, setCountBy] = useState([]);
  const [currentFilters, setCurrentFilters] = useState([{ sort_by: `-updatedAt` }]);
  const [formUrl, setFormUrl] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [currentOffset, setCurrentOffset] = useState(-1);

  const initialRender = useRef(true);
  const searchText = useRef(null);
  const isSearchMode = () => {
    return searchText.current.value && searchText.current.value.length > 0;
  };
  const searchMode = () => {
    if (isSearchMode()) {
      return `/search`;
    }
    return '';
  };

  const generalConf = useContext(GeneralContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  useEffect(() => {
    setFormUrl(`${generalConf.formUrl}`);
  }, [generalConf]);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      if (currentOffset < 0) {
        setCurrentOffset(0);
      } else {
        fetchMoreData();
      }
    }
  }, [currentOffset]);
  useEffect(() => {
    refresh();
  }, [currentFilters]);

  const refresh = () => {
    setHasMore(true);
    setMetadatas([]);
    getInitialData();

    if (currentOffset === 0) {
      setCurrentOffset(-1);
    } else {
      setCurrentOffset(0);
    }
  };

  /**
   * crée l'object params pour la requete
   * @param {*} baseParams base des params
   * @return {*} params enrichis pour la requete
   */
  function createParams(baseParams) {
    baseParams[searchText.current.value] = '';
    currentFilters.forEach((filter) => Object.assign(baseParams, filter));
    return baseParams;
  }

  /**
   * verifie si 2 Filtre sont du même type
   * @param {*} a filtre 1
   * @param {*} b filtre 2
   * @return {boolean} true si les 2 filtre sont du même type
   */
  function isSameFilterType(a, b) {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false;
    }
    return aProps[0] === bProps[0];
  }

  /**
   * verifie si 2 Filtre sont identique
   * @param {*} a filtre 1
   * @param {*} b filtre 2
   * @return {boolean} true si les 2 filtre sont identique
   */
  function isSameFilter(a, b) {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false;
    }
    const propName = aProps[0];
    return a[propName] === b[propName];
  }

  /**
   * verifie si 1 Filtre est selectionné
   * @param {*} filterParam filtre to test
   * @return {boolean} true si le filtre est séléctionné
   */
  function isSelectedFilter(filterParam) {
    return currentFilters.findIndex((element) => isSameFilter(element, filterParam)) >= 0;
  }

  /**
   * ajoute un filter pour la requete
   * @param {*} filterParam element a rajouter
   */
  function addToFilter(filterParam) {
    const filterList = currentFilters.slice();
    const indexType = filterList.findIndex((element) => isSameFilterType(element, filterParam));
    const index = filterList.findIndex((element) => isSameFilter(element, filterParam));
    // should add
    if (indexType === -1) {
      setCurrentFilters(filterList.concat(filterParam));
    } else {
      // should replace/remove
      if (index > -1) {
        filterList.splice(index, 1);
        setCurrentFilters(filterList);
      } else {
        filterList.splice(indexType, 1);
        setCurrentFilters(filterList.concat(filterParam));
      }
    }
  }

  /**
   * recup la 1er page des métadonnéees et les countBy
   */
  function getInitialData() {
    Promise.all(
      filterConf.map((count) =>
        axios.get(`${process.env.PUBLIC_URL}/api/admin/resources${searchMode()}`, {
          params: createParams({ count_by: count.name }),
        }),
      ),
    )
      .then((values) => {
        const countByTemp = filterConf.map((count, i) => {
          count.values = values[i].data;
          return count;
        });
        setCountBy(countByTemp);
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * récupere la page suivante
   */
  function fetchMoreData() {
    axios
      .get(`${process.env.PUBLIC_URL}/api/admin/resources${searchMode()}`, {
        params: createParams({ limit: PAGE_SIZE, offset: currentOffset }),
      })
      .then((res) => {
        let datas;
        if (isSearchMode()) {
          datas = res.data.items;
        } else {
          datas = res.data;
        }
        if (datas.length === 0) {
          setHasMore(false);
        }
        setMetadatas((metadatas) => metadatas.concat(datas));
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * récupere le label pour un element d'un countBy
   * @param {*} filterElement element d'un countBy
   * @param {*} filterConfig configuration du countBy
   * @return {String} label de l'élément
   */
  function getFilterLabel(filterElement, filterConfig) {
    let result = filterElement[filterConfig.name];
    if (filterConfig.displayName) {
      result = result[filterConfig.displayName];
    }
    return result;
  }

  // TODO :  sticky-top ?
  return (
    <div className="tempPaddingTop">
      <div className="row">
        {display && display.searchbar && (
          <div className="col-3 border rounded  tempAlign">
            <div className="row">
              <div className="col-12 border rounded tempMargin">
                <h5>Trier</h5>
                <div className="btn-group" role="group" aria-label="sort">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => addToFilter({ sort_by: `-updatedAt` })}
                  >
                    Modifié
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => addToFilter({ sort_by: `resource_title` })}
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
                        onClick={(e) => addToFilter({ sort_by: `resource_title` })}
                      >
                        Alphabétique
                      </a>
                      <a
                        className="dropdown-item"
                        onClick={(e) => addToFilter({ sort_by: `-resource_title` })}
                      >
                        Anti alphabétique
                      </a>
                      <a
                        className="dropdown-item"
                        onClick={(e) => addToFilter({ sort_by: `-updatedAt` })}
                      >
                        Récemment modifiés
                      </a>
                      <a
                        className="dropdown-item"
                        onClick={(e) => addToFilter({ sort_by: `updatedAt` })}
                      >
                        Anciennement modifiés
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 border rounded tempMargin">
                <h5>Rechercher</h5>
                <div className="input-group flex-nowrap">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Recherche"
                    ref={searchText}
                    aria-label="Recherche"
                    aria-describedby="addon-wrapping"
                  />
                  <button type="button" className="btn btn-success" onClick={(e) => refresh()}>
                    {' '}
                    <Search />
                  </button>
                </div>
              </div>
              <div className="col-12 border rounded tempMargin">
                <h5>Filtrer</h5>
                <div className="row">
                  {countBy.map((filter, i) => {
                    return (
                      <div className="col border rounded" key={filter.name}>
                        <span>{filter.text}</span>
                        <ul className="list-group">
                          {filter.values.map((filterValue, i) => {
                            return (
                              <li
                                className="list-group-item d-flex justify-content-between align-items-center"
                                key={getFilterLabel(filterValue, filter) + i}
                                onClick={(e) => addToFilter(filter.toFilterParam(filterValue))}
                              >
                                {filter.name === 'theme' && (
                                  <ThemeDisplay
                                    value={getFilterLabel(filterValue, filter)}
                                  ></ThemeDisplay>
                                )}
                                {filter.name !== 'theme' && getFilterLabel(filterValue, filter)}
                                <span
                                  className={`badge ${
                                    isSelectedFilter(filter.toFilterParam(filterValue))
                                      ? 'badge-success'
                                      : 'badge-primary'
                                  } badge-pill`}
                                >
                                  {filterValue.count}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="col-9">
          <div className="row">
            {display && display.editJDD && formUrl && (
              <EditCard formUrl={formUrl} refresh={refresh}></EditCard>
            )}
            <InfiniteScroll
              dataLength={metadatas.length}
              next={() => {
                setCurrentOffset(currentOffset + PAGE_SIZE);
              }}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
            >
              {metadatas.map((metadata, i) => {
                return (
                  <MetadataCard
                    metadata={metadata}
                    formUrl={formUrl}
                    display={display}
                    refresh={refresh}
                    key={metadata.global_id}
                  ></MetadataCard>
                );
              })}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  );
}
Catalogue.propTypes = {
  display: PropTypes.object,
  specialSearch: PropTypes.object,
  editMode: PropTypes.object,
};
