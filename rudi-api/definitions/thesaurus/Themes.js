// const mod = 'themeThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { Thesaurus } from './Thesaurus.js'

// -------------------------------------------------------------------------------------------------
// Dynamic enum init
// -------------------------------------------------------------------------------------------------

/*
  farming: "Agriculture",
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
  education: { fr: 'Education', en: 'Educa tion' },
  publicSpace: { fr: 'Espace public', en: 'Public space' },
  health: { fr: 'Santé, Sécurité', en: 'Health, security' },
  housing: { fr: 'Logement', en: 'Housing' },
  society: { fr: 'Social', en: 'Society' },
}

export const Themes = new Thesaurus(CODE, INIT_VALUES)

export default Themes
