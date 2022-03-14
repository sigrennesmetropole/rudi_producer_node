/**
 * Interface for syslog access logger.
 * 
 * https://www.typescriptlang.org/docs/handbook/
 * https://cdiese.fr/import-external-modules-typescript/
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */

import { v4 as uuid4 } from 'uuid';			// For the generation of the syslog message ID.
import { readFileSync as fs_readFileSync }  from 'fs';  // For loading the configuration file.
import { parse as ini_parse} from 'ini';		// For parsing the configuration file.
import { findInterfaces } from './interfaces';		// For analysing network interfaces.
import { LocalLogger } from './local';	                // For operating local logging features.
// Low-level syslog interface
import { Transport as SysTransport, Facility as SysFacility, Severity as SysSeverity, SData as syslog_SData, Client as syslog_Client } from '../lib/syslog';

/* - Main Parameters - */

/**
  * The default facility for the RUDI producer logger.
  * Should be kept consistent with system level configurations (syslog-ng, td-agent-bit, ...)
  * See https://en.wikipedia.org/wiki/Syslog#Facility.
  */
const FACILITY = SysFacility.Local4;
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
var g_logger: RudiLogger|undefined  = undefined;

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
const Severity = SysSeverity;
const Facility = SysFacility;
const Transport = SysTransport;
export { Severity, Facility, Transport };

/**
 * A basic interface for exceptions.
 *
 */
export class RudiLoggerException extends Error {
    constructor(msg: string) {
        super(msg);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, RudiLoggerException.prototype);
    }
}

/**
 * The RUDI producer logger configuration.
 * This type define the configuration as it has to be provided
 *   by the configuration file or the configuration variable.
 */
export interface LoggerConfig  {
    path: string;		// The socket path or IP address of the syslog server.
    port: number;		// The port syslog server.
    transport: number;		// The transport mode used by the syslog server. See the 'Transport' enum from the Low-level syslog interface.
    facility: number;		// The default facility used by the syslog server. See the 'Facility' enum from the Low-level syslog interface.
    tcpTimeout: number;		// The default TCP connection timeout in ms.
    retryTimeout: number;	// The time before retrying a syslog connection timeout in ms, 0 for none.
};

/**
 * The RUDI producer logger *Auth context*.
 * This type define the conventional log context 'Auth'.
 * It belongs to the list of context sections specified for all RUDI producer applications
 * If an Auth context is provided, at least the IP address of the context shall be provided.
 */
export interface LoggerAuthContext  {
    reqIP: string,		// The IP address of the API user
    userId?: string		// The client id of the user, typically extracted from a JWT.
    clientApp?: string,		// The name of the application doing the API request.
};

/**
 * The RUDI producer logger *Operation context*.
 * This type define the conventional log context 'Operation'.
 * It belongs to the list of context sections specified for all RUDI producer applications
 * If an operation context is provided, at least the status code of the current operation shall be provided.
 */
export interface LoggerOperationContext  {
    statusCode: number,		// The status code of the operation currently ongoing.
    opType?: string,		// The name of the operation currently ongoing.
    id?: [string],	        // A list of typed ID of the elements handle during the operation.
};

/**
 * The RUDI producer logger context.
 * This type refers to all the conventional log context types currently supported.
 */
export interface LoggerContext  {
    operation?: LoggerOperationContext | undefined,
    auth?: LoggerAuthContext | undefined,
}

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
export class RudiLogger {
    private domain: string;		// The application domain.
    private version: string;		// The application version. Can be a git revision.
    private config: LoggerConfig;	// The configurable options. See LoggerConfig

    private slclient: syslog_Client;	// The syslog backend
    private local: LocalLogger | null;  // The local logging backend

    private messageIndex: number;	// The current message index.
    private msgidPrefix: string;	// The message ID prefix for the session (partially random).

    /**
     * Constructor, providing global and constant logging parameters
     *  
     * @param {string}        domain    - The log domain, naming the module and used as a prefix.
     * @param {string}        version   - The application version.
     * @param {object}        config    - A dictionnary with a section 'log_server' containing the server configuration (see LoggerConfig)
     *                                    and optionally a section 'log_local' containing the configuration of the local backend  (see LocalLogConfig).
     */
    constructor(domain: string, version?: string, config?: any) {
        if (domain.length < 3) { throw new RudiLoggerException("Invalid domain (too short)"); }
        this.domain = ROOT_DOMAIN + '/' + domain;
        this.version = version ? version : '0.1';
        this.local = null;
        this.config = this._readConfiguration(config);

        const udom = domain.toUpperCase();
        this.messageIndex = 0;
        this.msgidPrefix = 'RP' + udom[0] + udom[1] + udom[2] + uuid4().substr(0,8)+'.';
        this.slclient = this._openSyslog();
        // Set a globally defined logger.
        if (g_logger === undefined) g_logger = this;
    }

    /**
     * A simple function loading and parsing the configuration file
     *  
     * @returns {object}        - A dictionnary with the full configuration
     */
    private _openConfiguration(): any {
        var u_config = {};
        try {
            var configFile : string = CONFIG_FILENAME;
            const envConfigFile = process.env[CONFIG_FILENAME_ENV];
            if (typeof envConfigFile !== 'undefined') configFile = envConfigFile;
            const configData = fs_readFileSync(configFile, 'utf-8');
            u_config = ini_parse(configData);
        }
        catch (e: any) { throw new RudiLoggerException("could not load configuration: "+String(e)); }
        return u_config;
    }

    /**
     * Analyse and setup configurations.
     *  The local logger is activated and configured if a configuration section is found.
     *  
     * @returns {LoggerConfig}        - The main service configuration
     */
    private _readConfiguration(config?: any): LoggerConfig {
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
            if ((typeof cfg.path) == 'string')      this.config.path = cfg.path;
            if ((typeof cfg.port) == 'number')      this.config.port = cfg.port;
            if ((typeof cfg.transport) == 'number') this.config.transport = cfg.transport;
            if ((typeof cfg.facility) == 'number')  this.config.facility = cfg.facility;
            if ((typeof cfg.tcpTimeout) == 'number')  this.config.tcpTimeout = cfg.tcpTimeout;
            if ((typeof cfg.retryTimeout) == 'number')  this.config.retryTimeout = cfg.retryTimeout;
        }
        if ((typeof u_config.log_local) !== 'undefined') {
            this.local = new LocalLogger(this, u_config);
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
    private _openSyslog(): syslog_Client {
        var ipList: [string?] = [];
        findInterfaces(ipList);
        const data: syslog_SData = { 'origin': {
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
        this.slclient = new syslog_Client(this.config.path, opts);
        this.slclient.on('error', (error) => { this._sysError(error); });
        this.slclient.on('close', () => { this._sysClose(); });
        return this.slclient;
    }
    private _sysError(error: string): void {
        console.log('RudiLogger: '+this.domain +': error: '+ error);
    }
    private _sysClose(): void {
        var c = this;
        setTimeout(()=>{
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
    private _buildId(cid?: string) : string {
        this.messageIndex++;
        var r = this.msgidPrefix + this.messageIndex;
        if (cid === undefined) r += Number(new Date());
        else                   r += cid; 
        return r;
    }
    /**
     * Convert the RUDI producer context to a low level syslog context.
     *
     * @param {LoggerContext} - The RUDI producer context.
     * @returns {object}      - A syslog context.
     */
    private _getContext(context?: LoggerContext, raw?: any): any {
        var auth : LoggerAuthContext | undefined = undefined;
        var operation : LoggerOperationContext | undefined = undefined;
        if (context !== undefined && context !== null) {
            if (context.auth !== undefined) {
                auth = {
                    'reqIP':     context.auth.reqIP,
                    'userId':    context.auth.userId,
                    'clientApp': context.auth.clientApp
                };
            }
            if (context.operation !== undefined) {
                operation = {
                    'opType':     context.operation.opType,
                    'statusCode': context.operation.statusCode,
                    'id':         context.operation.id
                };
            }
        }
        var content = raw;
        //if (typeof raw !== 'object') content = JSON.stringify(raw);
        return { auth: auth,  operation: operation, content: content };
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
    log(severity: number, message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void {
        const options = {
            severity: severity,
            msgid: this._buildId(cid),
            appModule: module,
            data: this._getContext(context)
        };
        try {
            this.slclient.log(message, options);
            if (this.local) { this.local.log(message, options); }
        }
        catch(err) {
            if (this.local) { this.local.log("invalid syslog command: "+ String(err)); }
            throw new RudiLoggerException("invalid syslog command: "+String(err));
        }
    }

    /* Systems level */
    emergency(message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Emergency, message, module, context, cid, raw); }
    critical (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Critical, message, module, context, cid, raw);  }
    notice   (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Notice, message, module, context, cid, raw);    }
    debug    (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Debug, message, module, context, cid, raw);     }

    /* Application level */
    alert    (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Alert, message, module, context, cid, raw);   }
    error    (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Error, message, module, context, cid, raw);   }
    warn     (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Warning, message, module, context, cid, raw); }
    info     (message: string, module?: string, context?: LoggerContext, cid?: string, raw?: any) : void { this.log(Severity.Informational, message, module, context, cid, raw); }

    /* - Accessors - */
    /**
     * Returns the application domain.
     */
    appName(): string { return this.domain; }

    /**
     * Returns local logger in charge of the optional web interface.
     */
    getWebInterface(): LocalLogger | null { return this.local; }

    /**
     * For testing purpose: a ping function
     *  A log message is sent with various frequencies.
     *
     * @param {number} ncount - The minimum number of ping to send.
     */
    ping(ncount: number): void {
        var count = 0;
        const c = this;
        const logf = function(count: number, ncount: number) {
            count += 1;
            c.notice('RudiLog test ' + count, 'logger',
                     { auth: { reqIP:'127.0.0.1', userId:'ME' },
                       operation: { opType:'ping', statusCode:200 } },
                     undefined,
                     { msg: 'coucou' });
            if      (count < ncount)      setTimeout(()=>{ logf(count, ncount) },  1000);
            else if (count % 7 == 0)      setTimeout(()=>{ logf(count, ncount) }, 10000);
            else if (count % 5 == 0)      setTimeout(()=>{ logf(count, ncount) },  7000);
            else if (count % 3 == 0)      setTimeout(()=>{ logf(count, ncount) },  1000);
            else                          setTimeout(()=>{ logf(count, ncount) },  3000);
            //else if (count < (ncount*60)) setTimeout(()=>{ logf(count, ncount) }, 10000);
        };
        setTimeout(()=>{ logf(0, ncount) }, 1000);
    }
}
