import './styles/App.scss'

import axios from 'axios'

import React, { useContext, useEffect, useState } from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import { createBrowserHistory } from 'history'

import { getApiFront, getBackUrl } from './utils/frontOptions'

import { UserContext, UserContextProvider } from './context/authContext'
import { BackDataContext, BackDataContextProvider } from './context/backDataContext'

import ChangePwd, { showPill as showPillChgPwd } from './components/login/changePwd'
import Login, { showPill as showPillLogin } from './components/login/login'
import Register, { showPill as showPillRegister } from './components/login/register'

import CatalogueLicence from './components/catalogue/catalogueLicence'
import CatalogueMetadata from './components/catalogue/catalogueMetadata'
import CatalogueContact from './components/generic/catalogueContact'
import CatalogueProducer from './components/generic/catalogueProducer'
import CataloguePubKeys from './components/generic/cataloguePubKeys'
import CatalogueReports from './components/generic/catalogueReports'
import ModalProvider from './components/modals/genericModalContext'
import Monitoring from './components/monitoring/monitoring'
import CatalogueUser from './components/users/catalogueUser'
import Visualisation from './components/visualisation/visualisation'
import { JwtContext, JwtContextProvider } from './context/jwtContext'

export const history = createBrowserHistory({ basename: getBackUrl() })

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
  return (
    <JwtContextProvider>
      <UserContextProvider>
        <BackDataContextProvider>
          <Main />
        </BackDataContextProvider>
      </UserContextProvider>
    </JwtContextProvider>
  )
}
const Main = () => {
  // ---------------- Loading context
  const { token, updateToken } = useContext(JwtContext)
  const { isEditor, isAdmin } = useContext(UserContext)
  const { appInfo } = useContext(BackDataContext)

  // ---------------- Login modals
  const [isLoginOpen, setIsLoginOpen] = useState(true)
  const [isChgPwdOpen, setIsChgPwdOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  const showLoginBox = () => {
    setIsLoginOpen(true)
    setIsChgPwdOpen(false)
    setIsRegisterOpen(false)
  }

  const showChgPwdBox = () => {
    setIsLoginOpen(false)
    setIsChgPwdOpen(true)
    setIsRegisterOpen(false)
  }

  const showRegisterBox = () => {
    setIsLoginOpen(false)
    setIsChgPwdOpen(false)
    setIsRegisterOpen(true)
  }

  // ---------------- Tags
  /**
   * Returns the code to display the version tag (if defined)
   * @param {string} appTag the tag for the app (ex: 2.3.1)
   * @param {string} gitHash the abbreviated git hash
   * @return {ReactNode} the code to display the version tag (if defined)
   */
  const displayVersion = () => (
    <div id="displayTags">
      <div className="appTag">{appInfo.appTag}</div>
      <div className="gitTag">{appInfo.gitHash}</div>
    </div>
  )

  const [displayTags, setDisplayTags] = useState(displayVersion())

  useEffect(() => setDisplayTags(displayVersion()), [appInfo?.appTag, appInfo?.gitHash])
  // useEffect(() => console.log('T (displayAppInfo) appInfo', appInfo), [appInfo])

  /**
   *
   * @param {*} destUrl
   * @param {*} buttonText
   * @param {*} show
   * @return {ReactNode}
   */
  const navItem = (destUrl, buttonText, show = true) => (
    <li className={show ? 'nav-item' : 'nav-item hide-wip'}>
      <Link to={getBackUrl(destUrl)}>
        <button type="button" className="btn btn-primary">
          {buttonText}
        </button>
      </Link>
    </li>
  )

  const exit = () => updateToken({})

  /**
   * logout
   * @return {void}
   */
  const logout = () => {
    axios
      .get(getBackUrl(getApiFront('logout')))
      .then((res) => {
        // console.debug('T (logout.ok)')
        exit()
      })
      .catch((err) => {
        console.error('T (logout.ko)', err)
        exit()
      })
  }

  return !token ? (
    <div>
      {isLoginOpen && <Login updateToken={updateToken} />}
      {isChgPwdOpen && <ChangePwd backToLogin={showLoginBox} />}
      {isRegisterOpen && <Register backToLogin={showLoginBox} />}
      <div className="login-switch">
        {showPillLogin(!isLoginOpen, showLoginBox)}
        {showPillChgPwd(!isChgPwdOpen, showChgPwdBox)}
        {showPillRegister(!isRegisterOpen, showRegisterBox)}
      </div>
    </div>
  ) : (
    <Router>
      <ModalProvider>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="modal-test"></div>
        <header>
          <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-navbar">
            <div className="container-fluid">
              <img
                className="icon-navbar logo-margin"
                src={`logo_blanc_orange.png`}
                alt="Rudi logo"
              />
              <button
                className="navbar-toggler align-right"
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
                  {navItem('', 'Catalogue')}
                  {navItem('licence', 'Licence')}
                  {navItem('show', 'Visualisation')}
                  <li className={isEditor ? 'nav-item' : 'nav-item hide-wip'}>
                    <DropdownButton id="dropdown-gestion-button" title="Gestion">
                      <Dropdown.Item as={Link} to={getBackUrl('metadata')}>
                        Métadonnées
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={getBackUrl('producer')}>
                        Producteurs
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={getBackUrl('contact')}>
                        Contacts
                      </Dropdown.Item>
                    </DropdownButton>
                  </li>
                  <li className={isAdmin ? 'nav-item' : 'nav-item hide-wip'}>
                    <DropdownButton id="dropdown-gestion-button" title="Admin">
                      <Dropdown.Item as={Link} to={getBackUrl('pub_key')}>
                        Clés
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={getBackUrl('user')}>
                        Utilisateurs
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to={getBackUrl('report')}>
                        Rapports portail
                      </Dropdown.Item>
                    </DropdownButton>
                  </li>

                  {navItem('monitoring', 'Monitoring', false)}
                  {navItem('conf', 'Configuration', false)}

                  <li className="nav-item center ">
                    <button
                      type="button"
                      className="margin-logout btn btn-secondary"
                      onClick={() => logout()}
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            {displayTags}
          </nav>
        </header>

        <div id="root"></div>

        <Routes>
          <Route path={getBackUrl()} element={<CatalogueMetadata logout={logout} />} />
          <Route
            path={getBackUrl('metadata')}
            element={<CatalogueMetadata editMode={isEditor} logout={logout} />}
          />
          <Route
            path={getBackUrl('producer')}
            element={<CatalogueProducer editMode={isEditor} logout={logout} />}
          />
          <Route
            path={getBackUrl('contact')}
            element={<CatalogueContact editMode={isEditor} logout={logout} />}
          />
          <Route
            path={getBackUrl('pub_key')}
            element={<CataloguePubKeys editMode={isAdmin} logout={logout} />}
          />
          <Route
            path={getBackUrl('report')}
            element={<CatalogueReports editMode={isAdmin} logout={logout} />}
          />
          <Route path={getBackUrl('licence')} element={<CatalogueLicence logout={logout} />} />
          <Route path={getBackUrl('show/:id')} element={<Visualisation logout={logout} />} />
          <Route path={getBackUrl('show')} element={<Visualisation logout={logout} />} />
          <Route path={getBackUrl('monitoring')} element={<Monitoring logout={logout} />} />
          <Route
            path={getBackUrl('user')}
            element={<CatalogueUser editMode={isAdmin} logout={logout} />}
          />
          <Route path={getBackUrl('conf')} element={<div className="tempPaddingTop">WIP</div>} />
          <Route path="*" element={<CatalogueMetadata logout={logout} />} />
        </Routes>
      </ModalProvider>
    </Router>
  )
}
