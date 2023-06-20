"use strict";
/**
 * Interface for logging events in files and the console, and provide a web interface.
 * This interface operates locally, in complement with a syslog interface, and mostly for debugging purpose.
 *
 * @author: Laurent Morin
 * @version: 2.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLogger = void 0;
const util = require("util"); // For inspect data
const fs = require("fs"); // For logging files and directories
const colors = require("colors"); // For console pretty printing
const syslog_1 = require("../lib/syslog"); // For logging options
/**
 * Extend strings with syslog colors
 *
 */
colors.setTheme({
    emergency: ['red', 'bold', 'underline'],
    critical: ['red', 'bold'],
    notice: 'grey',
    debug: 'blue',
    alert: 'magenta',
    error: 'red',
    warn: 'yellow',
    info: 'green', // info
});
;
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
class LocalLogger {
    /**
     * Constructor, providing global and constant logging parameters
     *
     * @class
     * @param {RudiLogger}    parent    - The main rudilogger interface.
     * @param {Object}        config    - The global JSON configuration.
     * @param {AccessControl}  ac       - The web access control.
     */
    constructor(parent, config, ac) {
        this.parent = parent;
        this.config = this._readConfiguration(config);
        this.ac = ac;
        this.myLogRe = new RegExp(this.config.prefix + '.*\.jslog', 'i');
        this.fdesc = undefined;
        if (this.config.directory !== '') {
            const errFct = (err, path) => {
                if (err) {
                    this.parent.warn("Could not create: " + path + ": " + err);
                    return;
                }
                this._updateLogs();
            };
            fs.mkdir(this.config.directory, { mode: 0o700, recursive: true }, errFct);
        }
    }
    /**
     * Load and and set the configuration.
     *
     * @param   {Object}          config - The global JSON configuration.
     * @returns {LocalLogConfig}         - The local logger configuration.
     */
    _readConfiguration(config) {
        this.config = {
            directory: './_logs/',
            prefix: 'RudiLogger-',
            console: true,
            consoleData: true,
            logRotationSec: 8 * 60 * 60,
            level: syslog_1.Severity.Debug
        };
        if ((typeof config.log_local) !== 'undefined') {
            const cfg = config.log_local;
            if ((typeof cfg.directory) == 'string')
                this.config.directory = cfg.directory;
            if ((typeof cfg.prefix) == 'string')
                this.config.prefix = cfg.prefix;
            if ((typeof cfg.logRotationSec) == 'number')
                this.config.logRotationSec = cfg.logRotationSec;
            if ((typeof cfg.console) == 'boolean')
                this.config.console = cfg.console;
            if ((typeof cfg.consoleData) == 'boolean')
                this.config.consoleData = cfg.consoleData;
            if ((typeof cfg.level) == 'number')
                this.config.level = cfg.level;
        }
        return this.config;
    }
    /**
     * Creates a new file logger.
     *
     * Closes the previously open log file if needed.
     */
    _createLogFile() {
        const datestr = new Date().toLocaleString('fr', { timeZone: 'Europe/Paris' }).
            replace(', ', '_').replace(/:/g, '.').replace(/([0-9]*)\/([0-9]*)\/([0-9]*)/g, '$3-$2-$1');
        var logfilename = this.config.directory + this.config.prefix + datestr + '.jslog';
        try {
            if (this.fdesc) {
                this.fdesc.close();
            }
            this.fdesc = fs.createWriteStream(logfilename, { flags: 'w' });
        }
        catch (err) {
            this.parent.warn("Could not open file: " + logfilename + ": " + err);
        }
    }
    /**
     * Create a rotation of data and message logger.
     *
     */
    _updateLogs() {
        this._createLogFile();
        this.log('Updating logging file...', { severity: syslog_1.Severity.Notice });
        var _this = this;
        setTimeout(function () { _this._updateLogs(); }, this.config.logRotationSec * 1000);
    }
    /**
     * Generate header according to the severity.
     *
     * @param   {Severity} severity - The severity index.
     * @param   {boolean}  color    - Add color.
     * @returns {string}            - The severity header.
     */
    _translate(severity, color) {
        if (severity === undefined)
            return '';
        var header = '';
        switch (severity) {
            case syslog_1.Severity.Emergency:
                color ? header = 'EMERGENCY!'.emergency : header = 'emergency';
                break;
            case syslog_1.Severity.Alert:
                color ? header = 'alert!'.alert : header = 'alert';
                break;
            case syslog_1.Severity.Critical:
                color ? header = 'critical!'.critical : header = 'critical';
                break;
            case syslog_1.Severity.Error:
                color ? header = 'error'.error : header = 'error';
                break;
            case syslog_1.Severity.Warning:
                color ? header = 'warning'.warn : header = 'warning';
                break;
            case syslog_1.Severity.Notice:
                color ? header = 'note'.notice : header = 'note';
                break;
            case syslog_1.Severity.Informational:
                color ? header = 'info'.info : header = 'info';
                break;
            case syslog_1.Severity.Debug:
                color ? header = 'debug'.debug : header = 'debug';
                break;
        }
        return header;
    }
    /**
     * Log a new message.
     *
     * @param {string}         message    - The main message.
     * @param {MessageOptions} options    - Options as provided to syslog.
     */
    log(message, options) {
        const date = new Date();
        const datestr = date.toLocaleString('fr');
        options = (options === undefined) ? {} : options;
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
            this.fdesc.write(JSON.stringify(datalog) + '\n');
        }
        if (this.config.console) {
            const logMessage = datestr +
                ' [' + this.parent.appName() + '] ' +
                this._translate(options.severity, true) + ': ' +
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
    setWebAccessControlInterface(ac) {
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
    logContent(req, res) {
        const [access, user] = this.ac ? this.ac.checkAccessRights(req, res, 'r--') : 'r--';
        if (!access)
            return;
        if (access[0] != 'r') {
            res.status(401).send('Read access not set for user (' + user + ':' + access + ')');
            return;
        }
        /* Simply loop over all files in the directory, and create a JSON description
         */
        var entries = [];
        try {
            const dir = fs.opendirSync(this.config.directory);
            this.log("Open dir " + dir.path, { severity: syslog_1.Severity.Debug });
            var dirent;
            while (dirent = dir.readSync()) {
                var n = dirent.name;
                this.log(n, { severity: syslog_1.Severity.Debug });
                var fst = fs.statSync(this.config.directory + n);
                var url = req.protocol + '://' + req.hostname + req.originalUrl;
                if (url.substr(url.length - 1) != '/')
                    url += '/';
                if (n.match(this.myLogRe) && fst.size > 0) {
                    var e = { 'date': fst.ctime, 'size': fst.size, 'name': n, 'url': url + n };
                    entries.push(e);
                }
            }
            dir.close();
        }
        catch (err) {
            this.log("Could not open log dir: " + err, { severity: syslog_1.Severity.Warning });
        }
        ;
        entries = entries.sort(function (a, b) { return (a.date > b.date) ? 1 : (a.date < b.date) ? -1 : 0; });
        var directories = { entries: entries };
        res.send(directories);
    }
    /**
     * Serves the content of a log file from in the log directory in Json.
     * Require a read access right.
     *
     * Access rights take the form of the standard UNIX format RWX
     * @param {object} req - the HTTP request. Must contain the ':name' parameter.
     * @param {object} res - the HTTP response.
     */
    logFile(req, res) {
        const [access, user] = this.ac ? this.ac.checkAccessRights(req, res, 'r--') : 'r--';
        if (!access)
            return;
        if (access[0] != 'r') {
            res.status(401).send('Read access not set for user (' + user + ':' + access + ')');
            return;
        }
        var content = {};
        var fname = req.params.name;
        this.log("Request file " + fname, { severity: syslog_1.Severity.Debug });
        try {
            if (!fname.match(this.myLogRe)) {
                content = "{ 'error': 'incorrect file name', 'filename':'" + fname + "' }";
            }
            else {
                var pathname = this.config.directory + fname;
                var fdat = fs.readFileSync(pathname, "utf8");
                var elist = [];
                var flist = fdat.split('\n');
                for (var index in flist) {
                    var line = flist[index];
                    if (line == "{" || line == "")
                        continue;
                    try {
                        var entry = JSON.parse(line);
                        //if ('message' in entry) entry = entry['message'];
                        //if ('level' in entry) delete entry['level'];
                        elist.push(entry);
                    }
                    catch (err) {
                        this.log("Error parsing file " + pathname + ": " + err + ": '" + line + "'", { severity: syslog_1.Severity.Warning });
                        elist.push(line);
                    }
                }
                content = { filename: pathname, data: elist };
            }
        }
        catch (err) {
            this.log("Could not open file " + fname + ": " + err, { severity: syslog_1.Severity.Warning });
        }
        ;
        res.send(content);
        res.end();
    }
    ;
}
exports.LocalLogger = LocalLogger;
;
