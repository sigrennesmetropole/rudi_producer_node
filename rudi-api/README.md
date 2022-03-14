# RUDI producer proxy API module: access to Producer node resources metadata

_This module offers a RESTful interface to access the RUDI metadata publically exposed on the RUDI Producer node.
It also makes it possible to upload metadata from another module such as the Producer node manager (https://gitlab.aqmo.org/rudidev/rudi-console-proxy)_

##### Author: Olivier Martineau (olivier.martineau@irisa.fr)

---

## List of features

The Media driver provides :

- A definition of the RUDI metadata that is compatible with the definition (https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER)
- A public API for fetching metadata
- A private API for creating, accessing, updating and deleting metadata.

---

## Current deployment

- **release**: production-like environment used to ensure the compatibility with Rennes Métropole's RUDI Portal. This version is the one to be deployed in production.
- **shared**: development environment used to ensure the compatibility with the other modules of the RUDI Producer node
- **test**: environment used to test that the current code can be executed on a distant node

---

## Public API

_See https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER/ for further information_

**Use example:**

> GET https://data-rudi.aqmo.org/api/v1/resources?limit=10&fields=global_id,resource_title&updated_after=2021-07

---

## Redirected routes

- `GET /api` -> `GET /api/v1/resources`
- `GET /api/v1` -> `GET /api/v1/resources`
- `GET /resources` -> `GET /api/v1/resources`
- `GET /resources/*` -> `GET /api/v1/resources/*`

## No authentification required

- `GET /api/version`
- `GET /api/admin/hash`
- `GET /api/admin/apphash`
- `GET /api/admin/env`
- `GET /api/v1/resources`
- `GET /api/v1/resources/:id`

## Portal authentification required

- `PUT /resources/*`-> `PUT /api/v1/resources/*`
- `PUT /resources/:id/report`
- `PUT /api/v1/resources/:id/report`
- `GET /api/v1/resources/:id/report`
- `GET /api/v1/resources/:id/report/:irid`

## Rudi prod authentification required, action on objects

- `POST /api/admin/:object`
- `PUT /api/admin/:object`
- `GET /api/admin/:object`
- `GET /api/admin/:object/:id`
- `DELETE /api/admin/:object/:id`
- `DELETE /api/admin/:object`
- `POST /api/admin/:object/deletion`
- `GET /api/admin/:object/unlinked`
- `GET /api/admin/:object/search`
- `GET /api/admin/search`
- `POST /api/admin/:object/:id/reports`
- `PUT /api/admin/:object/:id/reports`
- `GET /api/admin/:object/:id/reports`
- `GET /api/admin/:object/:id/reports/:irid`
- `GET /api/admin/:object/reports`
- `DELETE /api/admin/:object/:id/reports/:irid`
- `DELETE /api/admin/:object/:id/reports`
- `POST /api/admin/:object/:id/reports/deletion`

## Rudi prod authentification + app driven actions

- `GET /api/admin/nv`
- `GET /api/admin/enum`
- `GET /api/admin/enum/:code`
- `GET /api/admin/enum/:code/:lang`
- `GET /api/admin/licences`
- `GET /api/admin/licence_codes`
- `POST /api/admin/licences/init`
- `POST /api/admin/resources/init`
- `GET /api/admin/id_generation`
- `GET /api/admin/portal/token`
- `GET /api/admin/portal/token/check`
- `GET /api/admin/portal/resources/:id`
- `POST /api/admin/portal/resources/:id`
- `DELETE /api/admin/portal/resources/:id`
- `POST /api/admin/portal/resources/send`
- `GET /api/admin/logs`
- `GET /api/admin/logs/:lines`
- `GET /api/admin/logs/search`
- `GET /api/admin/db`
- `DELETE /api/admin/db/:object`
- `DELETE /api/admin/db`

---

## Configuration

Configuration files can be found in the **"0-ini" directory**.

- `0-ini/conf_default.ini`: default configuration and use examples
- `0-ini/conf_custom.ini`: user configuration, to be created (if defined, the value of the path variable `RUDI_API_USER_CONF` is taken as the full path of the custom INI file)

**`Security` section**
When the flag `should_control_private_requests` is true, JWT from incoming requests are controlled.

The parameter `profiles` indicates the path where is located the security file.

This security file defines the "profiles" for each client that can connect on the private side of the API.
They are defined each by a section whose **name** reflects the `sub` payload field in the JWT.

In this section,

- `pub_key` indicates the path where is stored the public key associated with the subject
- `routes[]` indicates the name of a route that is allowed for the user (see "0-ini/profiles.ini" file for a list of route names)

---

## Security

### Required header fields for RUDI JWT

- `alg`: the JWT algorithm (preferably "EdDSA"). It must correspond to the algorithm used to create the private key used to generate this token signature (preferably ed25519).

### Required payload fields for RUDI JWT

- `exp`: desired expiration date in Epoch seconds
- `sub`: a recognized "profile" configuration.
- `req_mtd`: the http method used in the request
- `req_url`: the URL of the request

### Optional payload fields for RUDI JWT

- `jti` (jwt identifier): a UUIDv4 identifying this JSON web token
- `iat` (issued at): date of the generation of the token in Epoch seconds
- `client_id`: an identifier for the logged user requesting the resource

---

## Test files

In `tests/env-rudi-*.postman_environment.json` the value for the key `cryptoJwtUrl` should be replaced with the valid address of the client/crypto module
