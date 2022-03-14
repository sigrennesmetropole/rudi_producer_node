![](logo.png)

RUDI Logger Library - The logging interface for all RUDI producer tools
=======================================================================

The RUDI Logger Library interfaces all nodejs applications with a global
and centralized RFC5848 compliant syslog engine deployed with the
RUDI producer nodes.

A monitoring tool has been setup to visualized all RUDI logs:
  [RUDI Producer Grafana](https://admin-rudi.aqmo.org/logger/)

* * *

The RUDI Logger Library core feature is to propose a basic log interface
able to replace existing one. It can be used with any existing logging tool.

### Purpose and list of features

Beyond the core features, the main purposes of this library are to:
* Unify the format and transport mechanism for log management (SysLog RFC5424).
* Fully use and extend the semantic of the RFC5424 structured data format
  to support *RUDI producer specific semantics*.
* Use the RFC5424 structured data format to store arbitrary Json data.
* Prepare for the management of log signatures.
* Prepare for the management of log signatures.
* Interace properly all syslog management tools with the semantic extensions.
* Proposes a common and simple NodeJS interface.

In order to replace existing tools, a set of extra features have been
implemented to support first, console messages, and second, a local
storage of logs with the appropriate express controller to visualise
them in Json format.  Unified, an access control mechanism for
monitoring users shal be shared between all RUDI producer sofwares.

The following objectives are *not* addressed in this document/library:
* Common principles in the choice of severities for application/system events.
* A unified formating scheme of log messages.

### Deployment

As an example, the system will be deployed with the Rudi Media Driver,
on the release and development namespaces * *release*:
[https://data-rudi.aqmo.org/media/](#https://data-rudi.aqmo.org/media/)
The release version is the one that shall be used by users and
testers.

Note that MongoDB database is one of the sinks deployed on the system,
all logs shall be accessible via a standard access to this database.

The system has been successfuly tested on the RUDI API module, in the
'test' deployement namespace.

### RUDI Logger API

The current API has a main core with a syslog backend, and an optional
'local' backend in charge of implementing a few extra features:
console logging and web access.

### Download & Installation

The installation is possible via the npm toolkit using a local storage
in the *package.json* file:
```json
"dependencies": {
    ...
    "@aqmo.org/rudi_logger": "^1.1.2",
    ...
    },
```

Note that before hand, you might need to specify the location of the @aqmo.org repository:
```bash
npm config set @aqmo.org:registry https://repository.aqmo.org/npm/
```

When necessary, a local directory can be used. In that case, the
package installation has to be done manually. Typescript routines will
be installed automatically.
The package takes the form:
```json
"dependencies": {
    ...
    "rudilogger": "./rudilogger/",
    ...
    },
```

The installation procedure is then the following (from the nodejs project):
```bash
git clone http://gitlab.aqmo.org/rudidev/rudilogger.git
cd rudilogger/
npm run build
```

#### Core Logging API

The core API is programmed in Typescript. It is called using a class
'RudiLogger'. A typical creation is like the following:
```js
  const logger = require('@aqmo.org/rudi_logger');
  // (..)
  this.syslog = new logger.RudiLogger('mymodule','1.0', {});
```

For the module configuration, see the section below and the documented
code.

Then the core logging interface is the following:
```js
    syslog.log(severity, message, module, context, cid, raw);
    /* Systems level */
    syslog.emergency(message, module, context, cid, raw);
    syslog.critical(message, module, context, cid, raw);
    syslog.notice(message, module, context, cid, raw);
    syslog.debug(message, module, context, cid, raw);
    /* Application level */
    syslog.alert(message, module, context, cid, raw);
    syslog.error(message, module, context, cid, raw);
    syslog.warn(message, module, context, cid, raw);
    syslog.info(message, module, context, cid, raw);
```
Note that only the first argument is mandatory. Other arguments are the following:
* *module*: a string naming a module inside the application
* *context*: the RUDI producer object describing the calling context
* *cid*: a application specific message ID
* *raw*: any structured or unstructured data that shall be recorded together with the log event

#### The RUDI producer context

The RUDI producer context has been collectivly defined to incorporate RUDI specific information
about the event being monitored. This context is composed currently of two sections :

* The *Auth* section.
This section describes the final (or original) user requesting an action. It is typically set
using the authorisation token associated to the requeting. This section contains the following
members :
    - *userId*: The unique user ID, as defined by the Rudi Producer manager, or set for robots.
    - *clientApp*: The name of the application that is the the final destination of the action.
    - *reqIP*: The IP address of the original request for action.

* The *Operation* section.
This section describes the operation been done by the RUDI application source of the event. A 
It is first used to specify the various UUID operated by the current action :
    - *opType*: The type name of the ongoing operation. Could be 'add_media' or 'add_metadata',
    or more complex operations.
    - *statusCode*: A globally defined code of the status of the operation (like the HTTP one).
    Warning: this code is **global** amongs all RUDI applications, and should refer to a table
    pointing to a description of the error possibly in multiple languages.
    - *id*: The *type+UUID* of an object operated during the operation. This field can be provided
    as multiple times as needed. The format of the *type+UUID* value is composed of the concatenation
    of the type of UUID, the character '+', and the UUID. Allowed types are currently the following:
        + *metadata*: The global ID of a metadata entry as defined by the RUDI API.
        + *producer*: The metadata producer ID entry as defined by the RUDI API.
        + *contact*: The metadata contact ID entry as defined by the RUDI API.
        + *report*: The report ID entry as defined by the RUDI API.
        + *media*: Media ID as defined in the RUDI API, and provided by the RUDI Media module.
        + *connector*: A Media connector, provided by the RUDI Media module.

According to the specification, we propose the following associated Typescript structures:
```js
    export interface LoggerContext  {
        req_ip: string,		// The IP address of the API user
        subject: string,		// The subject addressed by the API user
        client_id: string		// The client id of the user, typically extracted from a JWT.
    };
```

This context is parsed and its semantic is forwarded to the RUDI
Monitoring system currently based on Grafana.
  [https://admin-rudi.aqmo.org/logger/](https://admin-rudi.aqmo.org/logger/)

#### Extra Logging API

The main extra/optional features of the logging API are the console,file, and web 
capabilities.

To activate the console and file logging feature, simply add a
configuration with a section called *log_local*.
```js
  this.syslog = new logger.RudiLogger('mymodule','1.0', { log_local: { consoleData:false } });
```

A console logging simply generate colorized log events in the console:
```bash
15/11/2021, 15:45:49 [RudiProducer/media] warning: Media file system: /home/rudimedia/_media
15/11/2021, 15:45:50 [RudiProducer/media] note: Updating logging file...
15/11/2021, 15:45:52 [RudiProducer/media] info: DB initialized
```

When activated, the console logging can print the Json data attached to the console :
```bash
15/11/2021, 15:50:32 [RudiProducer/media] info: do=add_media uuid=37df63aa-1aae-4279-be3b-b07076d36131 file=mon_nom
{
  operation: 'add_media',
  uuid: '37df63aa-1aae-4279-be3b-b07076d36131',
  ref: '37df63aa-1aae-4279-be3b-b07076d36131',
  zone: 'zone1',
  context: { source: 'CSV', filename: '/home/rudimedia/_media/zone1/_file.csv' },
  value: BasicFileEntry {
    md5: '7acade60771eac120f29057fc9e954bd',
    uuid: '37df63aa-1aae-4279-be3b-b07076d36131',
    filename: 'mon_nom',
    mimetype: 'application/pdf',
    encoding: 'charset=binary',
    date: 1970-01-01T00:00:00.000Z,
    size: 2128111,
    zone: 'zone1',
    context: {
      source: 'CSV',
      filename: '/home/rudimedia/_media/zone1/_file.csv'
    }
  }
}
```

The file interface generate as json file updated automatically, and
with a rotation mechanism. An example of the files create can be the following:

```bash
    (rudi-env) rudimedia@rudi-irods:~/rudi-media-shared$ ll _logs/
    total 124
    drwx------ 2 rudimedia rudimedia    24 Nov 15 15:50 ./
    drwxrwxr-x 7 rudimedia rudimedia    20 Nov 14 16:55 ../
    -rw-rw-r-- 1 rudimedia rudimedia   234 Nov 14 16:27 RudiMedia-2021-11-14_17.27.21.jslog
    -rw-rw-r-- 1 rudimedia rudimedia   487 Nov 14 16:29 RudiMedia-2021-11-14_17.29.06.jslog
    -rw-rw-r-- 1 rudimedia rudimedia   604 Nov 14 16:33 RudiMedia-2021-11-14_17.33.31.jslog
    -rw-rw-r-- 1 rudimedia rudimedia   234 Nov 14 16:34 RudiMedia-2021-11-14_17.34.37.jslog
    -rw-rw-r-- 1 rudimedia rudimedia   234 Nov 14 16:34 RudiMedia-2021-11-14_17.34.47.jslog
    #(..)
```

The web interface enable a direct access to local log files generated
by the logger. The result is always a Json file. The feature is
implemented via two functions able to provide:
1. the list of available log files,
2. the content of a particular file.
The usage of the firefox json mode is particularly usefull in that case.

The web interface has to be attached to an express server. The API is the following:
```js
    // Create a logger
    this.syslog = new logger.RudiLogger('media', this.revision, configuration);
    // Get the web interace, or *undefined* if not activated
    this.logweb = this.syslog.getWebInterface();

    // OPTIONAL: attached a web access control to the logger interface.
    this.ac = new AccessControl(this.authorizedVersion, this.authorizedUsers, this.syslog);
    if (this.logweb) this.logweb.setWebAccessControlInterface(this.ac);
    
    // (...)
    
    // In the *express* route configuration, simply add the appropriate routes
    if (this.logweb) {
       this.httpServer.get(this.httpPrefix+'logs',       (req, res) => { this.logweb.logContent(req, res) };
       this.httpServer.get(this.httpPrefix+'logs/:name', (req, res) => { this.logweb.logFile(req, res) };
    }
```

#### Application configuration management

The logger configuration is provided in two ways. Either a
configuration object (any dictionnary) with a section *'log_server'*
containing the server configuration provided to the constructor. Or,
if nothing is supplied *(undefined)*, the configuration is taken from
a configuration file using the *'ini'* format (by default
*'rudilogger.ini'*). The configuration file location can be provided
by an environment variable *'RUDI_LOGGER_CONFIG'*.

The configuration variables are the following:
```js
    export interface LoggerConfig  {
        path: string;		// The socket path or IP address of the syslog server.
        port: number;		// The port syslog server.
        transport: number;		// The transport mode used by the syslog server. See the 'Transport' enum from the Low-level syslog interface.
        facility: number;		// The default facility used by the syslog server. See the 'Facility' enum from the Low-level syslog interface.
    };
```

The default values shall be kept, and provided by the global system administrator.

The provided configuration (by either the file or the input
dictionnary) can include a configuration section *'log_local'* for the
extra features.

```js
    interface LocalLogConfig  {
        directory: string;	    // Log directory, will be filled by all log files. An empty string disable the file logging.
        prefix: string;         // The prefix used for log files.
        console: boolean;	    // Whether if we should log over the console.
        consoleData: boolean;   // Whether if we should log JSON data to the console.
        logRotationSec: number; // The rotation time.
    };
```

#### Example of usage with the RUDI API module

Below, an example of code integration sucessfully tested on the RUDI-API application:

```js
    const rplogger = require('@aqmo.org/rudi_logger');
    const g_hashId = process.env.RUDI_API_GIT_REV;
    const g_syslog = new rplogger.RudiLogger('rudiapi', g_hashId, { log_local: { prefix: 'RudiAPI-', console:false } });
    
    // ------------------------------------------------------------------------------------------------
    // Interface to the RUDI producer logger
    // ------------------------------------------------------------------------------------------------
    const rplog = function (logLevel, srcMod, srcFun, msg, context) {
        const Severity = rplogger.Level;
        var severity = Severity.Critical;
        var message = displayStr(srcMod, srcFun, msg);
        switch(logLevel) {
        case 'error':   severity = Severity.Error; break;
        case 'warn':    severity = Severity.Warning; break;
        case 'info':    severity = Severity.Info; break;
        case 'verbose': severity = Severity.Notice; break;
        case 'debug':   severity = Severity.Debug; break;
        }
        var ctx = undefined;
        if (context !== undefined) {
            ctx = {
                subject: context.subject,
                req_ip: context.ip,
                client_id: context.id
            };
        }
        g_syslog.log(severity, message, '', ctx);
    }
    exports.rplog = rplog;
```

### TODO
#### Features
- [ ] Feature: add environment variables to control dynamic management of the local logging  @lmorin

#### Bugs
- [ ] Bug: Not found yet.

### Authors or Acknowledgments

*   Laurent Morin - Université Rennes 1

### License

This project is licensed under the MIT License

# References

* [Syslog wikipedia](https://en.wikipedia.org/wiki/Syslog)
* [Syslog RFC5424 - the current one](https://datatracker.ietf.org/doc/html/rfc5424)
* [Syslog RFC3164 - the old one](https://datatracker.ietf.org/doc/html/rfc3164)
* [Syslog RFC5848 - signatures](https://datatracker.ietf.org/doc/html/rfc5848)

* [Syslog parameters](https://www.iana.org/assignments/syslog-parameters/syslog-parameters.xhtml)
* [Syslog inputs](https://blog.datalust.co/seq-input-syslog/)
* [command line 'logger'](https://man7.org/linux/man-pages/man1/logger.1.html)

