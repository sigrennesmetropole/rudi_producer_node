"use strict";
/**
 * Utility functions fetching network interfaces informations.
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findInterfaces = void 0;
const os_1 = require("os");
/**
 * Generate a list of all active, external, and IPV4 interfaces.
 * @param   {[string?]} ipList - A array, may be empty or not.
 * @returns {[string?]}        - The input array completed by the list of IP addresses.
 */
function findInterfaces(ipList) {
    // Look for network interfaces.
    var interfaces = (0, os_1.networkInterfaces)();
    for (var dev in interfaces) {
        var iface = interfaces[dev]; // For all devices
        if (iface === undefined)
            continue;
        for (var conn of iface) {
            //console.log(conn);
            if (conn.internal || !conn.cidr)
                continue;
            if (conn.family !== 'IPv4')
                continue;
            ipList.push(conn.address);
        }
    }
    return ipList;
}
exports.findInterfaces = findInterfaces;
