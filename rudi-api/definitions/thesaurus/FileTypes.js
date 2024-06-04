const mod = 'fileTypeThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { logW } from '../../utils/logging.js'
import { parameterExpected } from '../../utils/msg.js'
import { BadRequestError, RudiError } from '../../utils/errors.js'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------

// Common MIME types: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
// Complete list: https://www.iana.org/assignments/media-types/media-types.xhtml

export const MIME_YAML = 'text/x-yaml'
export const MIME_YAML_ALT = 'application/x-yaml'

export const FileTypes = [
  'application/epub+zip', // (.epub)
  'application/geo+json', // (.geojson)
  'application/graphql',
  'application/gzip', // (.gz, .gzip, .tar.gz, .tgz)
  'application/javascript',
  'application/json', // (.json)
  'application/ld+json', // (.jsonld)
  'application/msword', // (.doc)
  'application/octet-stream', // (.bin)
  'application/pdf', // (.pdf)
  'application/sql', // (.sql)
  'application/vnd.api+json',
  'application/vnd.ms-excel', // (.xls)
  'application/vnd.ms-powerpoint', // (.ppt)
  'application/vnd.oasis.opendocument.presentation', // (.odp)
  'application/vnd.oasis.opendocument.spreadsheet', // (.ods)
  'application/vnd.oasis.opendocument.text', // (.odt)
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // (.pptx)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // (.xlsx)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // (.docx)',
  'application/x-7z-compressed', // (.7z)
  'application/x-bzip', // (.bz, .tar.bz)
  'application/x-bzip2', // (.bz2, .tar.bz2)
  'application/x-executable', // (.exe)
  'application/x-tar', //(.tar)
  'application/x-www-form-urlencoded',
  'application/xml', // (.xml)
  MIME_YAML, // (.yaml, .yml)
  'application/zip', // (.zip)
  'application/zstd', // (.zst)
  'audio/aac', // (.aac)
  'audio/m4a', // (.m4a)
  'audio/mpeg', // (.mp3)
  'audio/ogg', // (.oga, .ogg)
  'audio/wav', // (.wav)
  'audio/webm', // (.weba)
  'font/otf', // (.otf)
  'font/ttf', // (.ttf)
  'image/apng', // (.apng)
  'image/bmp', // (.bmp)
  'image/flif', // (.flif)
  'image/gif', // (.gif)
  'image/jpeg', // (.jpg, .jpeg)
  'image/png', // (.png)
  'image/tiff', // (.tif | .tiff)
  'image/vnd.microsoft.icon', // (.ico)
  'image/webp', // (.webp)
  'image/x-mng', // (.mng)
  'multipart/form-data',
  'text/css', // (.css)
  'text/csv', // (.csv)
  'text/html', // (.htm, .html)
  'text/php', // (.php)
  'text/plain', // (.txt)
  'text/xml', // (.xml)
  'video/3gpp', // (.3gp, .3gpp)
  'video/mp4', // (.mp4)
  'video/mpeg', // (.mpg, .mpeg)
  'video/ogg', // (.ogv)
  'video/quicktime', // (.mov)
  'video/webm', // (.webm)
  'video/x-matroska', // (.mkv)
  'video/x-ms-wmv', // (.wmv)
  'video/x-msvideo', // (.avi)
]

const FileTypesAndEncrypted = FileTypes
FileTypes.forEach((mime) => FileTypesAndEncrypted.push(`${mime}+crypt`))

export const Extensions = {
  '3gp': 'video/3gpp',
  '3gpp': 'video/3gpp',
  '7z': 'application/x-7z-compressed',
  aac: 'audio/aac',
  apng: 'image/apng',
  avi: 'video/x-msvideo',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  bz: 'application/x-bzip',
  bz2: 'application/x-bzip2',
  css: 'text/css',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  exe: 'application/x-executable',
  flif: 'image/flif',
  geojson: 'application/geo+json',
  gif: 'image/gif',
  gz: 'application/gzip',
  gzip: 'application/gzip',
  htm: 'text/html',
  html: 'text/html',
  ico: 'image/vnd.microsoft.icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'application/javascript',
  json: 'application/json',
  jsonld: 'application/ld+json',
  m4a: 'audio/m4a',
  mkv: 'video/x-matroska',
  mng: 'image/x-mng',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odt: 'application/vnd.oasis.opendocument.text',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  ogv: 'video/ogg',
  otf: 'font/otf',
  pdf: 'application/pdf',
  php: 'text/php',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  sql: 'application/sql',
  tar: 'application/x-tar',
  'tar.bz': 'application/x-bzip',
  'tar.bz2': 'application/x-bzip2',
  'tar.gz': 'application/gzip',
  tgz: 'application/gzip',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ttf: 'font/ttf',
  txt: 'text/plain',
  wav: 'audio/wav',
  weba: 'audio/webm',
  webm: 'video/webm',
  webp: 'image/webp',
  wmv: 'video/x-ms-wmv',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'text/xml',
  yaml: MIME_YAML,
  yml: MIME_YAML,
  zip: 'application/zip',
  zst: 'application/zstd',
}

// -------------------------------------------------------------------------------------------------
// Getter / setter
// -------------------------------------------------------------------------------------------------
let Thesaurus = FileTypes

export const initialize = (arg) => {
  if (arg) Thesaurus = []
}

export const get = (prop) => {
  return prop ? Thesaurus[prop] : Thesaurus
}

export const getFileTypesWithCrypt = (prop) => {
  return prop ? FileTypesAndEncrypted[prop] : FileTypesAndEncrypted
}

export const getExtensions = () => {
  return Extensions
}

export const set = (newValue) => {
  const fun = 'set'
  try {
    if (!newValue) {
      const errMsg = parameterExpected(fun, 'newValue')
      logW(mod, fun, errMsg)
      throw new BadRequestError(errMsg)
    }
    newValue = `${newValue}`.trim()
    if (Thesaurus.indexOf(newValue) === -1) Thesaurus.push(newValue)
  } catch (err) {
    throw RudiError.treatError(mod, fun, err)
  }
}

export const isValid = (value, shouldInit) => {
  const fun = 'isValid'
  if (!value) {
    logW(mod, fun, parameterExpected(fun, 'value'))
    return false
  }
  const isIn = get().indexOf(value) > -1
  if (!isIn && shouldInit) {
    set(value)
    return true
  }
  return isIn
}
