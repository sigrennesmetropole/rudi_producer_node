/**
 * Interface for logging events in files and the console, and provide a web interface.
 * This interface operates locally, in complement with a syslog interface, and mostly for debugging purpose.
 *
 * @author: Laurent Morin
 * @version: 2.0.0
 */

import * as util from 'util';                              // For inspect data
import * as fs from 'fs';                                  // For logging files and directories
import * as colors from 'colors';                          // For console pretty printing
import { RudiLogger }  from './rudilogger';                // For back logs.
import { Severity, MessageOptions } from '../lib/syslog';   // For logging options

/**
 * Extend strings with syslog colors
 *
 */
colors.setTheme({
    emergency: ['red', 'bold', 'underline'], // emergency
    critical: ['red', 'bold'],               // critical
    notice: 'grey',                          // notice
    debug: 'blue',                           // debug
    alert: 'magenta',                        // alert
    error: 'red',                            // error
    warn: 'yellow',                          // warn
    info: 'green',                           // info
});
declare global {
    interface String {
        emergency : string,
        critical  : string,
        notice    : string,
        debug     : string,
        alert     : string,
        error     : string,
        warn      : string,
        info      : string
    }
}

/**
 * The RUDI local logger configuration.
 *
 */
interface LocalLogConfig  {
    directory: string;	    // Log directory, will be filled by all log files. An empty string disable the file logging.
    prefix: string;         // The prefix used for log files.
    console: boolean;	    // Whether if we should log over the console.
    consoleData: boolean;   // Whether if we should log JSON data to the console.
    logRotationSec: number; // The rotation time.
    level: number;	    // The log level, the value over wich logs are ignored (by default 'debug')
};

/**
 * A new web logger supporting web access and log rotation.
 * An optional web access controller can be provided for the data part.
 * The interface is common with the syslog interface
 *
 * An HTTP route may be configured:
 *  logContent: send the list of available LOG files in Json format
 *  logFile: send the log file. Based on the same route but an HTTP parameter ":name" must be defined with the filename.
 *  Note: "logContent" reference the logs files using its own route as a prefix for the log file.
 *  
 * @class 
 */

export class LocalLogger {
    private parent: RudiLogger;                // The main rudi logger interface.
    private config: LocalLogConfig;            // The main configuration.
    private ac: any;                           // The web access control interface.
    private myLogRe: RegExp;                   // The file search pattern.
    private fdesc: fs.WriteStream | undefined; // The current logging file descriptor.

    /**
     * Constructor, providing global and constant logging parameters
     *  
     * @class 
     * @param {RudiLogger}    parent    - The main rudilogger interface.
     * @param {Object}        config    - The global JSON configuration.
     * @param {AccessControl}  ac       - The web access control.
     */
    constructor(parent: RudiLogger, config: {[key: string]: any}, ac?: any) {
        this.parent = parent;
        this.config = this._readConfiguration(config);
        this.ac = ac;
        this.myLogRe = new RegExp(this.config.prefix+'.*\.jslog', 'i');
        this.fdesc = undefined;
        if (this.config.directory !== '') {
            const errFct = (err: any, path?: string) => {
                if (err) { this.parent.warn("Could not create: "+path+": "+err); return; }
                this._updateLogs();
            };
            fs.mkdir(this.config.directory, {mode: 0o700, recursive: true}, errFct);
        }
    }

    /**
     * Load and and set the configuration.
     *
     * @param   {Object}          config - The global JSON configuration.
     * @returns {LocalLogConfig}         - The local logger configuration.
     */
    private _readConfiguration(config: {[key: string]: any}): LocalLogConfig {
        this.config = {
            directory: './_logs/',
            prefix: 'RudiLogger-',
            console: true,
            consoleData: true,
            logRotationSec: 8 * 60 * 60, // 8 hours.
            level: Severity.Debug
        };
        if ((typeof config.log_local) !== 'undefined') {
            const cfg = config.log_local;
            if ((typeof cfg.directory) == 'string')      this.config.directory      = cfg.directory;
            if ((typeof cfg.prefix) == 'string')         this.config.prefix         = cfg.prefix;
            if ((typeof cfg.logRotationSec) == 'number') this.config.logRotationSec = cfg.logRotationSec;
            if ((typeof cfg.console) == 'boolean')       this.config.console        = cfg.console;
            if ((typeof cfg.consoleData) == 'boolean')   this.config.consoleData    = cfg.consoleData;
            if ((typeof cfg.level) == 'number')          this.config.level          = cfg.level;
        }
        return this.config;
    }

    /**
     * Creates a new file logger.
     *
     * Closes the previously open log file if needed.
     */
    private _createLogFile() : void {
        const datestr = new Date().toLocaleString('fr', { timeZone: 'Europe/Paris' }).
              replace(', ','_').replace(/:/g,'.').replace(/(\d*)\/(\d*)\/(\d*)/g,'$3-$2-$1');
        const logfilename = this.config.directory + this.config.prefix + datestr + '.jslog';
        try {
            if (this.fdesc) { this.fdesc.close(); }
            this.fdesc = fs.createWriteStream(logfilename, { flags:'w' });
        }
        catch(err: any) { this.parent.warn("Could not open file: "+logfilename+": "+err); }
    }

    /**
     * Create a rotation of data and message logger.
     *
     */
    private _updateLogs() : void {
        this._createLogFile();
        this.log('Updating logging file...', { severity: Severity.Notice });
        setTimeout(() => this._updateLogs(), this.config.logRotationSec * 1000);
    }

    /**
     * Generate header according to the severity.
     *
     * @param   {Severity} severity - The severity index.
     * @param   {boolean}  color    - Add color.
     * @returns {string}            - The severity header.
     */
    private _translate(severity: number | undefined, color:boolean) : string {
        if (severity === undefined) return '';
        switch(severity) {
            case Severity.Emergency:     return color ? 'EMERGENCY!'.emergency : 'emergency';
            case Severity.Alert:         return color ? 'alert!'.alert         : 'alert';
            case Severity.Critical:      return color ? 'critical!'.critical   : 'critical';
            case Severity.Error:         return color ? 'error'.error          : 'error';
            case Severity.Warning:       return color ? 'warning'.warn         : 'warning';
            case Severity.Notice:        return color ? 'note'.notice          : 'note';
            case Severity.Informational: return color ? 'info'.info            : 'info';
            case Severity.Debug:         return color ? 'debug'.debug          : 'debug';
            default: return ''
        }
    }

    /**
     * Log a new message.
     *
     * @param {string}         message    - The main message.
     * @param {MessageOptions} options    - Options as provided to syslog.
     */
    log(message: string, options?: MessageOptions) : void {
        const date = new Date();
        const datestr = date.toLocaleString('fr');
        options = options ?? {};
        if (this.fdesc) {
            const datalog = {
                date: date,
                appname: this.parent.appName(),
                severity: this._translate(options.severity, false),
                message: message,
                auth: options.data ? options.data.auth : undefined,
                operation: options.data ? options.data.operation : undefined,
                data: options.data ? options.data.content : undefined
            };
            this.fdesc.write(JSON.stringify(datalog)+'\n');
        }
        if (this.config.console) {
            const logMessage =
                  datestr +
                  ' ['+this.parent.appName()+'] ' +
                  this._translate(options.severity, true)+ ': ' +
                  message;
            console.log(logMessage);
            if (this.config.consoleData && options.data && options.data.content) {
                console.log(util.inspect(options.data.content));
            }
        }
    }

    /**
     * Set access control interface
     *
     * @param {AccessControl}  ac       - The web access control.
     */
    setWebAccessControlInterface(ac: any): void {
        this.ac = ac;
    }

    /**
     * Serves the list of log files available in the log directory in Json.
     * Require a read access right.
     *
     * Access rights take the form of the standard UNIX format RWX
     * @param {object} req - the HTTP request
     * @param {object} res - the HTTP response.
     */
    logContent(req: any, res: any): void {
        const [ access, user ] = this.ac ? this.ac.checkAccessRights(req, res, 'r--') : 'r--';
        if (!access) return;
        if (access[0] != 'r') { res.status(401).send('Read access not set for user ('+user+':'+access+')'); return; }

        /* Simply loop over all files in the directory, and create a JSON description
         */
        let entries = [];
        try {
            const dir = fs.opendirSync(this.config.directory);
            this.log("Open dir "+dir.path, { severity: Severity.Debug });
            let dirent;
            while (dirent = dir.readSync()) {
                const n = dirent.name;
                this.log(n, { severity: Severity.Debug });
                const fst = fs.statSync(this.config.directory+n);
                let url = req.protocol+'://'+req.hostname+req.originalUrl;
                if (!url.endsWith('/')) url += '/';
                if (RegExp(this.myLogRe).exec(n) && fst.size > 0) {
                    const e = { 'date': fst.ctime, 'size': fst.size, 'name' : n, 'url':  url + n }
                    entries.push(e);
                }
            }
            dir.close();
        }
        catch(err) {
            this.log("Could not open log dir: "+err, { severity: Severity.Warning });
        };
        entries.sort((a:any, b:any) : number => (a.date > b.date) ? 1 : (a.date < b.date) ? -1 : 0);
        res.send({ entries});
    }

    /**
     * Serves the content of a log file from in the log directory in Json.
     * Require a read access right.
     *
     * Access rights take the form of the standard UNIX format RWX
     * @param {object} req - the HTTP request. Must contain the ':name' parameter.
     * @param {object} res - the HTTP response.
     */
    logFile(req:any, res:any) : void {
        const [ access, user ] = this.ac ? this.ac.checkAccessRights(req, res, 'r--') : 'r--';
        if (!access) return;
        if (access[0] != 'r') { res.status(401).send('Read access not set for user ('+user+':'+access+')'); return; }

        let content= {};
        const fname = req.params.name;
        this.log("Request file "+fname, { severity: Severity.Debug });
        try {
            if (!fname.match(this.myLogRe)) {
                content = "{ 'error': 'incorrect file name', 'filename':'"+fname+"' }";
            }
            else {
                const pathname = this.config.directory + fname;
                const fdat = fs.readFileSync(pathname, "utf8");
                const elist = [];
                const flist = fdat.split('\n');
                for (const index in flist) {
                    const line = flist[index];
                    if (line == "{" || line == "") continue;
                    try {
                        const entry = JSON.parse(line);
                        elist.push(entry);
                    }
                    catch(err) {
                        this.log("Error parsing file "+pathname+": "+err+": '"+line+"'", { severity: Severity.Warning });
                        elist.push(line);
                    }
                }
                content = { filename: pathname, data: elist };
            }
        }
        catch(err) {
            this.log("Could not open file "+fname+": "+err, { severity: Severity.Warning });
        };
        res.send(content);
        res.end();
    };

};
