// Copyright 2015-2016 Stephen Vickers <stephen.vickers.sv@gmail.com>
// with contributions 2017 by Seth Blumberg <sethb@pobox.com>
// with significant modifications 2021 by Laurent Morin (Université Rennes 1)

// Taken from https://raw.githubusercontent.com/paulgrove/node-syslog-client/master/index.js
const dgram = require("dgram");
const events = require("events");
const net = require("net");
const os = require("os");
const tls = require("tls");
const util = require("util");
let dunix = null;
try { dunix = require('unix-dgram'); }
catch (err) { /* Disabled if not found. */ }

const Transport = {
    Tcp:  1,
    Udp:  2,
    Tls:  3,
    Unix: 4,
    UUnix: 5
};

const Facility = {
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

const Severity = {
    Emergency:     0,
    Alert:         1,
    Critical:      2,
    Error:         3,
    Warning:       4,
    Notice:        5,
    Informational: 6,
    Debug:         7
};


function _expandConstantObject(obj) {
    const keys = [];
    for (const key in obj)
		if (Object.hasOwnProperty.call(obj, key))
			keys.push(key);
    for (const key of keys)
		obj[obj[key]] = parseInt(key, 10);
}
_expandConstantObject(Transport);
_expandConstantObject(Facility);
_expandConstantObject(Severity);

class Client extends events.EventEmitter {
	constructor(target, options) {
		super(options)
		this.target = target || "127.0.0.1";
		this.waitBeforeRetry = false;

		if (!options)options = {};

		this.syslogHostname = options.syslogHostname || os.hostname();
		this.port = options.port || 514;
		this.tcpTimeout = options.tcpTimeout || 10000;
		this.retryTimeout = options.retryTimeout || 0;
		this.getTransportRequests = [];
		this.facility = typeof options.facility == "number" ? options.facility : Facility.Local0;
		this.severity = typeof options.severity == "number" ? options.severity : Severity.Informational;
		this.rfc3164 = typeof options.rfc3164 === 'boolean' ? options.rfc3164 : true;
		this.level = typeof options.level === 'number' ? options.level : Severity.Debug;
		this.structured_data = this.parseSdata(options.data);
		this.appName = options.appName;
		this.appModule = process.title.substring(process.title.lastIndexOf("/") + 1, 48);
		this.dateFormatter = options.dateFormatter || function () { return this.toISOString(); };
		this.udpBindAddress = options.udpBindAddress;

		this.transportType = Transport.Udp;
		if (Object.keys(Transport).includes(options?.transport))
			this.transportType = options.transport;
		if (this.transportType === Transport.Tls) {
			this.tlsCA = options.tlsCA;
		}
		this.socket = undefined
	}
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
	cleanSDName(str) {
		const buffer = Buffer.from(str);
		const size = Math.min(32, buffer.length);
		for (let i = 0; i < size; i++) {
			const cur = buffer[i];
			if (cur < 32 || cur >= 127) buffer[i] = 46; // Replace ctr by '.'
			else if (cur == 32) buffer[i] = 95; // Replace ' ' by '_'
			else if (cur == 61) buffer[i] = 35; // Replace '=' by '#'
			else if (cur == 91) buffer[i] = 123; // Replace '[' by '{'
			else if (cur == 93) buffer[i] = 125; // Replace ']' by '}'
		}
		return buffer.toString('latin1');
	}
	cleanSDValue(obj) {
		const delim = 'ÿ';
		let value;
		if (obj === undefined) return '';
		else if (typeof obj === 'string') value = obj;
		else if (typeof obj === 'number') value = String(obj);
		else value = JSON.stringify(obj);
		value = Buffer.from(value).toString('utf8');
		if (value.indexOf(delim) != -1) throw Error('Value String not supported: ' + value);
		value = value.replace(/\\/g, delim).replace(/"/g, '\\"').replace(/]/g, '\\]').replace(RegExp(delim, 'g'), '\\\\').replace(/\n/g, '\\\\n');
		return value;
	}
	messageValue(obj) {
		let value;
		if (obj === undefined) return '';
		else if (typeof obj === 'string') value = obj;
		else if (typeof obj === 'number') value = String(obj);
		else value = JSON.stringify(obj);
		value = Buffer.from(value).toString('utf8');
		value = value.replace(/\n/g, '\\\\n');
		return value;
	}
	// https://www.iana.org/assignments/syslog-parameters/syslog-parameters.xml
	parseSdata(data) {
		let structured_data = ''; // no STRUCTURED-DATA
		if ((typeof data) === 'object') {
			for (const e in data) {
				const sddatata = data[e];
				if ((typeof sddatata) !== 'object' || sddatata.length < 1) continue;

				let structured_elem = '[' + (e !== 'origin' ? e + '@rudiprod' : 'origin');
				for (const item in sddatata) {
					const assign = ' ' + this.cleanSDName(item) + '=';
					const d = sddatata[item];
					if (d instanceof Array) {
						for (const di in d) {
							structured_elem += assign + '"' + this.cleanSDValue(d[di]) + '"';
						}
					}
					else if (d instanceof Object) {
						for (const di in d) {
							const fassign = ' ' + this.cleanSDName(item + '.' + di) + '=';
							structured_elem += fassign + '"' + this.cleanSDValue(d[di]) + '"';
						}
					}
					else structured_elem += assign + '"' + this.cleanSDValue(d) + '"';
				}
				structured_elem += ']';
				structured_data += structured_elem;
			}
		}
		return structured_data;
	}
	buildFormattedMessage(message, options) {
		if (options.facility < Facility.Kernel || options.facility > Facility.local7) { throw new Error("Invalid facility: " + severity); }
		if (options.severity < Severity.Emergency || options.severity > Severity.Debug) { throw new Error("Invalid severity: " + severity); }

		// Some applications, like LTE CDR collection, need to be able to
		// back-date log messages based on CDR timestamps across different
		// time zones, because of delayed record collection with 3rd parties.
		// Particular useful in when feeding CDRs to Splunk for indexing.
		const date = (typeof options.timestamp === 'undefined') ? new Date() : options.timestamp;
		const pri = (options.facility * 8) + options.severity;
		const newline = message[message.length - 1] === "\n" ? "" : "\n";

		let timestamp, formattedMessage;
		if (typeof options.rfc3164 !== 'boolean' || options.rfc3164) {
			// RFC 3164 uses an obsolete date/time format and header.
			const elems = date.toString().split(/\s+/);

			const month = elems[1];
			let day = elems[2];
			const time = elems[4];
			let appName = options.appName || this.appName

			/**
			 ** BSD syslog requires leading 0's to be a space.
			 **/
			if (day[0] === "0") day = " " + day.substr(1, 1);

			let lhostname = "";
			if (this.target.search(/^\/.*log$/) < 0) { // RFC 3164 on /dev/log skips the hostname.
				lhostname = " " + options.syslogHostname;
			}

			timestamp = month + " " + day + " " + time;
			formattedMessage = "<"
				+ pri
				+ ">"
				+ timestamp
				+ lhostname
				+ " "
				+ appName
				+ "["
				+ process.pid
				+ "]: "
				+ this.messageValue(message)
				+ newline;
		} else {
			// RFC 5424 obsoletes RFC 3164 and requires RFC 3339
			// (ISO 8601) timestamps and slightly different header.
			const msgid = (typeof options.msgid === 'undefined') ? "-" : options.msgid;
			let appName = options.appName;
			if (!appName) appName = options.appModule;
			else appName += '/' + options.appModule;
			let structured_data = this.structured_data + this.parseSdata(options.data);
			if (structured_data === '') structured_data = '-';

			formattedMessage = "<"
				+ pri
				+ ">1" // VERSION 1
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
	}
	close() {
		if (this.socket) {
			if (this.transportType === Transport.Tcp ||
				this.transportType === Transport.Tls ||
				this.transportType === Transport.UUnix ||
				this.transportType === Transport.Unix)
				this.socket.destroy();
			if (this.transportType === Transport.Udp)
				this.socket.close();
			this.socket = undefined;
		} else {
			this.onClose();
		}

		return this;
	}
	log() {
		let message, options = {}, cb;

		if (typeof arguments[0] === "string") message = arguments[0];
		else throw new Error("first argument must be string");

		if (typeof arguments[1] === "function") cb = arguments[1];
		else if (typeof arguments[1] === "object") options = arguments[1];

		if (typeof arguments[2] === "function") cb = arguments[2];
		if (!cb) cb = () => { };

		if (typeof options.facility === "undefined") options.facility = this.facility;
		if (typeof options.severity === "undefined") options.severity = this.severity;
		if (typeof options.rfc3164 !== "boolean") options.rfc3164 = this.rfc3164;
		if (typeof options.appName === "undefined") options.appName = this.appName;
		if (typeof options.appModule === "undefined") options.appModule = this.appModule;
		if (typeof options.syslogHostname === "undefined") options.syslogHostname = this.syslogHostname;
		if (options.severity > this.level) return this;

		const fm = this.buildFormattedMessage(message, options);
		this.getTransport( (error, transport) => {
			if (error) return cb(error);
			try {
				if ([Transport.Tcp, Transport.Tls, Transport.Unix].includes(this.transportType)) {
					transport.write(fm, (error) => 
						!error? cb() : cb(new Error("net.write() failed: " + error.message)));
				} else if (this.transportType === Transport.Udp) {
					transport.send(fm, 0, fm.length, this.port, this.target, (error, bytes) =>
						!error? cb() : cb(new Error("dgram.send() failed: " + error.message)));
				} else if (this.transportType === Transport.UUnix) {
					transport.send(fm, 0, fm.length, this.target, (error, bytes) =>
						!error? cb() : cb(new Error("dunix.send() failed: " + error.message)));
				} else return cb(new Error("unknown transport '%s' specified to Client", this.transportType));
			} catch (err) {
				this.onError(err);
				return cb(err);
			}
		});
		return this;
	}
	getTransport(cb) {
		if (this.socket) return cb(null, this.socket);

		this.getTransportRequests.push(cb);
		if (this.connecting) return this;
		else this.connecting = true;

		const af = net.isIPv6(this.target) ? 6 : 4;

		const doCb = (error, transport) => {
			while (this.getTransportRequests.length > 0) {
				const nextCb = this.getTransportRequests.shift();
				nextCb(error, transport);
			}
			this.connecting = false;
		}

		if (this.transportType === Transport.UUnix) {
			if (dunix == "none") return null; // We want a single message.
			else if (!dunix) { // Missing library
				dunix = "none";
				const err = new Error("UUnix transport not supported, all messages will be ignored");
				doCb(err);
				this.onError(err);
				return err;
			}
		}

		if (this.waitBeforeRetry) {
			return null; // Skip the message.
		}

		if ([Transport.Tcp, Transport.Unix].includes(this.transportType)) {
			let options;
			if (this.transportType === Transport.Unix) {
				options = { path: this.target };
			}
			else {
				options = {
					host: this.target,
					port: this.port,
					family: af
				};
			}

			try {
				this.socket = net.createConnection(options, () => doCb(null, this.socket));
			} catch (err) {
				doCb(err);
				this.onError(err);
			}

			if (!this.socket || !(this.socket instanceof net.Socket)) return;

			this.socket.setTimeout(this.tcpTimeout, () => {
				const err = new Error("connection timed out");
				this.socket.destroy();
				this.emit("error", err);
				doCb(err);
			});

			this.socket.once("connect", () => this.socket.setTimeout(0));

			this.socket.on("end", () => {
				const err = new Error("connection closed");
				this.emit("error", err);
				doCb(err);
			});

			this.socket.on("close", this.onClose.bind(this));
			this.socket.on("error", (err) => {
				this.socket.destroy();
				doCb(err);
				this.onError(err);
			});

			this.socket.unref();
		} else if (this.transportType === Transport.Tls) {
			const tlsOptions = {
				host: this.target,
				port: this.port,
				family: af,
				ca: this.tlsCA,
				secureProtocol: 'TLSv1_2_method'
			};

			try {
				this.socket = tls.connect(tlsOptions, () =>  doCb(null, this.socket));
			} catch (err) {
				doCb(err);
				this.onError(err);
			}

			if (!this.socket || !(this.socket instanceof tls.TLSSocket)) return;

			this.socket.setTimeout(this.tcpTimeout, () => {
				const err = new Error("connection timed out");
				this.emit("error", err);
				doCb(err);
			});

			this.socket.once("connect", () => this.socket.setTimeout(0));

			this.socket.on("end", () => {
				const err = new Error("connection closed");
				this.emit("error", err);
				doCb(err);
			});

			this.socket.on("close", this.onClose.bind(this));
			this.socket.on("error", (err) => {
				doCb(err);
				this.onError(err);
			});

			this.socket.unref();
		} else if (this.transportType === Transport.Udp) {
			try {
				const udp_dom = "udp" + af;
				this.socket = dgram.createSocket(udp_dom);

				if (!this.socket || !(this.socket instanceof dgram.Socket)) return
				// if not binding on a particular address
				// node will bind to 0.0.0.0
				if (this.udpBindAddress) {
					// avoid binding to all addresses
					this.socket.bind({ address: this.udpBindAddress });
				}
			}
			catch (err) {
				try {
					this.socket.destroy();
				} catch (err2) {
					// ignore cleanup error
				}
				doCb(err);
				this.onError(err);
			}

			if (!this.socket)
				return;

			this.socket.on("close", this.onClose.bind(this));
			this.socket.on("error", (err) => {
				this.onError(err);
				doCb(err);
			});

			this.socket.unref();

			doCb(null, this.socket);
		} else if (this.transportType === Transport.UUnix && dunix) {
			try {
				this.socket = createSocket('unix_dgram');
				this.socket.connect(this.target);
			}
			catch (err) {
				try {
					this.socket.destroy();
				} catch (err2) {
					// ignore cleanup error
				}
				doCb(err);
				this.onError(err);
			}

			if (!this.socket)
				return;

			this.socket.on("congestion", (error) => {
				const err = new Error("UNIX dgram server is not accepting data");
				this.onError(err);
				doCb(err);
			});
			this.socket.on("close", this.onClose.bind(this));
			this.socket.on("error", (err) => {
				this.onError(err);
				doCb(err);
			});

			doCb(null, this.socket);
		} else {
			doCb(new Error("unknown transport '%s' specified to Client", this.transportType));
		}
	}
	onClose() {
		if (this.socket) {
			if (this.socket.destroy)
				this.socket.destroy();
			this.socket = undefined;
		}
		console.log('Retry only in ' + this.retryTimeout);
		if (this.retryTimeout > 0) {
			this.waitBeforeRetry = true;
			setTimeout(() => this.waitBeforeRetry = false, this.retryTimeout);
		}

		this.emit("close");
		return this;
	}
	onError(error) {
		if (this.socket) {
			if (this.socket.destroy)
				this.socket.destroy();
			this.socket = undefined;
		}

		this.emit("error", error);

		return this;
	}
}

exports.Transport = Transport;
exports.Facility  = Facility;
exports.Severity  = Severity;

exports.Client = Client;
exports.createClient = (target, options) => new Client(target, options);
