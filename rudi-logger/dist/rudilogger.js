"use strict";
/**
 * Interface for syslog access logger.
 *
 * https://www.typescriptlang.org/docs/handbook/
 * https://cdiese.fr/import-external-modules-typescript/
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RudiLogger = exports.RudiLoggerException = exports.Transport = exports.Facility = exports.Severity = void 0;
const uuid_1 = require("uuid"); // For the generation of the syslog message ID.
const fs_1 = require("fs"); // For loading the configuration file.
const ini_1 = require("ini"); // For parsing the configuration file.
const interfaces_1 = require("./interfaces"); // For analysing network interfaces.
const local_1 = require("./local"); // For operating local logging features.
// Low-level syslog interface
const syslog_1 = require("../lib/syslog");
/* - Main Parameters - */
/**
  * The default facility for the RUDI producer logger.
  * Should be kept consistent with system level configurations (syslog-ng, td-agent-bit, ...)
  * See https://en.wikipedia.org/wiki/Syslog#Facility.
  */
const FACILITY = syslog_1.Facility.Local4;
/**
  * The default root application identity for all RUDI producer software.
  * It shall not be changed.
  */
const ROOT_DOMAIN = 'RudiProducer';
/**
  * The default configuration file and the environment variable for setting it.
  * The configuration file is totally avoided if a configuration is provided to the main class constructor.
  */
const CONFIG_FILENAME = 'rudilogger.ini';
const CONFIG_FILENAME_ENV = 'RUDI_LOGGER_CONFIG';
/**
 * A default and global variable pointing to the first logger created.
 */
var g_logger = undefined;
/*
  PRIVATE ENTERPRISE NUMBERS (last updated 2021-11-11)
  https://www.iana.org/assignments/enterprise-numbers/enterprise-numbers
  SMI Network Management Private Enterprise Codes:
  51647
  Rennes Métropole
  Nathalie Marin
  dsi&rennesmetropole.fr
*/
const RM_SMI_CODE = "51647";
/* - Main Types and interfaces - */
/**
 * Export direct Enums for direct logging services.
 * Severities
 * Facility
 * Transport
 */
const Severity = syslog_1.Severity;
exports.Severity = Severity;
const Facility = syslog_1.Facility;
exports.Facility = Facility;
const Transport = syslog_1.Transport;
exports.Transport = Transport;
/**
 * A basic interface for exceptions.
 *
 */
class RudiLoggerException extends Error {
    constructor(msg) {
        super(msg);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, RudiLoggerException.prototype);
    }
}
exports.RudiLoggerException = RudiLoggerException;
;
;
;
/* - Core Interface - */
/**
 * The main interface for the RUDI producer logger.
 * This logger provides :
 *   the generation and transport of syslog events for the whole RUDI producer platform
 *   the generation of both log files and console messages.
 *   the management of debugging data
 *
 * The RUDI producer logger requires a 'domain' name and support an optional module name for log messages.
 *  The application identity is defined by the root domain (RudiProducer), the domain name, and the module name .
 *  Example: RudiProducer/media/db
 *
 * The basic log functions require only a message. The standard function are immediately available,
 *  from 'emergency()' to 'debug()' with the obvious 'warn()' and 'error()' functions.
 *
 * All other options are optional.
 */
class RudiLogger {
    /**
     * Constructor, providing global and constant logging parameters
     *
     * @param {string}        domain    - The log domain, naming the module and used as a prefix.
     * @param {string}        version   - The application version.
     * @param {object}        config    - A dictionnary with a section 'log_server' containing the server configuration (see LoggerConfig)
     *                                    and optionally a section 'log_local' containing the configuration of the local backend  (see LocalLogConfig).
     */
    constructor(domain, version, config) {
        if (domain.length < 3) {
            throw new RudiLoggerException("Invalid domain (too short)");
        }
        this.domain = ROOT_DOMAIN + '/' + domain;
        this.version = version ? version : '0.1';
        this.local = null;
        this.config = this._readConfiguration(config);
        const udom = domain.toUpperCase();
        this.messageIndex = 0;
        this.msgidPrefix = 'RP' + udom[0] + udom[1] + udom[2] + (0, uuid_1.v4)().substr(0, 8) + '.';
        this.slclient = this._openSyslog();
        // Set a globally defined logger.
        if (g_logger === undefined)
            g_logger = this;
    }
    /**
     * A simple function loading and parsing the configuration file
     *
     * @returns {object}        - A dictionnary with the full configuration
     */
    _openConfiguration() {
        var u_config = {};
        try {
            var configFile = CONFIG_FILENAME;
            const envConfigFile = process.env[CONFIG_FILENAME_ENV];
            if (typeof envConfigFile !== 'undefined')
                configFile = envConfigFile;
            const configData = (0, fs_1.readFileSync)(configFile, 'utf-8');
            u_config = (0, ini_1.parse)(configData);
        }
        catch (e) {
            throw new RudiLoggerException("could not load configuration: " + String(e));
        }
        return u_config;
    }
    /**
     * Analyse and setup configurations.
     *  The local logger is activated and configured if a configuration section is found.
     *
     * @returns {LoggerConfig}        - The main service configuration
     */
    _readConfiguration(config) {
        this.config = {
            path: '127.0.0.1',
            port: 514,
            transport: Transport.Tcp,
            facility: FACILITY,
            tcpTimeout: 10000,
            retryTimeout: 0
        };
        var u_config = (config === undefined) ? this._openConfiguration() : config;
        if ((typeof u_config.log_server) !== 'undefined') {
            const cfg = u_config.log_server;
            if ((typeof cfg.path) == 'string')
                this.config.path = cfg.path;
            if ((typeof cfg.port) == 'number')
                this.config.port = cfg.port;
            if ((typeof cfg.transport) == 'number')
                this.config.transport = cfg.transport;
            if ((typeof cfg.facility) == 'number')
                this.config.facility = cfg.facility;
            if ((typeof cfg.tcpTimeout) == 'number')
                this.config.tcpTimeout = cfg.tcpTimeout;
            if ((typeof cfg.retryTimeout) == 'number')
                this.config.retryTimeout = cfg.retryTimeout;
        }
        if ((typeof u_config.log_local) !== 'undefined') {
            this.local = new local_1.LocalLogger(this, u_config);
        }
        return this.config;
    }
    /**
     * Creates and configure the syslog backend with the configuration.
     *  The local logger is activated and configured if a configuration section is found.
     *  Two associate functions are provided for error management. These function still require more support.
     *
     * @returns {syslog_Client}        - The syslog backend.
     */
    _openSyslog() {
        var ipList = [];
        (0, interfaces_1.findInterfaces)(ipList);
        const data = { 'origin': {
                'ip': ipList,
                'enterpriseId': RM_SMI_CODE,
                'software': this.domain,
                'swVersion': this.version,
            } };
        const opts = {
            rfc3164: false,
            severity: Severity.Notice,
            port: this.config.port,
            transport: this.config.transport,
            facility: this.config.facility,
            tcpTimeout: this.config.tcpTimeout,
            retryTimeout: this.config.retryTimeout,
            appName: this.domain,
            data: data
        };
        this.slclient = new syslog_1.Client(this.config.path, opts);
        this.slclient.on('error', (error) => { this._sysError(error); });
        this.slclient.on('close', () => { this._sysClose(); });
        return this.slclient;
    }
    _sysError(error) {
        console.log('RudiLogger: ' + this.domain + ': error: ' + error);
    }
    _sysClose() {
        var c = this;
        setTimeout(() => {
            c.notice('RudiLog closed', 'syslog');
        }, 10000);
    }
    /**
     * Creates a unique message ID.
     *  The id is created from the common, prefix, the message count,
     *  and either the date or a user provided ID.
     *
     * @param {string}          - An optional application specific id.
     * @returns {string}        - The message id.
     */
    _buildId(cid) {
        this.messageIndex++;
        var r = this.msgidPrefix + this.messageIndex;
        if (cid === undefined)
            r += Number(new Date());
        else
            r += cid;
        return r;
    }
    /**
     * Convert the RUDI producer context to a low level syslog context.
     *
     * @param {LoggerContext} - The RUDI producer context.
     * @returns {object}      - A syslog context.
     */
    _getContext(context, raw) {
        var auth = undefined;
        var operation = undefined;
        if (context !== undefined && context !== null) {
            if (context.auth !== undefined) {
                auth = {
                    'reqIP': context.auth.reqIP,
                    'userId': context.auth.userId,
                    'clientApp': context.auth.clientApp
                };
            }
            if (context.operation !== undefined) {
                operation = {
                    'opType': context.operation.opType,
                    'statusCode': context.operation.statusCode,
                    'id': context.operation.id
                };
            }
        }
        var content = raw;
        //if (typeof raw !== 'object') content = JSON.stringify(raw);
        return { auth: auth, operation: operation, content: content };
    }
    /**
     * The main log function.
     *
     * @param {Severity} severity - The standard syslog severity.
     * @param {string}   message  - The log message.
     * @param {string}   module   - The module name (optional)
     * @param {string}   context  - A RUDI producer context (optional)
     * @param {string}   cid      - A message id. Will be used to build an application id (optional)
     * @param {string}   raw      - Any structured or unstructured data we would like to log (optional)
     */
    log(severity, message, module, context, cid, raw) {
        const options = {
            severity: severity,
            msgid: this._buildId(cid),
            appModule: module,
            data: this._getContext(context)
        };
        try {
            this.slclient.log(message, options);
            if (this.local) {
                this.local.log(message, options);
            }
        }
        catch (err) {
            if (this.local) {
                this.local.log("invalid syslog command: " + String(err));
            }
            throw new RudiLoggerException("invalid syslog command: " + String(err));
        }
    }
    /* Systems level */
    emergency(message, module, context, cid, raw) { this.log(Severity.Emergency, message, module, context, cid, raw); }
    critical(message, module, context, cid, raw) { this.log(Severity.Critical, message, module, context, cid, raw); }
    notice(message, module, context, cid, raw) { this.log(Severity.Notice, message, module, context, cid, raw); }
    debug(message, module, context, cid, raw) { this.log(Severity.Debug, message, module, context, cid, raw); }
    /* Application level */
    alert(message, module, context, cid, raw) { this.log(Severity.Alert, message, module, context, cid, raw); }
    error(message, module, context, cid, raw) { this.log(Severity.Error, message, module, context, cid, raw); }
    warn(message, module, context, cid, raw) { this.log(Severity.Warning, message, module, context, cid, raw); }
    info(message, module, context, cid, raw) { this.log(Severity.Informational, message, module, context, cid, raw); }
    /* - Accessors - */
    /**
     * Returns the application domain.
     */
    appName() { return this.domain; }
    /**
     * Returns local logger in charge of the optional web interface.
     */
    getWebInterface() { return this.local; }
    /**
     * For testing purpose: a ping function
     *  A log message is sent with various frequencies.
     *
     * @param {number} ncount - The minimum number of ping to send.
     */
    ping(ncount) {
        var count = 0;
        const c = this;
        const logf = function (count, ncount) {
            count += 1;
            c.notice('RudiLog test ' + count, 'logger', { auth: { reqIP: '127.0.0.1', userId: 'ME' },
                operation: { opType: 'ping', statusCode: 200 } }, undefined, { msg: 'coucou' });
            if (count < ncount)
                setTimeout(() => { logf(count, ncount); }, 1000);
            else if (count % 7 == 0)
                setTimeout(() => { logf(count, ncount); }, 10000);
            else if (count % 5 == 0)
                setTimeout(() => { logf(count, ncount); }, 7000);
            else if (count % 3 == 0)
                setTimeout(() => { logf(count, ncount); }, 1000);
            else
                setTimeout(() => { logf(count, ncount); }, 3000);
            //else if (count < (ncount*60)) setTimeout(()=>{ logf(count, ncount) }, 10000);
        };
        setTimeout(() => { logf(0, ncount); }, 1000);
    }
}
exports.RudiLogger = RudiLogger;
