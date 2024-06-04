# Routes in RUDI Producer node API

## Public routes in RUDI Producer node API (no authentification required)

See the [OpenAPI description](https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER).

These routes are accessible from the internet, and especially the Portal:

- `GET /api/v1/resources`
  - Returns a JSON with a property `total` that gives the total number of elements on the producer node and a property `items` that lists a portion of the total set
  - See optional parameters bellow to refine such request
- `GET /api/v1/resources/:id`
  - Returns the metadata for the identified resource
- `GET /api/v1/resources/search`
  - Returns the list of objects the fields of which contains the terms given as parameters
  - Ex: `GET /api/admin/resources/search?velo` will give all the metadata for which the term `velo` or `vélo` can be found in the fields `resource_title`, `synopsis` or `summary`

### Redirected routes

- `GET /api` -> `GET /api/v1/resources`
- `GET /api/v1` -> `GET /api/v1/resources`
- `GET /resources` -> `GET /api/v1/resources`
- `GET /resources/*` -> `GET /api/v1/resources/*`

### Optional parameters

- `limit` (default = 100, max = 500): the maximum number of elements in the result set
- `offset` (default = 0): the number of elements to skip before starting to collect the result set
- `fields`: comma-separated properties that are kept for displaying the elements of the result set
- `sort_by`: comma-separated properties used to order the elements in the result set, ordered by decreasing priority. A minus sign before the field name means metadata will be sorted by decreasing values over this particular field
- `count_by`: display the number of elements that share the same value for the property given as a parameter
- `group_by`: display the groups of elements for every value of the property given as a parameter
- `group_limit`: (default = 100, used with `group_by` only): the maximum number of metadata to display in each group of the result set
- `group_offset` (default = 0, used with `group_by` only): the number of elements to skip before starting to collect each group of metadata
- `updated_after`: Shortcut to list the metadata updated after a given date
- `updated_before`: Shortcut to list the metadata updated before a given date

Different parameters can be used simultaneously if they are separed by question marks.

https://data-rudi.org/api/v1/resources?limit=10&fields=global_id,resource_title&updated_after=2021-07

### Quick filters

Metadata can be queried with a simple filter expressed as `parameter=value`.

https://data-rudi.org/api/v1/resources?theme=transportation&keywords=bus

Optional parameters and filters can be used simultaneously

https://data-rudi.org/api/v1/resources?limit=10&fields=global_id,resource_title,theme&updated_after=2021-07&theme=citizenship

## Exposed routes with Portal authentification required

- `PUT /resources/*`-> `PUT /api/v1/resources/*`
  - Redirection to following routes
- `PUT /resources/:id/report`
  - Create or modify an integration report for the identified resource
- `PUT /api/v1/resources/:id/report`
  - Create or modify an integration report for the identified resource
- `GET /api/v1/resources/:id/report`
  - List the integration reports for the resource
- `GET /api/v1/resources/:id/report/:irid`
  - Access one identified report for an identified resource

`GET` routes can be used with optional parameters and filters described above for public routes.

## Rudi prod authentification required, action on objects

See the [OpenAPI description](https://app.swaggerhub.com/apis/OlivierMartineau/RudiProducer-PrivateAPI).

- `POST /api/admin/:object`
  - Create object ( = resources | organization | contact | report)
- `PUT /api/admin/:object`
  - Create or update object
- `GET /api/admin/:object`
  - Access a list of objects of a given type (= resources | organization | contact | report)
  - Optional parameters and filters bellow can refine this request
- `GET /api/admin/:object/:id`
  - Access one identified object
- `DELETE /api/admin/:object/:id`
  - Delete one identified object
- `DELETE /api/admin/:object`
  - Delete a list of objects
  - Optional parameters above can refine this request
  - if no parameter is provided, confirm=true should be at least mentioned to confirm the suppression of all objects of this type on the rudi node
- `POST /api/admin/:object/deletion`
  - Delete a list of identified objects
  - Body of the request must be an array of uuid of the objects to be deleted
- `GET /api/admin/search`
  - Return the list of the fields that can be searched for each object
- `GET /api/admin/:object/search`

  - Returns the list of objects the fields of which contains the terms given as parameters
  - Ex: `GET /api/admin/resources/search?velos` will give all the metadata for which the term `velo` or `vélo` can be found in the fields `resource_title`, `synopsis` or `summary`

- `POST /api/admin/:object/:id/reports`
  - Create a new integration report for the identified object
- `PUT /api/admin/:object/:id/reports`
  - Create or update a report for the identified object
- `GET /api/admin/:object/:id/reports`
  - Return the list of reports for the identified object
- `GET /api/admin/:object/:id/reports/:irid`
  - Return the identified report for the identified object
- `GET /api/admin/:object/reports`
  - Return all the reports for the integreation of the given object type
- `DELETE /api/admin/:object/:id/reports/:irid`
  - Delete the identified report for the identified object
- `DELETE /api/admin/:object/:id/reports`
  - Delete every report for the identified object
- `POST /api/admin/:object/:id/reports/deletion`
  - Delete the reports corresponding to every UUIDs given as a list in the body of the request

## Rudi prod authentification + app driven actions

### Object CRUD

- `GET /api/admin/:object/:id`
  - Get an identified object
- `DELETE /api/admin/:object/:id`
  - Remove an identified object
- `DELETE /api/admin/:object`
  - Remove all objects of this type
- `POST /api/admin/:object/deletion`
  - Remove a list of objects corresponding to the UUIDs given as a list in the body of the request

### Dummy data

- `POST /api/admin/resources/init`
  - Generate 330 metadata for test purpose
  - These metadata are marked with a `collection_tag` set to `'init'`

### Logs

- `GET /api/admin/logs`
  - Return logs as a list, by default ordered in reverse chronological order

### Thesaurus

- `GET /api/admin/enum`
  - Return the list of every thesaurus values
- `GET /api/admin/enum/:code`
  - Return the list of values for a given thesaurus
- `GET /api/admin/enum/:code/:lang`
  - Return the list of values in a given language for a given thesaurus
- `GET /api/admin/licences`
  - Return every licence accepted natively in the Producer Node as SKOS Concepts
- `GET /api/admin/licence_codes`
  - Return every licence accepted natively in the Producer Node as codes
  - These values are the ones that can be chosen as a 'standard' licence in the RUDI metadata
- `POST /api/admin/licences/init`
  - Reinit the licence SKOS scheme

### JWT

- `GET /api/admin/portal/token`
  - Retrieve a valid JWT generated by the RUDI Portal for this producer node
- `GET /api/admin/portal/token/check`
  - Check if a RUDI Portal JWT is valid

### Portal

- `POST /api/admin/portal/resources/send`
  - Send all metadata present on the producer node to RUDI Portal
  - If a list of UUIDs is given in the body, only the resources identified are sent
  - Metadata whose `collection_tag` property is defined are not concerned
    ###DB
- `GET /api/admin/db`
  - Return the list the collection names
- `DELETE /api/admin/db/:object`
  - Drop a collection
- `DELETE /api/admin/db`
  - Drop all collections
  - Note: after such a command, the server needs to be restarted

### Reports CRUD

- `POST /api/admin/:object/:id/reports`
  - Create a report for the identified object
- `PUT /api/admin/:object/:id/reports`
  - Update or create a report for the identified object
- `GET /api/admin/:object/:id/reports`
  - Get reports for the identified object
- `GET /api/admin/:object/:id/reports/:irid`
  - Get an identified report for the identified object
- `GET /api/admin/:object/reports`
  - Get all report for this type of object
- `DELETE /api/admin/:object/:id/reports/:irid`
  - Remove an identified report for the identified object
- `DELETE /api/admin/:object/:id/reports`
  - Remove every report for the identified object
- `POST /api/admin/:object/:id/reports/deletion`
  - Remove a list of reports for the identified object
  - A list of UUIDs must be provided in the body of the request

### App

- `GET /api/version`
  - Return the version of the API for this producer node
  - No JWT required
- `GET /api/admin/nv`
  - Return the version of `node`, `npm`, `mongoose` and `mongodb` for debug and monitoring purposes
- `GET /api/admin/env`
  - Return the environment type for this producer node
  - No JWT required
- `GET /api/admin/hash`
  - Return the git hash of the source code present on the node
  - No JWT required
- `GET /api/admin/apphash`
  - Return the git hash of the code currently running
  - No JWT required
- `GET /api/admin/id_generation`
  - Generate a new UUID v4
