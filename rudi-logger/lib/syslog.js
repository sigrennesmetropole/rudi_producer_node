// Copyright 2015-2016 Stephen Vickers <stephen.vickers.sv@gmail.com>
// with contributions 2017 by Seth Blumberg <sethb@pobox.com>
// with significant modifications 2021 by Laurent Morin (Université Rennes 1)

// Taken from https://raw.githubusercontent.com/paulgrove/node-syslog-client/master/index.js
var dgram = require("dgram");
var events = require("events");
var net = require("net");
var os = require("os");
var tls = require("tls");
var util = require("util");
var dunix = null;
try { dunix = require('unix-dgram'); }
catch (err) { /* Disabled if not found. */ }

var Transport = {
    Tcp:  1,
    Udp:  2,
    Tls:  3,
    Unix: 4,
    UUnix: 5
};

var Facility = {
    Kernel: 0,
    User:   1,
    Mail:   2,
    System: 3,
    Daemon: 3,
    Auth:   4,
    Syslog: 5,
    Lpr:    6,
    News:   7,
    Uucp:   8,
    Cron:   9,
    Authpriv: 10,
    Ftp:    11,
    Audit:  13,
    Alert:  14,
    Local0: 16,
    Local1: 17,
    Local2: 18,
    Local3: 19,
    Local4: 20,
    Local5: 21,
    Local6: 22,
    Local7: 23
};

var Severity = {
    Emergency:     0,
    Alert:         1,
    Critical:      2,
    Error:         3,
    Warning:       4,
    Notice:        5,
    Informational: 6,
    Debug:         7
};


function _expandConstantObject(object) {
    var keys = [];
    for (var key in object)
	if (Object.hasOwnProperty.call(object, key))
	    keys.push(key);
    for (var i = 0; i < keys.length; i++)
	object[object[keys[i]]] = parseInt(keys[i], 10);
}
_expandConstantObject(Transport);
_expandConstantObject(Facility);
_expandConstantObject(Severity);

function Client(target, options) {
    this.target = target || "127.0.0.1";
    this.waitBeforeRetry = false;

    if (!options)
	options = {}

    this.syslogHostname = options.syslogHostname || os.hostname();
    this.port = options.port || 514;
    this.tcpTimeout = options.tcpTimeout || 10000;
    this.retryTimeout = options.retryTimeout || 0;
    this.getTransportRequests = [];
    this.facility = typeof options.facility == "number" ? options.facility : Facility.Local0;
    this.severity = typeof options.severity == "number" ? options.severity : Severity.Informational;
    this.rfc3164  = typeof options.rfc3164 === 'boolean' ? options.rfc3164 : true;
    this.structured_data  = this.parseSdata(options.data);
    this.appName  = options.appName;
    this.appModule  = process.title.substring(process.title.lastIndexOf("/")+1, 48);
    this.dateFormatter = options.dateFormatter || function() { return this.toISOString(); };
    this.udpBindAddress = options.udpBindAddress;

    this.transport = Transport.Udp;
    if (options.transport &&
	options.transport === Transport.Udp ||
	options.transport === Transport.Tcp ||
	options.transport === Transport.Unix ||
	options.transport === Transport.UUnix ||
	options.transport === Transport.Tls)
	this.transport = options.transport;
    if (this.transport === Transport.Tls) {
	this.tlsCA = options.tlsCA;
    }

    return this;
}

util.inherits(Client, events.EventEmitter);

/*
      SD-ELEMENT      = "[" SD-ID *(SP SD-PARAM) "]"
      SD-PARAM        = PARAM-NAME "=" %d34 PARAM-VALUE %d34
      SD-ID           = SD-NAME
      PARAM-NAME      = SD-NAME
      PARAM-VALUE     = UTF-8-STRING ; characters '"', '\' and
                                     ; ']' MUST be escaped.
      SD-NAME         = 1*32PRINTUSASCII
                        ; except '=', SP, ']', %d34 (")
*/
Client.prototype.cleanSDName = function cleanSDName(str) {
    const buffer = Buffer.from(str);
    const size = Math.min(32, buffer.length);
    for (var i = 0; i < size; i++) {
        const cur = buffer[i];
        if (cur < 32 || cur >= 127) buffer[i] =  46; // Replace ctr by '.'
        else if (cur == 32)         buffer[i] =  95; // Replace ' ' by '_'
        else if (cur == 61)         buffer[i] =  35; // Replace '=' by '#'
        else if (cur == 91)         buffer[i] = 123; // Replace '[' by '{'
        else if (cur == 93)         buffer[i] = 125; // Replace ']' by '}'
    }
    return buffer.toString('latin1');
}
Client.prototype.cleanSDValue = function cleanSDValue(obj) {
    const delim = 'ÿ';
    var value;
    if      (obj === undefined)        return '';
    else if (typeof obj  === 'string') value = obj;
    else if (typeof obj  === 'number') value = String(obj);
    else                               value = JSON.stringify(obj);
    value = Buffer.from(value).toString('utf8');
    if (value.indexOf(delim) != -1) throw Error('Value String not supported: '+value);
    value = value.replace(/\\/g,delim).replace(/"/g,'\\"').replace(/]/g,'\\]').replace(RegExp(delim, 'g'),'\\\\').replace(/\n/g,'\\\\n');
    return value;
}

Client.prototype.messageValue = function messageValue(obj) {
    var value;
    if      (obj === undefined)        return '';
    else if (typeof obj  === 'string') value = obj;
    else if (typeof obj  === 'number') value = String(obj);
    else                               value = JSON.stringify(obj);
    value = Buffer.from(value).toString('utf8');
    value = value.replace(/\n/g,'\\\\n');
    return value;
}

// https://www.iana.org/assignments/syslog-parameters/syslog-parameters.xml
Client.prototype.parseSdata = function parseSdata(data) {
    var structured_data = '';				// no STRUCTURED-DATA
    if ((typeof data) === 'object') {
        for (e in data) {
            let sdelem = e;
            let sddatata = data[e];
            if ((typeof sddatata) !== 'object' || sddatata.length < 1) {
                //throw new Error("malformed sd-element: "+JSON.stringify(data));
                continue;
            }
            var structured_elem =  '[' + (e!=='origin'?e+'@rudiprod':'origin');
            for (item in sddatata) {
                const assign = ' '+this.cleanSDName(item)+ '=';
                var d = sddatata[item];
                if (d instanceof Array) {
                    for (di in d) {
                        structured_elem += assign+'"'+this.cleanSDValue(d[di])+ '"';
                    }
                }
                else if (d instanceof Object) {
                    for (di in d) {
                        const fassign = ' '+this.cleanSDName(item+'.'+di)+'=';
                        structured_elem += fassign+'"'+this.cleanSDValue(d[di])+ '"';
                    }
                }
                else structured_elem += assign+'"'+this.cleanSDValue(d)+ '"';
            }
            structured_elem += ']';
            structured_data += structured_elem;
        }
    }
    return structured_data;
}

Client.prototype.buildFormattedMessage = function buildFormattedMessage(message, options) {
    if (options.facility < Facility.Kernel    || options.facility > Facility.local7) { throw new Error("Invalid facility: "+severity); }
    if (options.severity < Severity.Emergency || options.severity > Severity.Debug) { throw new Error("Invalid severity: "+severity); }

    // Some applications, like LTE CDR collection, need to be able to
    // back-date log messages based on CDR timestamps across different
    // time zones, because of delayed record collection with 3rd parties.
    // Particular useful in when feeding CDRs to Splunk for indexing.
    var date = (typeof options.timestamp === 'undefined') ? new Date() : options.timestamp;
    var pri = (options.facility * 8) + options.severity;
    var newline = message[message.length - 1] === "\n" ? "" : "\n";

    var timestamp, formattedMessage;
    if (typeof options.rfc3164 !== 'boolean' || options.rfc3164) {
	// RFC 3164 uses an obsolete date/time format and header.
	var elems = date.toString().split(/\s+/);

	var month = elems[1];
	var day = elems[2];
	var time = elems[4];

	/**
	 ** BSD syslog requires leading 0's to be a space.
	 **/
	if (day[0] === "0") day = " " + day.substr(1, 1);

	timestamp = month + " " + day + " " + time;
	formattedMessage = "<"
	    + pri
	    + ">"
	    + timestamp
	    + " "
	    + options.syslogHostname
	    + " "
	    + this.messageValue(message)
	    + newline;
    } else {
	// RFC 5424 obsoletes RFC 3164 and requires RFC 3339
	// (ISO 8601) timestamps and slightly different header.

	var msgid = (typeof options.msgid === 'undefined') ? "-" : options.msgid;
        var appName = options.appName;
        if (!appName || appName == undefined) appName =       options.appModule;
        else                                  appName += '/'+ options.appModule;
        var structured_data = this.structured_data + this.parseSdata(options.data);
        if (structured_data === '') structured_data = '-';

	formattedMessage = "<"
	    + pri
	    + ">1"				// VERSION 1
            + " "
	    + this.dateFormatter.call(date)
	    + " "
	    + options.syslogHostname
	    + " "
	    + appName
	    + " "
	    + process.pid
	    + " "
	    + msgid
	    + " "
	    + structured_data
            + " "
	    + this.messageValue(message)
	    + newline;
    }

    return Buffer.from(formattedMessage);
};

Client.prototype.close = function close() {
    if (this.transport_) {
	if (this.transport === Transport.Tcp ||
            this.transport === Transport.Tls ||
            this.transport === Transport.UUnix ||
            this.transport === Transport.Unix)
	    this.transport_.destroy();
	if (this.transport === Transport.Udp)
	    this.transport_.close();
	this.transport_ = undefined;
    } else {
	this.onClose();
    }

    return this;
};

Client.prototype.log = function log() {
    var message, options = {}, cb;

    if (typeof arguments[0] === "string")              message = arguments[0];
    else throw new Error("first argument must be string");

    if (typeof arguments[1] === "function")            cb = arguments[1];
    else if (typeof arguments[1] === "object")         options = arguments[1];

    if (typeof arguments[2] === "function")            cb = arguments[2];
    if (!cb)                                           cb = function () {};

    if (typeof options.facility === "undefined")       options.facility = this.facility;
    if (typeof options.severity === "undefined")       options.severity = this.severity;
    if (typeof options.rfc3164 !== "boolean")          options.rfc3164 = this.rfc3164;
    if (typeof options.appName === "undefined")        options.appName = this.appName;
    if (typeof options.appModule === "undefined")      options.appModule = this.appModule;
    if (typeof options.syslogHostname === "undefined") options.syslogHostname = this.syslogHostname;

    var fm = this.buildFormattedMessage(message, options);
    var me = this;
    //console.log('log: '+ fm);

    me.getTransport(function(error, transport) {
	if (error) return cb(error);
	try {
	    if (me.transport === Transport.Tcp || me.transport === Transport.Tls || me.transport === Transport.Unix) {
		transport.write(fm, function(error) {
		    if (error)    return cb(new Error("net.write() failed: " + error.message));
		    return cb();
		});
	    } else if (me.transport === Transport.Udp) {
		transport.send(fm, 0, fm.length, me.port, me.target, function(error, bytes) {
		    if (error)    return cb(new Error("dgram.send() failed: " + error.message));
		    return cb();
		});
	    } else if (me.transport === Transport.UUnix) {
		transport.send(fm, 0, fm.length, me.target, function(error, bytes) {
		    if (error)    return cb(new Error("dunix.send() failed: " + error.message));
		    return cb();
		});
	    } else return cb(new Error("unknown transport '%s' specified to Client", me.transport));
	} catch (err) {
	    me.onError(err);
	    return cb(err);
	}
    });
    return this;
};

Client.prototype.getTransport = function getTransport(cb) {
    if (this.transport_ !== undefined) return cb(null, this.transport_);

    this.getTransportRequests.push(cb);
    if (this.connecting)  return this;
    else                  this.connecting = true;

    var af = net.isIPv6(this.target) ? 6 : 4;
    var me = this;

    function doCb(error, transport) {
	while (me.getTransportRequests.length > 0) {
	    var nextCb = me.getTransportRequests.shift();
	    nextCb(error, transport);
	}
	me.connecting = false;
    }

    if (this.transport === Transport.UUnix) {
        if (dunix == "none") return null; // We want a single message.
        else if (!dunix)  { // Missing library
            dunix = "none";
            const err = new Error("UUnix transport not supported, all messages will be ignored");
	    doCb(err);
	    me.onError(err);
            return err;
        }
    }

    if (this.waitBeforeRetry) {
        return null; // Skip the message.
    }

    if (this.transport === Transport.Tcp || this.transport === Transport.Unix) {
	var options;
	if (this.transport === Transport.Unix) {
	    options = {
		path: this.target
	    };
	}
	else {
	    options = {
		host: this.target,
		port: this.port,
		family: af
	    };
	}

	var transport;
	try {
	    transport = net.createConnection(options, function() {
		me.transport_ = transport;
		doCb(null, me.transport_);
	    });
	} catch (err) {
	    doCb(err);
	    me.onError(err);
	}

	if (!transport) return;

	transport.setTimeout(this.tcpTimeout, function() {
	    var err = new Error("connection timed out");
	    transport.destroy();
	    me.emit("error", err);
	    doCb(err);
	});

	transport.once("connect", function () {
	    transport.setTimeout(0);
	});

	transport.on("end", function() {
	    var err = new Error("connection closed");
	    me.emit("error", err);
	    doCb(err);
	});

	transport.on("close", me.onClose.bind(me));
	transport.on("error", function (err) {
	    transport.destroy();
	    doCb(err);
	    me.onError(err);
	});

	transport.unref();
    } else if (this.transport === Transport.Tls) {
	var tlsOptions = {
	    host: this.target,
	    port: this.port,
	    family: af,
	    ca: this.tlsCA,
	    secureProtocol: 'TLSv1_2_method'
	};

	var tlsTransport;
	try {
	    tlsTransport = tls.connect(tlsOptions, function() {
		me.transport_ = tlsTransport;
		doCb(null, me.transport_);
	    });
	} catch (err) {
	    doCb(err);
	    me.onError(err);
	}

	if (!tlsTransport)

	    return;

	tlsTransport.setTimeout(this.tcpTimeout, function() {
	    var err = new Error("connection timed out");
	    me.emit("error", err);
	    doCb(err);
	});

	tlsTransport.once("connect", function () {
	    tlsTransport.setTimeout(0);
	});

	tlsTransport.on("end", function() {
	    var err = new Error("connection closed");
	    me.emit("error", err);
	    doCb(err);
	});

	tlsTransport.on("close", me.onClose.bind(me));
	tlsTransport.on("error", function (err) {
	    doCb(err);
	    me.onError(err);
	});

	tlsTransport.unref();
    } else if (this.transport === Transport.Udp) {
	try {
            var udp_dom = "udp" + af ;
	    this.transport_ = dgram.createSocket(udp_dom);

	    // if not binding on a particular address
	    // node will bind to 0.0.0.0
	    if (this.udpBindAddress) {
		// avoid binding to all addresses
		this.transport_.bind({ address: this.udpBindAddress })
	    }
	}
	catch (err) {
	    try {
		this.transport_.destroy();
	    } catch (err2) {
		// ignore cleanup error
	    }
	    doCb(err);
	    this.onError(err);
	}

	if (!this.transport_)
	    return;

	this.transport_.on("close", this.onClose.bind(this));
	this.transport_.on("error", function (err) {
	    me.onError(err);
	    doCb(err);
	});

	this.transport_.unref();

	doCb(null, this.transport_);
    } else if (this.transport === Transport.UUnix) {
	try {
            this.transport_ = dunix.createSocket('unix_dgram');
            this.transport_.connect(this.target);
	}
	catch (err) {
	    try {
		this.transport_.destroy();
	    } catch (err2) {
		// ignore cleanup error
	    }
	    doCb(err);
	    this.onError(err);
	}

	if (!this.transport_)
	    return;

	this.transport_.on("congestion", function (err) {
	    var err = new Error("UNIX dgram server is not accepting data");
	    me.onError(err);
	    doCb(err);
	});
	this.transport_.on("close", this.onClose.bind(this));
	this.transport_.on("error", function (err) {
	    me.onError(err);
	    doCb(err);
	});

	doCb(null, this.transport_);
    } else {
	doCb(new Error("unknown transport '%s' specified to Client", this.transport));
    }
};

Client.prototype.onClose = function onClose() {
    if (this.transport_) {
	if (this.transport_.destroy)
	    this.transport_.destroy();
	this.transport_ = undefined;
    }
    console.log('Retry only in '+this.retryTimeout)
    var me = this;
    if (me.retryTimeout > 0) {
        me.waitBeforeRetry = true;
        setTimeout(function() { me.waitBeforeRetry = false; }, me.retryTimeout);
    }

    this.emit("close");

    return this;
};

Client.prototype.onError = function onError(error) {
    if (this.transport_) {
	if (this.transport_.destroy)
	    this.transport_.destroy();
	this.transport_ = undefined;
    }

    this.emit("error", error);

    return this;
};

exports.Transport = Transport;
exports.Facility  = Facility;
exports.Severity  = Severity;

exports.Client = Client;

exports.createClient = function createClient(target, options) {
    return new Client(target, options);
};
