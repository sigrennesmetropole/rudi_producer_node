// External dependencies
const fs = require('fs')
const ini = require('ini')

// Internal dependencies
const { getCompletedUrl } = require('../utils/utils')
const { getBackOptions, OPT_USER_CONF } = require('./backOptions')

// Load default conf
const defaultConfigFile = './rudi_console_proxy.ini'
let defaultConfFileContent
try {
  defaultConfFileContent = fs.readFileSync(defaultConfigFile, 'utf-8')
} catch (error) {
  throw new Error(`No default configuration file was found at '${customConfigFile}'`)
}

// Load custom conf
const customConfigFile = getBackOptions(OPT_USER_CONF, './rudi_console_proxy_custom.ini')
let customConfFileContent
try {
  customConfFileContent = fs.readFileSync(customConfigFile, 'utf-8')
} catch (error) {
  throw new Error(`No custom configuration file was found at '${customConfigFile}'`)
}

const customConfig = ini.parse(customConfFileContent)
const config = ini.parse(defaultConfFileContent)

// eslint-disable-next-line guard-for-in
for (const section in customConfig) {
  // console.log('CONF', section);
  const customParams = customConfig[section]
  if (customParams) {
    if (!config[section]) config[section] = {}
    for (const param in customParams) {
      // console.log('CONF', param);
      if (customParams[param]) config[section][param] = customParams[param]
    }
  }
}

if (config.logging.displayConf) console.log(config)

// Access conf values
exports.getConf = (section, subSection) => {
  if (!section) return config
  const sect = config[section]
  if (!sect || !subSection) return sect
  return sect[subSection]
}

// Shortcuts to access popular conf values
exports.getRudiApi = (suffix) => getCompletedUrl(config.rudi_api.rudi_api_url, suffix)
exports.getAdminApi = (suffix) => getCompletedUrl(config.rudi_api.admin_api, suffix)

exports.getRudiMediaUrl = (suffix) => getCompletedUrl(config.rudi_media.rudi_media_url, suffix)
exports.getMediaDwnlUrl = (id) => this.getRudiMediaUrl(`/download/${id}`)

exports.getConsoleFormUrl = () => config.rudi_console.console_form_url

exports.getDbConf = (subSection) => config.database[subSection]
exports.SU_NAME = config?.database?.db_su_usr
