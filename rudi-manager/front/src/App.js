import React, { useState, useEffect } from 'react';
import './App.scss';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Catalogue from './components/catalogue/catalogue';
import CatalogueLicence from './components/catalogue/catalogueLicence';
import CatalogueUser from './components/users/catalogueUser';
import CatalogueProducer from './components/producer/catalogueProducer';
import CatalogueContact from './components/contact/catalogueContact';
import Visualisation from './components/visualisation/visualisation';
import { createBrowserHistory } from 'history';
import Login from './components/login/login';
import Register from './components/login/register';
import useToken from './useToken';
import { ModalProvider } from './components/modals/ModalContext';
import { GeneralContext } from './generalContext';
import axios from 'axios';
import Monitoring from './components/monitoring/monitoring';

console.log('process.env.PUBLIC_URL : ', process.env.PUBLIC_URL);
// TODO : move to util.js
export const PUBLIC_URL = process.env.PUBLIC_URL;
export const history = createBrowserHistory({
  basename: PUBLIC_URL,
});
/*
TODO :
- sticky filtre
- responsive
- filtre/sort/search
- remove key={...+i} when possible
*/

/**
 * Main App component
 * @return {ReactNode} main html or login component
 */
export default function App() {
  const { token, updateToken } = useToken();
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [generalConf, setGeneralConf] = useState({});

  const showLoginBox = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const showRegisterBox = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  useEffect(() => {
    if (!!token && !generalConf.formUrl) {
      Promise.all([
        axios.get(`${process.env.PUBLIC_URL}/api/v1/formUrl`).catch((e) => {
          return { data: '' };
        }),
        axios.get(`${process.env.PUBLIC_URL}/api/admin/enum/themes/fr`).catch((e) => {
          return { data: {} };
        }),
      ]).then((values) => {
        setGeneralConf({ formUrl: `${values[0].data}`, themeLabel: values[1].data });
      });
    }
  }, [token]);

  /**
   * logout
   */
  function logout() {
    axios.get(`${process.env.PUBLIC_URL}/api/v1/logout`).then((res) => {
      updateToken();
    });
  }

  if (!token) {
    return (
      <div>
        {isLoginOpen && <Login setToken={updateToken} />}
        {isRegisterOpen && <Register backToLogin={showLoginBox} />}
        <div className="login-switch">
          {!isLoginOpen && (
            <span className="badge badge-success badge-pill" onClick={showLoginBox}>
              Login
            </span>
          )}
          {!isRegisterOpen && (
            <span className="badge badge-success badge-pill" onClick={showRegisterBox}>
              Register
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <Router basename={PUBLIC_URL}>
      <ModalProvider>
        <GeneralContext.Provider value={generalConf}>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="modal-test"></div>
          <header>
            <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-navbar">
              <div className="container-fluid">
                <img
                  className="icon-navbar"
                  src={`${process.env.PUBLIC_URL}/logo_blanc_orange.png`}
                  alt="Rudi logo"
                />
                <button
                  className="navbar-toggler"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarCollapse"
                  aria-controls="navbarCollapse"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarCollapse">
                  <ul className="navbar-nav me-auto mb-2 mb-md-0">
                    <li className="nav-item">
                      <Link to="/">
                        <button type="button" className="btn btn-primary button-margin">
                          Catalogue
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/licence">
                        <button type="button" className="btn btn-primary button-margin">
                          Licence
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/show/">
                        <button type="button" className="btn btn-primary button-margin">
                          Visualisation
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <DropdownButton id="dropdown-gestion-button" title="Gestion">
                        <Dropdown.Item href={`${process.env.PUBLIC_URL}/gestion`}>
                          Métadonnée
                        </Dropdown.Item>
                        <Dropdown.Item href={`${process.env.PUBLIC_URL}/producer`}>
                          Producteur
                        </Dropdown.Item>
                        <Dropdown.Item href={`${process.env.PUBLIC_URL}/contact`}>
                          Contacts
                        </Dropdown.Item>
                      </DropdownButton>
                    </li>
                    <li className="nav-item hideWIP">
                      <Link to="/monitoring">
                        <button type="button" className="btn btn-primary button-margin">
                          Monitoring
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/user">
                        <button type="button" className="btn btn-primary button-margin">
                          Utilisateur
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item hideWIP">
                      <Link to="/conf">
                        <button type="button" className="btn btn-primary button-margin">
                          Configuration
                        </button>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className="btn btn-secondary button-margin"
                        onClick={() => logout()}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </header>

          <div id="root"></div>

          <Switch>
            <Route exact path="/">
              <Catalogue
                display={{ searchbar: true, editJDD: false }}
                specialSearch={{}}
                editMode={{}}
              />
            </Route>
            <Route path="/gestion">
              <Catalogue
                display={{ searchbar: true, editJDD: true }}
                specialSearch={{}}
                editMode={{}}
              />
            </Route>
            <Route path="/producer">
              <CatalogueProducer
                display={{ searchbar: true, editJDD: true }}
                specialSearch={{}}
                editMode={{}}
              />
            </Route>
            <Route path="/contact">
              <CatalogueContact
                display={{ searchbar: true, editJDD: true }}
                specialSearch={{}}
                editMode={{}}
              />
            </Route>
            <Route path="/licence">
              <CatalogueLicence display={{ editJDD: false }} editMode={{}} />
            </Route>
            <Route path="/show/:id">
              <Visualisation />
            </Route>
            <Route path="/show">
              <Visualisation />
            </Route>
            <Route path="/monitoring">
              <Monitoring />
            </Route>
            <Route path="/user">
              <CatalogueUser display={{ searchbar: true, editJDD: true }} editMode={{}} />
            </Route>
            <Route path="/conf">
              <div className="tempPaddingTop">Work in progress</div>
            </Route>
          </Switch>
        </GeneralContext.Provider>
      </ModalProvider>
    </Router>
  );
}
