/**
 * ACL for HTTP access management.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */


// const sshpk = require('sshpk');
// const util = require('util');
// const logger = require('@aqmo.org/rudi_logger');
require("./cycle.js"); // For Json Unparsing
const crypto = require("crypto");
const uuid = require("uuid");
const jwtLib = require("@aqmo.org/jwt_lib");
// const fs = require("fs");

const G_ADMIN_UID = 4;
const G_USER_START_UID = 1000;

/**
 * @function UUID/ID Extraction. Throw an exception.
 */
function idFromStr(name, idstr) {
    let id = -1, uid = -1;
    let idt = typeof idstr;
    if (idt == "string") {
        const pid = parseInt(idstr);
        if (pid != NaN) {
            idstr = pid;
            idt = "number";
        }
    }
    if (idt == "string") {
        if (!uuid.validate(idstr)) throw Error(`Invalid uuid for ${name}`);
        const version = uuid.version(idstr);
        const idbytes = uuid.parse(idstr);
        uid = idstr;
        if (version == 4) {
            id = G_USER_START_UID + (idbytes[10] << 8) + idbytes[11];
        }
        else if (version == 5) throw Error(`Cannot revert uid from uuid-v5`);
        else throw Error(`Invalid uuid version for ${name}`);
    }
    else if (idt == "number") {
        id = idstr;
        if ((id == NaN) || (id < 100) || (id >= 200 && id < G_USER_START_UID))
            if ((id != G_ADMIN_UID) || (name != "admin")) throw Error(`Invalid id for ${name}: not in valid range`);
        uid = uuid.v5(id.toString()+".media.rudi.aqmo.org", uuid.v5.URL);
    }
    else throw Error(`Invalid id type for ${name}: ${idt}`);
    return [ id, uid ];
}

/**
 * @class
 */
function Group(name, goupId) {
    this.name = name;
    [ this.id, this.uuid ] = idFromStr(name, goupId);
}

/**
 * @class
 */
function User(acldb, name, userDesc) {
    this.name = name;
    this.acldb = acldb;
    if (userDesc.length != 4) throw Error(`Incorrect number of elements in user description ("${name}")`);
    if (typeof userDesc[1] != "string") throw Error(`Invalid password type for ${name}`);
    if (typeof userDesc[2] != "object") throw Error(`Invalid group list for ${name}`);
    if (typeof userDesc[3] != "string") throw Error(`Invalid key file type for ${name}`);
    [ this.id, this.uuid ] = idFromStr(name, userDesc[0]);
    this.password = userDesc[1];
    this.groups = [];
    for (g of userDesc[2]) {
        const group = acldb.findGroup(g);
        if (!group) throw Error(`Invalid group "${g}" while initializing ${name}`);
        this.groups.push(group);
    }
    this.privkey = null;
    this.keys = [];
    const keyfile = userDesc[3];
    if (keyfile && keyfile != "") {
        try {
            this.privkey = jwtLib.readPrivateKeyFile(keyfile);
            this.acldb.debug(`Private key setup for '${this.name}' from '${keyfile}'`);
        }
        catch (err) {}
        let pubkey;
        try {
            // const pubKeyPem = fs.readFileSync(keyfile);
            pubkey = jwtLib.readPublicKeyFile(keyfile);
            this.acldb.debug(`Public key setup for '${this.name}' from '${keyfile}'`);
        }
        catch (err) { this.acldb.warn(`Couldn't read public key '${keyfile}'`); }
        if (pubkey) this.keys.push(pubkey);
    }
}

User.prototype.validGroup = function(gname) {
    // this.acldb.debug(`CHECK: ${this.name}:${gname}`);
    if (gname == undefined || gname == null || gname == "-") group = this.groups[0];
    else {
        group = this.acldb.findGroup(gname);
        if (!group || (this.groups.indexOf(group) == -1)) throw Error(`Invalid group "${gname}" for ${this.name}`);
    }
    return group;
};

User.prototype.accessMask = function(acl, group) {
    const access = acl.access(this, group);
    // this.acldb.debug(`Access mask computed: ${this.name}:${group.name} ${access}`);
    return access;
};

/* eslint-disable indent */
User.prototype.forgeDelegatedUserJwt = function(duser, dgroup, attributes, duration = 300) {
    if (!this.privkey) throw Error(`No private key defined for "${this.name}"`);
    if (attributes === undefined || !attributes) attributes = {};
    const jti = uuid.v4();
    const xattr = Object.assign({}, { "name":duser.name, "uuid":duser.uuid, "group":dgroup.name }, attributes);
    const token = jwtLib.forgeToken(this.privkey,
                                { typ: "jwt" },
                                { "jti": jti, "client_id": this.name, "sub":"delegate",
                                  "user_id": duser.id, "group_id": dgroup.id,
                                  "xattr": xattr
                                },
                                duration);
    this.acldb.notice(`Access token forged by ${this.name}: ${duser.name}:${dgroup.name}`);
    this.acldb.debug(`Access token forged: ${token} [${JSON.stringify(xattr)}]`);
    return token;
};
/* eslint-enable indent */

/**
 * Perform a password hash.
 *
 * @param {object}   p      - the reference password
 * @param {object}   input  - the given password
 * @returns {string}        - passwords matches
 */
User.prototype.checkPassword = function (input) {
    let p = this.password;
    if (p == "" || p == "-") return false;
    if (p.length > 8 && p[0] == "$" && p[2] == "$" && p[p.length-1] == "$") {
        const pt = p[1];
        p = p.slice(3, p.length-1);
        if (p[8] == "$" ) {
            const salt = p.slice(0, 8);
            p = p.slice(9, p.length);
            input = input + salt + input;
        }
        let hash = null;
        if      (pt == "1") hash = crypto.createHash("md5");
        else if (pt == "5") hash = crypto.createHash("sha256");
        else if (pt == "6") hash = crypto.createHash("sha512");
        if (hash) {
            const data = hash.update(input, "utf-8");
            input = data.digest("hex");
        }
    }
    return p == input;
};

/**
 * @class ACL: defines an ACL entry.
 */
function Acl(aclDesc) {
    const err = function(msg) { throw Error(`${msg} in acl ("${JSON.safeStringify(aclDesc)}")`); };
    if (!("core" in aclDesc)) err("Missing core");
    if (!("users" in aclDesc)) err("Missing users");
    if (!("groups" in aclDesc)) err("Missing groups");
    const core = aclDesc["core"];
    if (core.length != 5) err("Incorrect number of elements for core");
    [ this.owner, this.group, this.uaccess, this.gaccess, this.oaccess ] = core;
    this.users = JSON.parse(JSON.stringify(aclDesc["users"])); // json -> deep-copy
    this.groups = JSON.parse(JSON.stringify(aclDesc["groups"])); // json -> deep-copy
}

/* eslint-disable no-multi-spaces */
Acl.prototype.access = function(user, group) {
    if      (user.name  == this.owner)  return this.uaccess;
    else if (user.name in this.users)   return this.users[user.name];
    else if (group.name == this.group)  return this.gaccess;
    else if (group.name in this.groups) return this.groups[group.name];
    else                                return this.oaccess;
};
/* eslint-enable no-multi-spaces */

/**
 * @class
 */
function AclStatus(uname, gname, user, accError) {
    this.uname = uname;
    this.gname = gname;
    this.user = user;
    this.accError = accError;
    if (this.user) {
        this.uname = this.user.name;
        try {
            this.group = this.user.validGroup(gname);
            if (this.group) this.gname = this.group.name;
        }
        catch (error) {
            if (!this.accError) this.accError = "E30";
            this.group = null;
        }
    }
    else this.group = null;
    this.context = null;
    this.access = "---";
}
AclStatus.prototype.setContext = function(context) { this.context = context; };
AclStatus.prototype.setAcl = function(acl) {
    if (!this.accError && this.user) this.access = this.user.accessMask(acl, this.group);
};
/* eslint-disable no-multi-spaces */
AclStatus.prototype.refused = function(amode) {
    let acEr = null;
    amode = ( amode !== undefined && amode) ? amode : "---";
    if      (this.accError)                                               acEr = this.accError;
    else if (amode[2] == "x" && this.context && !this.context.validApi()) acEr = "E12";
    else if (amode[2] != "-" && amode[2] != this.access[2])               acEr = "E08";
    else if (!(amode[0] == "-" && amode[1] == "-"&& amode[2] == "-")) {       // else no restriction specified, http OK
        if      (this.uname === "-")                            acEr = "E01"; // http 401, no credentials
        else if (!this.user)                                    acEr = "E02"; // http 401, no credentials
        else if (this.access === "---")                         acEr = "E03"; // http 401, invalid credentials
        else if (amode[0] != "-" && amode[0] != this.access[0]) acEr = "E06"; // http 401, invalid credentials
        else if (amode[1] != "-" && amode[1] != this.access[1]) acEr = "E07"; // http 401, invalid credentials
    }
    if (this.context) {
        this.context.process(this.uname, this.user ? this.user.uuid : -1, this.access, acEr);
    }
    return acEr;
};
AclStatus.prototype.toString = function() { return `ACL:${this.uname}[${this.user ? this.user.id : -1}]:${this.gname}:${this.access}${this.accError? " => " + this.accError : "" }`; };

/* eslint-disable no-multi-spaces */
/* eslint-disable guard-for-in */
/**
 * @class ACL: defines an ACL entry.
 */
function AclDB(cfg, syslog) {
    this.syslog = syslog;
    if ((typeof cfg != "object") || (cfg.system_groups == undefined) || (cfg.system_users == undefined)) {
        throw Error(`Invalid AclDB cfg`);
    }
    const sg = cfg.system_groups;
    const au = cfg.system_users;
    try {
        this.systemGroups = {};
        this.groupsByID =   {};
        for (gi in sg)      this.newGroup(gi, sg[gi]);
        this.systemUsers =  {};
        this.usersByID =    {};
        for (ui in au)      this.newUser(ui, au[ui]);
    }
    catch (err) {
        const errStr = `Could not initialize ACL DB: ${err}`;
        this.error(errStr); throw Error(errStr);
    }
}
AclDB.prototype.log = function(sev, message, context = null) { if (this.syslog) this.syslog.log(sev, message, "ac", context); };
AclDB.prototype.error   = function(message, context = null) { if (this.syslog) this.syslog.error(message, "ac", context); };
AclDB.prototype.warn    = function(message, context = null) { if (this.syslog) this.syslog.warn(message, "ac", context); };
AclDB.prototype.info    = function(message, context = null) { if (this.syslog) this.syslog.info(message, "ac", context); };
AclDB.prototype.notice  = function(message, context = null) { if (this.syslog) this.syslog.notice(message, "ac", context); };
AclDB.prototype.debug   = function(message, context = null) { if (this.syslog) this.syslog.debug(message, "ac", context); };
/* eslint-enable no-multi-spaces */
/* eslint-enable guard-for-in */

AclDB.prototype.newGroup = function(name, goupId) {
    const ng = new Group(name, goupId);
    if (ng.id in this.groupsByID) throw Error(`Group id already set ("${ng.id} is in ${this.groupsByID[ng.id].name}" for ${gi})`);
    this.systemGroups[name] = ng;
    this.groupsByID[ng.id] = ng;
    return ng;
};
AclDB.prototype.newUser = function(name, userDesc) {
    const nu = new User(this, name, userDesc);
    if (nu.id in this.usersByID) throw Error(`User id already set ("${nu.id} is in ${this.usersByID[nu.id].name}" for ${ui})`);
    this.systemUsers[name] = nu;
    this.usersByID[nu.id] = nu;
    return nu;
};
AclDB.prototype.newAcl = function(aclconf) {
    const acl = new Acl(aclconf);
    const err = function(msg) { throw Error(`${msg} in acl ("${JSON.safeStringify(aclconf)}")`); };
    if (!(acl.owner in this.systemUsers)) err(`Users ${this.owner} not found`);
    for (ui in acl.users) {
        if (!(ui in this.systemUsers)) err(`Users ${ui} not found`);
    }
    if (!(acl.group in this.systemGroups)) err(`Group ${this.group} not found`);
    for (gi in acl.groups) {
        if (!(gi in this.systemGroups)) err(`Group ${gi} not found`);
    }
    return acl;
};
AclDB.prototype.newAclStatus = function (uname, gname, user, accError) {
    return new AclStatus(uname, gname, user, accError);
};
AclDB.prototype.newUserAclStatus = function (user, group = "-") {
    return new AclStatus(user.name, group, user, null);
};
AclDB.prototype.newAclError = function (accError) {
    return new AclStatus("-", "-", null, accError);
};
AclDB.prototype.newAclAnonymous = function () {
    return new AclStatus("-", "-", null, null);
};

AclDB.prototype.findGroup = function (gname) {
    if (!gname || (gname == "-")) return null;
    if (gname in this.systemGroups) {
        return this.systemGroups[gname];
    }
    else {
        const id = parseInt(gname);
        if ((id != NaN) && (id in this.groupsByID)) {
            return this.groupsByID[id];
        }
    }
    return null;
};

AclDB.prototype.findUser = function (login, gname = "-", password = null) {
    let user = null;
    if (login in this.systemUsers) user = this.systemUsers[login];
    else {
        const id = parseInt(login);
        if ((id != NaN) && (id in this.usersByID)) user = this.usersByID[id];
    }
    if (password && user && !user.checkPassword(password)) user = null;
    return new AclStatus(login, gname, user, user ? null : "E02");
};

/* eslint-disable no-multi-spaces */
AclDB.prototype.forgeJwtFor = function (sysid, name, gname = "producer", attributes = {}) {
    let user = null, group = null;
    try {
        if (name in this.systemUsers) {
            user = this.systemUsers[name];
            if (user.id != sysid) {
                if (user.id < G_USER_START_UID) { // Special case, we can overload external users with a new ID.
                    return this.forgeJwtFor(sysid, "ext::" + name, gname, attributes);
                }
                else this.error(`Inconsistent user: ${name}/${sysid}`); return [ null, "E32" ];
            }
        }
        else {
            const [ id ] = idFromStr(name, sysid);
            if (id in this.usersByID) user = this.usersByID[id];
            else                      user = this.newUser(name, [ id, "", [ gname ], "" ]);
            this.debug(`Forge delegation for ${name}:${gname} => ${id}:${sysid}`);
        }
        group = user.validGroup(gname);
    }
    catch (error) { this.error(`Invalid user: ${error}`); return [ null, "E30" ]; }
    try {
        const admin = this.systemUsers["admin"];
        const token = admin.forgeDelegatedUserJwt(user, group, attributes);
        return [ token, null ];
    }
    catch (error) { this.error(`Could not forge JWT: ${error}`); return [ null, "E31" ]; }
};
/* eslint-enable no-multi-spaces */

/* eslint-disable no-multi-spaces */
AclDB.prototype.findIdsFromJwt = function (value) {
    let aclStatus = null;
    try {
        const jwtStr = `${value}`;
        if (!jwtStr.match(jwtLib.getJwtRegex())) return this.newAclError("E20");
        let jwt;
        try {
            jwt = jwtLib.tokenStringToJwtObject(value);
        }
        catch (e) { return this.newAclError("E21"); }
        this.debug(`Decoded JWT: ${JSON.safeStringify(jwt)}`);

        const jwtPayload = jwt.payload;
        const gname = jwtPayload.sub || "-";
        const uname = jwtPayload.client_id || "-";

        const nowepoch = Math.floor(new Date().getTime / 1000);
        const expire = jwtPayload.exp || 0;
        const nbf = jwtPayload.nbf || 0;
        if      (expire   && (nowepoch > expire)) return new AclStatus(uname, gname, null, "E23");
        else if (nowepoch && (nowepoch < nbf))    return new AclStatus(uname, gname, null, "E24");

        aclStatus = this.findUser(uname, gname);
        if (aclStatus.accError) return aclStatus;

        let user = aclStatus.user;
        let group = aclStatus.group;
        if (user.keys.length < 1) { aclStatus.accError = "E25"; return aclStatus; }
        let validated = false;
        for (const pubkey of user.keys) {
            try {
                validated = jwtLib.verifyToken(pubkey, jwtStr);
                this.debug(`pubKey validated the JWT: ${pubkey}`);
                break;
            }
            catch (err) {
                this.debug(`jwt error: ${err}`);
                this.debug(`pubKey didn't validated the JWT: ${pubkey}`);
                continue;
            }
        }
        if (validated) {
            let extraNotice = "";
            if (group.name == "delegate") {
                extraNotice = " by "+ user.name;
                this.debug("JWT delegation" + extraNotice);
                const dgname = jwtPayload.group_id || "-";
                const duname = jwtPayload.user_id || "-";
                aclStatus = this.findUser(duname, dgname);
                if (aclStatus.accError) return aclStatus;
                user = aclStatus.user;
                group = aclStatus.group;
            }
            this.info("JWT validated for "+user.name+":"+group.name+extraNotice);
        }
        else aclStatus.accError = "E22";
    }
    catch (err) {
        this.warn(`Could not decode JWT: ${err}`);
        return this.newAclError("E20");
    }
    return aclStatus;
};
/* eslint-enable no-multi-spaces */

AclDB.prototype.errDesc = function (accError) {
    let accessMsg = "access granted";
    let accessRealm = "";
    if (accError) {
        accessRealm = "Missing access rights";
        accessMsg = "Authentication failed";
        switch (accError) {
        case "E01": accessRealm = accessMsg = "Authentication required"; /* */ break;
        case "E02": accessMsg = "Authentication failed: invalid user/password"; /* */ break;
        case "E03": accessMsg = "Access not granted: the user miss one or several credentials"; /* */ break;
        case "E05": accessRealm = accessMsg = "Authentication method invalid"; /* */ break;
        case "E06": accessMsg = "Access not granted: read access not set for the user"; /* */ break;
        case "E07": accessMsg = "Access not granted: write access not set for the user"; /* */ break;
        case "E08": accessMsg = "Access not granted: execution access not set for the user"; /* */ break;
        case "E12": accessMsg = "Incorrect API version, or version unspecified"; /* */ break;
        case "E20": accessMsg = "Malformed JWT"; /* */ break;
        case "E21": accessMsg = "Could not decode JWT"; /* */ break;
        case "E22": accessMsg = "Invalid signature for JWT"; /* */ break;
        case "E23": accessMsg = "Outdated JWT"; /* */ break;
        case "E24": accessMsg = "Overdated JWT"; /* */ break;
        case "E25": accessMsg = "Tier authority unknown or key missing"; /* */ break;
        case "E30": accessMsg = "Invalid user/group specification (did you change the user's group ?)"; /* */ break;
        case "E31": accessMsg = "Could not forge JWT"; /* */ break;
        case "E32": accessMsg = "User defined with different id"; /* */ break;
        }
    }
    return [ accessMsg, accessRealm ];
};

module.exports = AclDB;
