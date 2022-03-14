/**
 * Generic HTTP access management.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */

const util = require('util');
const crypto = require('crypto');

/**
 * A simple authorization filter for express.
 * The access rights are static and controlled by a tables.
 *
 * @class
 * @param {json}      authorizedVersion - The list of authorized version.
 * @param {json}      authorizedUsers   - The list of authorized users.
 * @param {logger}    logger            - The access logger.
 */
function AccessControl(authorizedVersion, authorizedUsers, logger) {
    this.authorizedVersion = authorizedVersion;
    this.authorizedUsers = authorizedUsers;
    this.syslog = logger;
    this._iop = { compact:true,depth:2, breakLength: 300};
}

/**
 * Perform a password hash. Currently SHA-512 only is supported.
 *
 * @param {object}   p      - the reference password
 * @param {object}   input  - the given password
 * @returns {string}        - passwords matches
 */
AccessControl.prototype.checkPassword = function (p, input) {
    if (p.slice(0,3) == '$1$' && p[p.length-1] == '$') {
        p = p.slice(3, p.length-1)
        var sha512 = crypto.createHash('md5');
        data = sha512.update(input, 'utf-8');
        input = data.digest('hex');
    }
    else if (p.slice(0,3) == '$5$' && p[p.length-1] == '$') {
        p = p.slice(3, p.length-1)
        var sha512 = crypto.createHash('sha256');
        data = sha512.update(input, 'utf-8');
        input = data.digest('hex');
    }
    else if (p.slice(0,3) == '$6$' && p[p.length-1] == '$') {
        p = p.slice(3, p.length-1)
        var sha512 = crypto.createHash('sha512');
        data = sha512.update(input, 'utf-8');
        input = data.digest('hex');
    }
    return p == input;
}

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
AccessControl.prototype.checkAccessRights = function (req, res, amode='---') {
    var [ access, user ] = this.getAccessRights(req.headers, amode);
    var code = 200;
    var errMsg = "access granted";

    switch(access) {
    case 'E01':
        res.set('WWW-Authenticate', 'Basic realm="Authentication required"');
        code = 401; errMsg = 'Authentication required';
        access = null;
        /* */ break;
    case 'E02':
        res.set('WWW-Authenticate', 'Basic realm="Authentication required"');
        code = 401; errMsg = 'Authentication failed: invalid user/password';
        access = null;
        /* */ break;
    case 'E03':
        res.set('WWW-Authenticate', 'Basic realm="Authentication required"');
        code = 401; errMsg = 'Access not granted: the user miss one or several credentials';
        access = null;
        /* */ break;
    case 'E12':
        //req.session.error = 'Incorrect version';
        code = 412; errMsg = 'Incorrect API version, or version unspecified';
        access = null;
        /* */ break;
    case 'E05':
        res.set('WWW-Authenticate', 'Basic realm="Authentication method invalid"');
        code = 405; errMsg = 'Authentication method invalid';
        access = null;
        /* */ break;
    }
    this.logAccess(code, errMsg, req, res, user, amode);
    return [ access, user ];
}

/*
 * Private interface
 */

/**
 * Analyse the access rights given by the header.
 * @access protected
 *
 * Access rights take the form of the standard UNIX format RWX
 * @param {object}   header - the HTTP header
 * @param {object}   amode  - access mode, requiring read, write, of execution rights.
 * @returns {string}        - either the access rights or an HTTP error.
 */
AccessControl.prototype.getAccessRights = function (header, amode='---') {
    /* Check API version compatibility */
    var execute = '-';
    if ('version' in header) {
        const version = header['version'];
        for (i in this.authorizedVersion) {
            if (version == this.authorizedVersion[i]) {
                execute = 'x';
                break;
            }
        }
    }
    if (amode[2] == 'x' && execute != amode[2]) return [ 'E12', '-' ]; // http 412

    var userId = '-';
    var userAcc = '---';
    if ('authorization' in header) {
        const authorization = header['authorization'];
        const [authType, b64auth] = (authorization.split(' ') || '');
        if (authType.toLowerCase() == 'basic') {
            const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
            for (i in this.authorizedUsers) {
                const [u, p, a] = this.authorizedUsers[i];
                if (login == u) {
                    if (this.checkPassword(p, password)) {
                        userId = login;
                        userAcc = a;
                        break;
                    }
                }
            }
        }
        else return [ 'E05', '-' ]; // http 405
    }

    /* Check Authorizations */
    if (amode[0] == '-' && amode[1] == '-') return [ userAcc, userId ]; // no restriction specified, http OK
    else if (!('authorization' in header))  return [ 'E01', userId ]; // http 401, no login
    else if (userId === '-')                return [ 'E02', userId ]; // http 401, wrong user/pass
    else if (amode[0] != '-' && amode[0] != userAcc[0]) return [ 'E03', userId ]; // http 401, no credentials
    else if (amode[1] != '-' && amode[1] != userAcc[1]) return [ 'E03', userId ]; // http 401, no credentials

    // Access granted but some restrictions may still apply depending on calling function.
    return [ userAcc, userId ]; // http OK
}

/**
 * Generate a log message
 * Access rights take the form of the standard UNIX format RWX
 * @access protected
 *
 * @param {object} code   - the HTTP return code
 * @param {object} errMsg - optional error message.
 * @param {object} req    - the HTTP request
 * @param {object} res    - the HTTP response.
 */
AccessControl.prototype.logAccess = function(code, errMsg, req, res, user, amode) {
    const authorization = ('authorization' in req.header) ? req.header['authorization'] : '';
    if (!this.syslog) return;
    const context = this.generateContext(req, user, code, amode);
    if (code != 200) {
        this.syslog.error(errMsg+": "+req.hostname+":"+req.originalUrl+":"+req.ip+":"+util.inspect(req.params,this._iop)+":"+authorization, 'ac', context);
        res.status(code).send(errMsg);
    }
    else this.syslog.notice(errMsg+": "+req.hostname+":"+req.originalUrl+":"+req.ip+":"+util.inspect(req.params,this._iop)+":"+authorization, 'ac', context);
}

/**
 * Create a request context.
 * The context is used to process requests,
 *   and contains basic information about the sender.
 * @param {object} req  - the HTTP request
 * @param {string} user - the HTTP user if found.
 */
AccessControl.prototype.generateContext = function(req, user, code, amode) {
    const srcip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //console.log('from:'+ip);
    return { auth: { clientApp:'media/ac', userId: user, reqIP: srcip },
             operation: { opType:req.originalUrl+':'+amode, statusCode: code }
           };
}


module.exports = AccessControl;
