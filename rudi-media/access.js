
/**
 * Generic HTTP access management.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
/* eslint-disable no-multi-spaces */
const util = require("util");
// const uuid = require('uuid');
const logger = require("@aqmo.org/rudi_logger");
const jwtLib = require("@aqmo.org/jwt_lib");
const AclDB = require("./acl.js");

/**
 * An authorization processing unit.
 *
 * @class
 */
function AccessContext(req, res, acldb, validApiVersion, source) {
    this.res = res;
    this.acldb = acldb;
    this.validApiVersion = validApiVersion;
    this.source = source;
    const srcip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    this.auth = { clientApp:"media/ac", userId: -1, userName: "-", reqIP: srcip, access:"---" };
    let paramstr = "?" + util.inspect(req.params, { compact:true, depth:2, breakLength: 3000 });
    if (paramstr == "?{}") paramstr = "";
    this.opType = req.originalUrl+paramstr;
    this.sessionOpen = true;
};
AccessContext.prototype.validApi = function() { return this.validApiVersion; };
AccessContext.prototype.errContext = function(code = 0, cid = "") {
    return { auth: this.auth, operation: { opType:this.opType, statusCode:code, id: cid } };
};
AccessContext.prototype.errorCode = function(accError) {
    if (!accError) return 200;
    let code = 200;
    switch (accError) {
    case "E01": case "E02":
        code = 401; /* */ break;
    case "E03": case "E05":
        code = 405; /* */ break;
    case "E06": case "E07": case "E08":
        code = 401; /* */ break;
    case "E12": code = 412; /* */ break;
    case "E20": case "E21": case "E22": case "E23": case "E24": case "E25":
        code = 401; /* */ break;
    case "E30": case "E31": case "E32":
        code = 401; /* */ break;
    }
    return code;
};
AccessContext.prototype.process = function(name, uuid, access, accError) {
    this.auth.userName = name;
    this.auth.userId = uuid;
    this.auth.access = access;
    if (!this.sessionOpen) {
        this.acldb.error(`Internal error: access control already done: mode=${accError} (ignored)`, this.errContext(500));
        return;
    }
    const [ message, realm ] = this.acldb.errDesc(accError);
    const code = this.errorCode(accError);
    const sev = accError ? logger.Severity.Error : logger.Severity.Debug;
    this.acldb.log(sev, "["+this.auth.userName+"]:"+this.opType+": "+message, this.errContext(code));
    if (accError) {
        this.sessionOpen = false;
        this.res.set("WWW-Authenticate", "Basic realm=\""+realm+"\"");
        this.res.type("text/plain; charset=utf-8");
        this.res.status(code).send(message); // Game over, we close the connexion with an error.
    }
    else this.res.status(code);
};
AccessContext.prototype.toJson = function() {
    return { source:this.source, ip: this.auth.reqIP, user:this.auth.userName, access:this.auth.access };
};
AccessContext.prototype.toString = function() {
    return JSON.stringify(this.toJson());
};

/**
 * A simple authorization filter for express.
 * The access rights are static and controlled by tables.
 *
 * @class
 * @param {json}      configuration     - The configuration.
 * @param {logger}    logger            - The access logger.
 */
function AccessControl(cfg, slogger) {
    this.syslog = slogger;
    cfg = cfg !== undefined ? cfg : {};
    cfg.authorized_version = cfg.authorized_version !== undefined  ? cfg.authorized_version : [ "0.1" ];
    cfg.system_groups      = cfg.system_groups !== undefined       ? cfg.system_groups : {"admin": 4};
    cfg.system_users       = cfg.system_users !== undefined        ? cfg.system_users : {"admin": [ 4, "", [ "admin" ], "" ]};
    cfg.system_acl         = cfg.system_acl !== undefined          ? cfg.system_acl : {"core":[ "admin", "admin", "rwx", "---", "---" ], "users":{}, "groups":{}};
    cfg.media_priv_keyfile = cfg.media_priv_keyfile !== undefined  ? cfg.media_priv_keyfile : "./mediapriv.pem";
    try {
        this.authorizedVersion = JSON.parse(JSON.stringify(cfg.authorized_version)); // json -> deep-copy
        this.privkey = jwtLib.readPrivateKeyFile(cfg.media_priv_keyfile);
        this.acldb = new AclDB(cfg, slogger);
        this.systemAcl = this.acldb.newAcl(cfg.system_acl);
    }
    catch (err) {
        this.error(`Internal error: ${err}`);
        throw Error(`Could not initialize AccessControl unit: ${err}`);
    }
};
AccessControl.prototype.error   = function(message, context = null) { if (this.syslog) this.syslog.error(message, "ac", context); };
AccessControl.prototype.debug   = function(message, context = null) { if (this.syslog) this.syslog.debug(message, "ac", context); };
AccessControl.prototype.notice  = function(message, context = null) { if (this.syslog) this.syslog.notice(message, "ac", context); };

/**
 * Extract the authentication information from an HTTP request.
 * Access rights take the form of the standard UNIX format RWX
 *
 * @param {object}   req    - the HTTP request
 * @param {object}   res    - the HTTP response.
 * @returns {object}        - an ACL status.
 */
AccessControl.prototype.getAccessStatus = function (req, res) {
    const validApiVersion = this._readVersion(req.headers);
    let aclStatus = this._readBasicAccessRights(req.headers);
    if (!aclStatus) aclStatus = this._readJwtAccessRights(req.headers);
    if (!aclStatus) aclStatus = this.acldb.newAclAnonymous();
    aclStatus.setContext(new AccessContext(req, res, this.acldb, validApiVersion, "API"));
    this.debug(`AC status: ${aclStatus.toString()}`);
    return aclStatus;
};

AccessControl.prototype.checkSystemAccessStatus = function (aclStatus, amode) {
    let access = null;
    aclStatus.setAcl(this.systemAcl);
    if (!aclStatus.refused(amode)) access = aclStatus.access;
    this.debug(`Access computed ${access ? access : "---"}`);
    return access;
};

AccessControl.prototype.forgeJwt = function (aclStatus, userId, userName, groupName) {
    this.debug(`Forge token for ${userName}[${userId}]:${groupName}`);
    const [ token, accError ] = this.acldb.forgeJwtFor(userId, userName, groupName);
    if (accError) {
        aclStatus.context.process(userName, userId, "---", accError);
        return null;
    }
    return token;
};

/**
 * Check the access rights and prepare a proper HTTP response.
 * Access rights take the form of the standard UNIX format RWX
 * If the access requires execution rights, the HTPP header must provide a correct API version.
 *
 * @param {object}   req    - the HTTP request
 * @param {object}   res    - the HTTP response.
 * @param {object}   amode  - access mode, requiring read, write, of execution rights.
 * @returns {string}        - the access rights, null if none provided.
 * @returns {string}        - the user operating the request.
 */
/* LEGACY API */
AccessControl.prototype.checkAccessRights = function (req, res, amode="---") {
    const aclStatus = this.getAccessStatus(req, res);
    let access = this.checkSystemAccessStatus(aclStatus, amode);
    if (!access) access = null;
    return [ access, aclStatus.user ];
};

/**
 * Analyse the access rights given by the header.
 * @access protected
 *
 * Access rights take the form of the standard UNIX format RWX
 * @param {object}   header - the HTTP header
 * @returns {string}        - either the access rights or an HTTP error.
 */
AccessControl.prototype._readVersion = function (header) {
    /* Check API version compatibility */
    if (this.authorizedVersion[0] == "0.1") return true;
    let apiCompatible = false;
    if ("version" in header) {
        const version = header["version"];
        for (i in this.authorizedVersion) {
            if (version == this.authorizedVersion[i]) {
                apiCompatible = true;
                break;
            }
        }
    }
    return apiCompatible;
};

/**
 * Analyse the access rights given by the header.
 * @access protected
 *
 * Access rights take the form of the standard UNIX format RWX
 * @param {object}   header - the HTTP header
 * @returns {string}        - either the access rights or an HTTP error.
 */
AccessControl.prototype._readBasicAccessRights = function (header) {
    let aclStatus = null;
    if ("authorization" in header) {
        const authorization = header["authorization"];
        const [ authType, b64auth ] = (authorization.split(" ") || "");
        if (authType.toLowerCase() == "basic") {
            const pl = Buffer.from(b64auth, "base64").toString().split(":");
            if (pl.length < 2) aclStatus = this.acldb.newAclError("E05");
            else {
                let login = pl[0], group = "-";
                const password = pl.slice(1,pl.length).join(":");
                const lg = login.split("@")
                if (lg.length >= 2) {
                    login = lg.slice(0,lg.length-1).join("@");
                    group = lg[lg.length-1];
                }
                if (password != null) {
                    aclStatus = this.acldb.findUser(login, group, password);
                    this.notice(`login: ${aclStatus.uname}@${aclStatus.gname}`);
                }
                else aclStatus = this.acldb.newAclError("E05");
            }
        }
        else if (authType.toLowerCase() == "bearer") {
            this.debug(`bearer: ${b64auth}`);
            aclStatus = this._jwtAccessRights("rudi.media.auth", b64auth);
            this.notice(`token: ${aclStatus.uname}:${aclStatus.gname}`);
            if (!aclStatus) aclStatus = this.acldb.newAclError("E05");
        }
        else aclStatus = this.acldb.newAclError("E05");
    }
    return aclStatus;
};

AccessControl.prototype._readJwtAccessRights = function (header) {
    const klist = [ "cookie", "media_cookie" ];
    for (key of klist) {
        if (key in header) {
            const cookies = header[key].split(" ");
            for (c of cookies) {
                const [ key, value ] = c.split("=");
                const aclStatus = this._jwtAccessRights(key, value);
                if (aclStatus) return aclStatus;
            }
        }
    }
    return null;
};

AccessControl.prototype._jwtAccessRights = function (key, value) {
    if (key.toLowerCase() != "rudi.media.auth") return null;
    aclStatus = this.acldb.findIdsFromJwt(value);
    return aclStatus;
};

module.exports = AccessControl;
