/* eslint-disable no-multi-spaces */
/**
 * The global configuration.
 * @typedef {Object} DEFAULT_CONF
 * @property {object} server   - Configuration of the HTTP server, include access control
 * @property {object} schemas  - Configuration of the shema name-spaces
 * @property {object} storage  - Configuration of the RUDI storage system
 * @property {object} database - Configuration of mongo database logging system events
 * @property {object} logging  - Configuration of system logger
 */
export const DEFAULT_CONF = {
  server: {
    listening_address: '0.0.0.0',
    listening_port: 8080,
    server_url: 'https://shared-rudi.aqmo.org',
    server_prefix: '/media/',
    close_timeout: 60 * 20,
  },
  auth: {
    // authorized_version: [ '9bdf6d99e8b7f053f417bc4018b2f540' ],
    system_groups: { admin: 4, delegate: 100, auth: 101, producer: 102, monitor: 103, anonymous: 1000 },
    system_users: {
      admin: [4, '$1$1586de76f5f26e8a6dbbe05182e4dc94$', ['admin', 'delegate'], './keys/mediapriv.pem'], //
      rudimanager: [101, '$1$1586de76f5f26e8a6dbbe05182e4dc94$', ['auth'], './adminpub.pem'], //
      rudiprod: [102, '$1$1586de76f5f26e8a6dbbe05182e4dc94$', ['producer'], ''],
      rudiadmin: [103, '$1$1586de76f5f26e8a6dbbe05182e4dc94$', ['monitor', 'producer'], ''], //
    },
    media_priv_keyfile: './keys/mediapriv.pem',
    system_acl: {
      core: ['admin', 'admin', 'rwx', 'rwx', '---'],
      users: {},
      groups: {
        auth: 'r-x', // Can create tokens and provide login/group IDs.
        producer: '-w-', // Can create media
        monitor: 'r--', // Can access logs
        anonymous: '---', // Can access public entries only
      },
    },
  },
  schemas: {
    schema_basename: 'rudi-media-db-',
    schema_context: 'context.json',
    schema_meta: 'meta.json',
    schema_event: 'event.json',
    schema_file: 'file.json',
    schema_url: 'url.json',
  },
  storage: {
    media_dir: process.env.HOME + '/_media',
    acc_timeout: 60 * 2,
    zones: [
      { name: 'zone1', staging_time: 300, destroy_time: 600 },
      { name: 'static', path: `${process.env.HOME}/media`, csv: 'list.csv' },
    ],
  },
  database: {
    disabled: false,
    db_url: 'mongodb://localhost:27017/',
    db_name: 'rudi_media',
  },
  logging: {
    revision: '-',
    app_name: 'media',
  },
  log_server: {
    path: '127.0.0.1',
    port: 514,
    transport: 1, // TCP=1, UNIX=4
    facility: 20, // Local4
    tcpTimeout: 10000, // Local4
    retryTimeout: 0,
    rfc3164: false,
    level: 'warning',
  },
  log_local: {
    directory: './_logs/',
    prefix: 'RudiMedia-',
    console: true,
    consoleData: false,
    logRotationSec: 8 * 60 * 60, // 8 hours.
    level: 'debug',
  },
}
