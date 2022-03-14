import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import PropTypes from 'prop-types';
import LicenceCard from './licenceCard';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : CatalogueLicence
 * @return {ReactNode}
 */
export default function CatalogueLicence({ display, specialSearch, editMode }) {
  const { defaultErrorHandler } = useDefaultErrorHandler();

  const [metadatas, setMetadatas] = useState([]);
  const [formUrl, setFormUrl] = useState('');
  const [hasMore] = useState(false);

  useEffect(() => {
    axios
      .get(`${process.env.PUBLIC_URL}/api/v1/formUrl`)
      .then((res) => {
        setFormUrl(res.data);
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
    getInitialData();
  }, []);
  /**
   * recup la 1er page des métadonnéees
   */
  function getInitialData() {
    axios
      .get(`${process.env.PUBLIC_URL}/api/admin/licences`)
      .then((res) => {
        setMetadatas(res.data);
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }

  return (
    <div className="tempPaddingTop">
      <div className="row">
        <div className="col-9">
          <div className="row">
            <InfiniteScroll
              dataLength={metadatas.length}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
            >
              {metadatas.map((metadata, i) => {
                return (
                  <LicenceCard
                    metadata={metadata}
                    formUrl={formUrl}
                    display={display}
                    key={metadata.concept_id}
                  ></LicenceCard>
                );
              })}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  );
}
CatalogueLicence.propTypes = {
  display: PropTypes.object,
  specialSearch: PropTypes.object,
  editMode: PropTypes.object,
};
