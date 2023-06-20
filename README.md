![](logo.png)

RUDI Producer Node - Rudi producer package for release deployments
=====================================================================

The RUDI Producer Node groups all the modules required for the
deployment of fully managable RUDI producer Node as defined in [RUDI
Open-Data](https://rudi.datarennes.fr/) project.

The purpose of a RUDI producer node is to provide the technology able
to store and manage the metadata and data (media) of the datasets
owned by a particular contributor in the open-data RUDI federation.

This software was designed with the following principles:
   * It proposes a reference implementation of the standard [RUDI API](https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER/1.2.3).
   * It is able to publish the metadata of datasets to the main Rennes-Métropole RUDI platform (rudi.bzh)
   * It is completely independent, and can be used as a standalone OpenData platform.
   * It is modular and relies and a set of micro-services.
   * Its is only based on free and open-source technologies and release under an open-source license.

The current architecture can be simplified as the following:

```text
     |             | RUDI
     |Media Mgt    | REST
     |API          | API                    USER Interface
     |             |                            (WEB)
     v             v
+---------+  +------------+        +--------------+------------+
|         |  |            |        |              |            |
|  MEDIA  |  |    API     |<------>|   MANAGER    |   CONSOLE  |
|         |  |            |        |    (views)   |   (Forms)  |
+----^----+  +------------+        +--------------+-------+----+
     |                                                    |
     +----------------------------------------------------+
                            PostFiles
```

  * The main module "API" implements the storate and management of metadata of datasets.
  * The module "MANAGER" implements the user management and provide a Web interface to the "API".
  * The module "CONSOLE" implements forms and metadata queries with a Web interface. It is operated via the "MANAGER".
  * The module "MEDIA" is a driver for the storage of media/files referenced by metadata.

The following modules/libraries are also provided:
  * The logger library (shared between all modules) used to forward all logs to a syslog.
  * The Token manager library (JWT) used to create and manage access tokens between modules.

## Technical high-level description

All projects are node.js projects, and except the rudilogger (a
library), they are run as standalone applications. The standard NPM
installation procedure can be used.

### Dependencies and installation

The *rudilogger* library is referenced by the rudi-media, rudi-api,
and rudi-manager. The logger package is also available using the
[*aqmo.org*](https://repository.aqmo.org/npm/) package manager.

All modules shall be configured before running. Each has at least
one configuration file, check the Readme file.

A local MongoDB database is required by the rudi-api and is optional
for the rudi-media modules. The location is specified in configuration
file. The system has been tested using the MongoDB version 3.9.

Several modules require an access to public or private mongo-db
database. The DB is mandatory only for the API module. The
installation was validated using the MongoDB system version 3.9.

* * *

### Current deployment

This package is currently used for the generation of various container
images (OVA, LXD, etc.). A different project manages complex deployments.

### Authors or Acknowledgments
*   (VALIDATION) François Bodin - Université Rennes 1
*   (system & packaging) Laurent Morin - Université Rennes 1
*   (API) Olivier Martineau - Université Rennes 1
*   (MANAGER) Yann Porret  - Keolis
*   (CONSOLE) Florian Desmortreux - Université Rennes 1
*   (MEDIA) Laurent Morin - Université Rennes 1

### License

This project is licensed under the [EUPL License v1.2](LICENCE.md).
