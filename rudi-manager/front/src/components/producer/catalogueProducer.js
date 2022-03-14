import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import PropTypes from 'prop-types';
import EditProducerCard from './editProducerCard';
import ProducerCard from './producerCard';
import { GeneralContext } from '../../generalContext';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : CatalogueProducer
 * @return {void}
 */
export default function CatalogueProducer({ display, specialSearch, editMode }) {
  const [organizations, setOrganizations] = useState([]);
  const [formUrl, setFormUrl] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [currentOffset, setCurrentOffset] = useState(0);

  const generalConf = useContext(GeneralContext);
  const { defaultErrorHandler } = useDefaultErrorHandler();

  useEffect(() => {
    getInitialData();
  }, []);
  useEffect(() => {
    setFormUrl(`${generalConf.formUrl}organizations`);
  }, [generalConf]);

  const refresh = () => {
    setHasMore(true);
    getInitialData();
  };

  /**
   * recup la 1er page des producteurs
   */
  function getInitialData() {
    axios
      .get(`${process.env.PUBLIC_URL}/api/admin/organizations`, {
        params: { limit: PAGE_SIZE, offset: 0 },
      })
      .then((res) => {
        setCurrentOffset(PAGE_SIZE);
        setOrganizations(res.data);
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  /**
   * récupere la page suivante
   * @return {Function} fonction utilisée par InfiniteScroll
   */
  function fetchMoreData() {
    return () => {
      axios
        .get(`${process.env.PUBLIC_URL}/api/admin/organizations`, {
          params: { limit: PAGE_SIZE, offset: currentOffset },
        })
        .then((res) => {
          const orgas = res.data;

          setCurrentOffset(currentOffset + PAGE_SIZE);
          if (orgas.length === 0) {
            setHasMore(false);
          }
          setOrganizations(organizations.concat(orgas));
        })
        .catch((e) => {
          defaultErrorHandler(e);
        });
    };
  }

  return (
    <div className="tempPaddingTop">
      <div className="row">
        <div className="col-9">
          <div className="row">
            {display && display.editJDD && (
              <EditProducerCard formUrl={formUrl} refresh={refresh}></EditProducerCard>
            )}
            <InfiniteScroll
              dataLength={organizations.length}
              next={fetchMoreData()}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
            >
              {organizations.map((organization, i) => {
                return (
                  <ProducerCard
                    organization={organization}
                    formUrl={formUrl}
                    refresh={refresh}
                    key={`${organization.organization_id}-${i}`}
                  ></ProducerCard>
                );
              })}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  );
}
CatalogueProducer.propTypes = {
  display: PropTypes.object,
  specialSearch: PropTypes.object,
  editMode: PropTypes.object,
};
