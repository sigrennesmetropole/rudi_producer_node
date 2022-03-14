'use strict'

const { DEFAULT_LANG } = require(`../config/confApi`)

let currentLanguage = DEFAULT_LANG

exports.setLanguage = (lang) => {
  if (lang === currentLanguage) return

  if (lang === '') throw new Error(`No language was provided`)

  currentLanguage = lang
}
exports.getLanguage = () => {
  return currentLanguage
}
