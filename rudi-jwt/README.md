# RUDI producer node: JWT creation module

_Create JWT for sending requests to the RUDI Producer API/proxy module_

##### Author: Olivier Martineau (olivier.martineau@irisa.fr)

---

## Configuration

Configuration files can be found in the **"0-ini" directory**.

- **"0-ini/conf_default.ini"**: default configuration and use examples
- **"0-ini/conf_custom.ini"**: user configuration, to be created.

In these files, you have to provide a path for the **profiles** file that indicates the public and private key for the
subject you will use in the RUDI JWT ( "key" [removed from the JWT] or "sub" [kept in the JWT] property)

This subject and the associated public key must be equally defined on the side of the RUDI producer API module.

---

## API to use this module

### _JWT creation / verification_

- `POST /crypto/jwt/forge` Create a JWT with the following information (to be included in the body of the request as a JSON)

  - `exp`: token expiration date in Epoch seconds
  - `jti`: token identifier (preferably UUIDv4)
  - `sub`: requester, ie API client that sends the HTTP request
  - `req_mtd`: http method used for the request
  - `req_url`: url of the request
  - `client_id`: (optional) identifier of the logged user

- `GET /crypto/jwt/check`
  Check the validity of the JWT placed in header (`"Authentification": Bearer <token>`)

- `POST /crypto/jwt/check`
  Check the validity of the JWT string in the request body

---

### _Redirection with JWT identification_

The following routes redirect `GET/POST/PUT/DELETE` requests to the destination URL: it replaces in the request URL the
current module domain with the one of the API module as configured in **conf_custom.ini**.

- `GET /crypto/redirect/<destination_url>`
- `POST /crypto/redirect/<destination_url>`
- `PUT /crypto/redirect/<destination_url>`
- `DELETE /crypto/redirect/<destination_url>`

#### Examples:

> GET http://127.0.0.1:4000/crypto/redirect/resources?sort=-global_id

returns the result of

> GET http://127.0.0.1:3000/api/admin/resources?sort=-global_id

In a similar way,

> GET http://127.0.0.1:4000/crypto/redirect/resources/b0fcf63b-c220-4275-8dcb-e8f663203c33

returns the result of

> GET http://127.0.0.1:3000/api/admin/resources/b0fcf63b-c220-4275-8dcb-e8f663203c33

---

### _Accessing the logs_

- `GET /crypto/logs`
  Get logs
- `DELETE /crypto/logs`
  Clear logs
