# Postman tests: the documentation

## Prerequisites

To run the tests, you'll most likely need the `rudi-crypto` module to be running in the same environment as where the tests are run (possibly on your machine).
You'll also need a private key to be present on every environment you wish to test, and the API module to be configured to accept this key as a new profile. This is explicited in the "Setting up Postman / Newman tests for other environments" part.

## Tests description

The tests of each collection are usually meant to be executed sequentially.
For instance, organization and contact-related tests have to be executed before resources/metadata tests are run.

| Test collection name                                                                     | Description                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rudi-soft-checks.postman_collection.json](rudi-soft-checks.postman_collection.json)     | These non-intrusive tests can be executed on every environment, including production environment. Every object created by the test is tagged with a stamp and removed at the end of the tests. |
| [rudi-sanity-checks.postman_collection.json](rudi-sanity-checks.postman_collection.json) | This test collection is meant to be used with `test` environment only. It executes some deep checks that are not suitable for running environments.                                            |

## Environment variable collections for tests

Here are the environment variable collections used for each dev environment.

| Collection name                                                                      | Associated environment name | Environment URL                   |
| ------------------------------------------------------------------------------------ | :-------------------------: | --------------------------------- |
| [env-rudi-public.postman_environment.json](env-rudi-public.postman_environment.json) |           Release           | https://data-rudi.aqmo.org        |
| [env-rudi-shared.postman_environment.json](env-rudi-shared.postman_environment.json) |           Shared            | https://shared-rudi.aqmo.org      |
| [env-rudi-test.postman_environment.json](env-rudi-test.postman_environment.json)     |            Test             | https://shared-rudi.aqmo.org/test |

To test other environment such as production one, you need to alter one of these variable environments (prefereably the `release` one).
The detail of the variables to alter is given bellow.

## Variables: details

| Variable name    | Description                                                                                                                         | Example value                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `cryptoJwtUrl`   | The URL of the 'crypto' module that delivers the JWT to access the internal API (`/api/admin/`).                                    | http://127.0.0.1:4444/crypto/jwt             |
| `pm_client_name` | The identifer that is used in the JWT. The name should be appear in the custom `profiles.ini` configuration file of the API module. | rudi_api_pm                                  |
| `apiUrl`         | The URL of the API module for this environment.                                                                                     | https://shared-rudi.aqmo.org                 |
| `pmBackUrl`      | The URL of the promanager back-end. This is not used in these tests, so you can just discard this variable.                         | https://admin-rudi.aqmo.org/prodmanager-test |
| `portalBaseUrl`  | The URL of the portal associated with this environment. This is not used in these tests and can be discarded too.                   | https://rudi-qualif.open-groupe.com          |
| `env`            | The type of server. It is normally acessible through `/api/admin/env`, and should equal 'release' for production environments.      | release \| shared \| test                    |
| `db`             | URL suffix to be used in `test` environment only. No need for change.                                                               | "db" (test env) \| "nodb" (env ≠ test)       |

### Setting up Postman / Newman tests for other environments

Those are the variables you usually need to set to create tests for a new environment:

- `apiUrl` : the base URL for the API module.
- `cryptoJwtUrl`: most likely stays set to http://127.0.0.1:4040/crypto/jwt if you run a local JWT `crypto` module.
- `pm_client_name`: set it to the username associated to your public key in the custom `profiles.ini` on the API side.

Example conf in the custom `profiles.ini` on the API side:

```ini
[my_user_name]
pub_key=./0-ssh/my_user_name.pub
routes[]="all"

```

Conf in the custom `profiles.ini` on the crypto module side:

```ini
[my_user]
pub_key=./0-ssh/my_user_name.pub
prv_key=./0-ssh/my_user_name.prv

```

### Pre-request scripts

When you run a test collection, a "pre-request script" is run before sending the request.
It is used as a library for initializing variables for the requests payload, their header JWT, or post-request scripts.
See [code](docPreRequestScript.js) for further details.
