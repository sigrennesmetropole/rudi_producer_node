![](logo.png)

# RUDI Media Driver - The media connector manager for RUDI

The RUDI media driver interface media file access between the the RUDI Productor manager
(managing metadata entries for an open-data producer), and the storage system
[typically IRODS](#https://irods.org/).

---

The Media driver core feature is to provide access to media files
associated to data published via the RUDI open-data framework. It is
currently extended with a logging system, and an isolation mechanism.

### List of features

The Media driver provides :

- An API for posting and fetching media files associated to RUDI data
  sets.
- A isolation mechanism, providing a real file access after a
  generation of an access link with a connectors.
- A basic access control system.
- A dual log mechanism, one for the application, one for the media
  data management (new/open/close, etc.).
- The file database is recorded in a mongodb collection 'media', but kept in memory
- All events are recorder in the mongodb collection 'media_events'
- All DB elements are validated using schemas, all available online for public access ($ref).

### Current deployment

The system is currently deployed on the release and development namespace

- _release_: [https://data-rudi.org/media/](#https://data-rudi.org/media/)
  The release version is the one that shall be used by users and testers.

- _shared_:
  [https://shared-rudi.aqmo.org/media/](#https://shared-rudi.aqmo.org/media/)
  The shared version is under development.

Two user/login couples exist currently:

- With read access: user=rudiadmin pass=xxxxxxxxxxxxxxxx
- With write access: user=rudiprod pass=xxxxxxxxxxxxxxxx

### Media Driver API

The current API is divided in two: the media access API, and the log API

#### Media access

Access to media-data, described in detailled below, can be one of the following:

    - *POST* https://data-rudi.org/media/post
    - *GET*  https://data-rudi.org/media/<media-uuid>
    - *GET*  https://data-rudi.org/media/check/<media-uuid>
    - *GET*  https://data-rudi.org/media/download/<media-uuid>
    - *GET*  https://data-rudi.org/media/downloadz/<media-uuid>

The API is the following :

1. To post a media-data:

- _POST_ https://data-rudi.org/media/post [in header: *file-metadata*: Json description ]
  The file-metadata json must contain a field _media_id_, and should contain
  the standard [RUDI media-data](https://app.swaggerhub.com/apis/OlivierMartineau/RUDI-PRODUCER/1.2.0#/Media)
  An account with write access is required.

The following RUDI media-data can be typically provided:

- "media*id": (\_mandatory*) An uuid-v4 unique identifier
- "media*type": (\_optional*) should specify "FILE", as defined in the standard specification
- "media*name": (\_optional*) the name of the media. This name can be used to give a name for the file when downloaded
- "file*size": (\_optional*) the file size. This value, when correclty used, will improve the transfer speed.
- "file*type": (\_optional*), the mime-type as registered by the [IANA](https://www.iana.org/assignments/media-types/media-types.xhtml) authority
- "charset": (_optional_), the data encoding format as registered by the [IANA](https://www.iana.org/assignments/character-sets/character-sets.xhtml) authority
- "access*date": (\_optional*), a date after the access is invalid (in the future)

A simple CURL command to post the file _mon_nom.json_:

```shell
curl -u 'rudiprod:xxxxxxxxxxxxxxxx'  -H 'file_metadata:{"media_name":"mon_nom","media_id":"37df63aa-1aae-4279-be3b-b07076d36131","file_size":21660,"file_type":"application/json"}' --data-binary @mon_nom.json https://data-rudi.org/media/post
```

A special extension is available in order to treat of URL instead of a file. In that case, no content is provided and some specific media-data are required:

- "media*type": (\_mandatory*) must specify "INDIRECT" (it is an extension of the default value "FILE" defined in the standard RUDI media-data specification)
- "url": (_mandatory_), a properly formed URL
- "access*date": (\_optional*), the last validated access date (in the past)
- "expire*date": (\_optional*), a date after the access is invalid (in the future)

```shell
curl -u 'rudiprod:xxxxxxxxxxxxxxxx'  -H 'file_metadata:{"media_type":"INDIRECT", "media_name":"mon_nom","media_id":"37df63aa-1aae-4279-be3b-b07076d36888","url":"https://data-rudi.org/api/v1/","access_date":'"$(date +%s)"', "expire_date":'"$(date +%s --date +72\ hour )"' }'  https://shared-rudi.aqmo.org/media/pos
```

The requests returns an array in Json with the followinf format :

```json
      [ <number>*, 'status': <ok|error>, ['msg': <description>] ]
```

The list of numbers, when present, are send to keep the connexion open during the transfer, and provide the amount of data currently received.
If an error is raised, the _msg_ field contains its description.

2. To get a media-data:

- _GET_ https://data-rudi.org/media/UUID [in header: _media-access-method_: [optional] access mode ]
  Returns a Json with the temporary file link. It is available for 2 minutes by default.
  The header _media-access-method_ can be set with one of the following values :
  - **Default**: default behavior, i.e. returns the temporary link.
  - **Direct**: returns directly the content of the data. Restrictions on this mode can be applied.
  - **Block**: Not implemented. Reserved for block level access modes
  - **Stream**: Not implemented. Reserved for stream level access modes

A Boolean parameter set in the header can activate the transfer of compressed using the _Gzip_ format: the header _media-access-compression_.

- Example of result returned with the default mechanism:

```json
{ "url": "https://data-rudi.org/media/storage/55643808-dd0c-48d9-941e-c21736d5e4e5" }
```

3. To directly download the content of a media-data:

- _GET_ https://data-rudi.org/media/download/UUID
- _GET_ https://data-rudi.org/media/zdownload/UUID

There are shortcuts for the standard media _get_ API with the
_media-access-method_ header set to **Direct** mode. The _zdownload_
version compresses the data before the transmission (see the
_media-access-compression_).

**Warning:** The support of this feature is not guarantied for all types of media.

4. To check the existence and the integrity of a media-data:

- _GET_ https://data-rudi.org/media/check/UUID It is a
  shortcut for the standard media get with the _media-access-method_
  header set to **Check** mode.

**Warning:** The support of this feature is not guarantied for all types of media.

5. When a problem occurs, most requests may return a status description in Json with the format:

```json
      { 'status': <ok|error>, ['msg': <description>], ['value':<context information>] }
```

#### Data structure schemas

All validating schema are available online. The exact location can be
configured. Currently 4 schemas are available:

- _Context_ schema: [schema/rudi-media-db-context.json](https://data-rudi.org/media/schema/rudi-media-db-context.json)
  Defines the context data recorded with all events.
- _Meta_ schema: [schema/rudi-media-db-meta.json](https://data-rudi.org/media/schema/rudi-media-db-meta.json)
  Defines the minimal metadata requided for posting media.
- _File_ schema: [schema/rudi-media-db-file.json](https://data-rudi.org/media/schema/rudi-media-db-file.json)
  Defines the data recorded for each media file.
- _URL_ schema: [schema/rudi-media-db-file.json](https://data-rudi.org/media/schema/rudi-media-db-url.json)
  Defines the data recorded for each media URL.
- _Event_ schema: [schema/rudi-media-db-event.json](https://data-rudi.org/media/schema/rudi-media-db-event.json)
  Defines the data recorded for an event associated with a media file.

#### Local File DB format

A permanent file '\_file.csv' is created and updated in all storage
zones. This file can be used to setup the media database when it
restarts.

The current permanent's file format used for the "basic" file database
is based on an header-less, ';' based, CSV file. The exact format is the following:

```bash
      <md5sum>;<uuid>;<filename>: <mimetype>; <encoding>;<creation date in Posix EPOCH>;<size>
```

Note the the URL media type is also supported in the CSV file. In that case, the format is the following:

```bash
      <url>;<uuid>;<filename>: text/uri-list; charset=utf-8;<access date in Posix EPOCH>;<expire date in Posix EPOCH>
```

The following bash command can rebuild the file.

```bash
      for F in *-*-* ; do CRC=$(md5sum $F|cut -b1-32); FT=$(file -i $F) ; ST=$(stat -c '%Y;%s' $F) ; file=$(echo $FT | sed 's/^[^_]*_//' ); id=$(echo $FT | sed 's/^\([^_]*\)_.*/\1/') ; echo "$CRC;$id;$file;$ST"; done
```

You can concatenate or create a file using the output of this line.

#### Application configuration management

The management of the configuration of the application is based on a
file using an _ini_ format, with few of them overwriten by command-line options.

- The _ini_ file.
  The default configuration is set in the file [configuration.js](configuration.js).
  The file is the default source for the configuration format, and all
  fields can be overwriten by the _ini_ file.
  An example:

```ini
[server]
listening_address = 0.0.0.0
listening_port = 3201
server_url = "https://shared-rudi.aqmo.org"
server_prefix = /media/

[database]
db_url = mongodb://localhost:27017/
db_name = rudi_media

[storage]
media_dir: '/_media',
media_files: [ './localmedia/mydb.csv' ],
acc_timeout = 20

[log_server]
path = /dev/log
transport= 5 // TCP=1, UNIX=4
retryTimeout = 60000

[log_local]
consoleData= false
directory = ./_logs/

[logging]
app_name = RudiMedia-
#revision: 'release'

```

By default the _init_ file is _./rudi_media_custom.ini_. It can be set by the command-line.

- Command line options.
  The command line options can be one of the following:
  - _-p <port number>_: the listening port
  - _--revision <git sha-1>_: the git revision
  - _--ini <filename>_: the configuration file to use

#### Log System

The log system create a list of files in rotation indexed by the timestamp.
All data are returned in Json format. To get access to the list use the URL
[https://data-rudi.org/media/logs/](https://data-rudi.org/media/logs/).

Example:

```json
{
  "entries": [
    {
      "date": "2021-05-09T14:08:40.686Z",
      "size": 109192,
      "name": "RudiMedia-1620569320362.jslog",
      "url": "http://data-rudi.aqmo.org/media/logs/RudiMedia-1620569320362.jslog"
    }
  ]
}
```

To get access to the file management log for a given period, use the provided url:
http://data-rudi.aqmo.org/media/logs/RudiMedia-XXXX.jslog

All access to the log data require an account with read access.

**A detailled description of the logging system is available, and now maintained, by the @aqmo.org/rudi_logger library.**

### Download & Installation

You are not supposed to install this driver. But it is a simple nodejs/express project.

```shell
$ npm install
```

### Tests of CORS requests

Test using the [_test-cors.org_ scripts](https://github.com/monsur/test-cors.org.git). Simply serve static files with:

```python
    python3 -m http.server
```

### TODO

#### Features

- [x] Feature: basic file DB @lmorin
- [x] Feature: GET API @lmorin
- [x] Feature: Log management @lmorin
- [x] Feature: Access control @lmorin
- [x] Feature: POST API @lmorin
- [x] Feature: INI configuration file @lmorin (#2)
- [x] Feature: file-management storage in mongodb @lmorin (#3)
- [x] Feature: log-management in mongodb @lmorin (#4)
- [x] Feature: add git version tag in API @lmorin (#5)
- [x] Feature: add the support of compressed media data @lmorin (#9)
- [x] Feature: add the support of media URL @lmorin (#11)
- [x] Feature: add the support of media hash check @lmorin (#13)
- [ ] Feature: add non-regression tests @lmorin (#6)
- [ ] Feature: mongodb backup management @lmorin (#7)

#### Bugs

- [x] Bug: Access-Control-Allow-Origin @lmorin (Fixed #8)

### Authors or Acknowledgments

- Laurent Morin - Université Rennes 1

### License

This project is licensed under the MIT License
