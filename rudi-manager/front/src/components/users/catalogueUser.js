import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import PropTypes from 'prop-types';
import UserCard from './userCard';
import EditUserCard from './editUserCard';
import useDefaultErrorHandler from '../../utils/useDefaultErrorHandler';

/**
 * Composant : CatalogueUser
 * @return {ReactNode}
 */
export default function CatalogueUser({ editMode, display }) {
  const { defaultErrorHandler } = useDefaultErrorHandler();
  const [users, setUser] = useState([]);
  const [hasMore] = useState(false);

  const refresh = () => {
    getInitialData();
  };

  /**
   * recup la 1er page des métadonnéees et les countBy
   */
  function getInitialData() {
    axios
      .get(`${process.env.PUBLIC_URL}/api/v1/users`)
      .then((res) => {
        const userFromAPI = res.data;
        setUser(userFromAPI);
      })
      .catch((e) => {
        defaultErrorHandler(e);
      });
  }
  useEffect(() => {
    getInitialData();
  }, []);

  return (
    <div className="tempPaddingTop">
      <div className="row">
        <div className="col-9">
          <div className="row">
            {display && display.editJDD && <EditUserCard></EditUserCard>}
            <InfiniteScroll
              dataLength={users.length}
              next={() => {}}
              hasMore={hasMore}
              loader={<h4>Loading...</h4>}
            >
              {users.map((user, i) => {
                return (
                  <UserCard
                    user={user}
                    display={display}
                    refresh={refresh}
                    key={user.id}
                  ></UserCard>
                );
              })}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  );
}
CatalogueUser.propTypes = {
  display: PropTypes.object,
  editMode: PropTypes.object,
};
