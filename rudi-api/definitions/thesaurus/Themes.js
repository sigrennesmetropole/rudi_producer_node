'use strict'

const mod = 'themeThes'

// ------------------------------------------------------------------------------------------------
// Internal dependencies
// ------------------------------------------------------------------------------------------------
const log = require('../../utils/logging')
const Thesaurus = require('./Thesaurus')

// ------------------------------------------------------------------------------------------------
// Dynamic enum init
// ------------------------------------------------------------------------------------------------

/*   farming: "Agriculture",
  biota: "Biote",
  biota: "Biote",
  boundaries: "Limites",
  climatologyMeteorologyAtmosphere: "Climatologie/Météorologie/Atmosphère",
  economy: "Économie",
  elevation: "Altitude",
  environment: "Environnement",
  geoscientificInformation: "Informations géoscientifiques",
  health: "Santé",
  imageryBaseMapsEarthCover: "Imagerie/Cartes de base/Occupation des terres",
  intelligenceMilitary: "Renseignement/Secteur militaire",
  inlandWaters: "Eaux intérieures",
  location: "Localisation",
  oceans: "Océans",
  planningCadastre: "Planification/Cadastre",
  society: "Société",
  structure: "Structure",
  transportation: "Transport",
  utilitiesCommunication: "Services d’utilité publique/Communication",
}
*/

const CODE = 'themes'
/* const INIT_VALUES = [
  'farming',
  'biota',
  'boundaries',
  'climatologyMeteorologyAtmosphere',
  'economy',
  'elevation',
  'environment',
  'geoscientificInformation',
  'health',
  'imageryBaseMapsEarthCover',
  'intelligenceMilitary',
  'inlandWaters',
  'location',
  'oceans',
  'planningCadastre',
  'society',
  'structure',
  'transportation',
  'utilitiesCommunication',
] */

const INIT_VALUES = {
  economy: { fr: 'Economie', en: 'Economy' },
  citizenship: { fr: 'Citoyenneté', en: 'Citizenship' },
  energyNetworks: { fr: 'Réseaux, Energie', en: 'Networks, Energy' },
  culture: { fr: 'Culture, Sports, Loisirs', en: 'Culture, Sports, Leisure' },
  transportation: { fr: 'Mobilité, Transport', en: 'Transportation' },
  children: { fr: 'Enfance', en: 'Children' },
  environment: { fr: 'Environnement', en: 'Environment' },
  townPlanning: { fr: 'Urbanisme', en: 'Town planning' },
  location: { fr: 'Référentiels géographiques', en: 'Location' },
  education: { fr: 'Education', en: 'Eduction' },
  publicSpace: { fr: 'Espace public', en: 'Public space' },
  health: { fr: 'Santé, Sécurité', en: 'Health, security' },
  housing: { fr: 'Logement', en: 'Housing' },
  society: { fr: 'Social', en: 'Society' },
}

const themes = new Thesaurus(CODE, Object.keys(INIT_VALUES), INIT_VALUES)

const fun = `init ${CODE}`
// log.t(mod, fun, ``)

;(async () => {
  try {
    await themes.init()
    // log.d(mod, fun, `ok`)
  } catch (err) {
    log.w(mod, fun, `Init failed: ${err}`)
  }
})()

module.exports = themes
