/**
 * Typescript Interface for the low level syslog engine.
 *
 * @author: Laurent Morin
 * @version: 2.0.0
 */

export interface DateForm    { (date: Date): string }
export interface LogCallBack { (error?: any ):void; } // error - Instance of the Error class or a sub-class, or null if no error occurred
export interface Enum  {
    [index: string]: number
}
/**
 * Define the RFC 5424 structured-data type.
 */
export interface SData  {
    [name: string]: { [param: string]: string|number|[string?] }
}

/**
 * Define syslog engine options.
 * These options are provided to the constructor, and are used for default behavior.
 */
export interface ServiceOptions {
    port?: number;		// port - TCP or UDP port to send messages to, defaults to 514
    syslogHostname?: string;	// Value to place into the HOSTNAME part of the HEADER part of each message sent, defaults to os.hostname()
    tcpTimeout?: number;	// Number of milliseconds to wait for a connection attempt to the specified Syslog target, and the number of milliseconds to wait for TCP acknowledgements when sending messages using the TCP transport, defaults to 10000 (i.e. 10 seconds)
    transport?: number;		// Specify the transport to use, can be either syslog.Transport.Udp or syslog.Transport.Tcp or syslog.Transport.Unix, defaults to syslog.Transport.Udp
    facility?: number;		// set default for client.log(); default is syslog.Facility.Local0.
    severity?: number;		// set default for client.log(); default is syslog.Severity.Informational.
    rfc3164?: boolean;		// set to false to use RFC 5424 syslog header format; default is true for the older RFC 3164 format.
    appName?: string;		// set the APP-NAME field when using rfc5424; default uses process.title
    appModule?: string;		// complements the APP-NAME field when using rfc5424; default uses process.title
    dateFormatter?: DateForm;	// change the default date formatter when using rfc5424; interface: function(date) { return string; }; defaults to function(date) { return date.toISOString(); }
    udpBindAddress?: string;	// set to bind an UDP socket only on a specific address; default node behavior is to bind to 0.0.0.0 (all network adresses of the machine)
    data?: SData;		// Optional RFC 5424 structured-data.
}

/**
 * Define the syslog log function options.
 * These options can be provided for each log line.
 */
export interface MessageOptions {
    facility?: number;		// Either one of the constants defined in the syslog.Facility object or the facility number to use for the message, defaults to syslog.Facility.Local0 (see syslog.createClient())
    severity?: number;		// Either one of the constants defined in the syslog.Severity object or the severity number to use for the message, defaults to syslog.Severity.Informational (see syslog.createClient())
    rfc3164?: boolean;		// set to false to use RFC 5424 syslog header format; default is true for the older RFC 3164 format.
    timestamp?: Date;		// Optional Javascript Date() object to back-date the message.
    msgid?: string;		// Optional RFC 5424 message-id.
    context?: SData;		// Optional RFC 5424 structured-data.
    appModule?: string;		// complements the APP-NAME field when using rfc5424
    data?: any; 		// Second set of optional RFC 5424 structured-data.
}

/**
 * Define the syslog engine class.
 * Only the public API is defined here.
 */
export class Client {
    constructor(target: string, options: ServiceOptions);
    on(event: string, callback: LogCallBack): void;
    // client.on("close", callback) - The close event is emitted by the client when the clients underlying TCP or UDP socket is closed.
    // client.on("error", callback) - The error event is emitted by the client when the clients underlying TCP or UDP socket emits an error.
    close(): void;
    // - The close() method closes the clients underlying TCP or UDP socket. 
    log(message:string, options?: MessageOptions, callback?: LogCallBack): void;
    // The log() method sends a Syslog message to a remote host.
    // The message parameter is a string containing the message to be logged.
    // The callback function is called once the message has been sent to the remote host, or an error occurred.
}

export var Transport: Enum	// Define the syslog engine transports types
export var Facility: Enum	// Define the standard syslog facilities
export var Severity: Enum	// Define the standard syslog severity levels
