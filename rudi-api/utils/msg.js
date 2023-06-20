const mod = 'msg'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { beautify } from './jsUtils.js'
import { logE } from './logging.js'

import { getLanguage } from './lang.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
const DEFAULT_MSG = 'Language not found'

// -------------------------------------------------------------------------------------------------
// Generic
// -------------------------------------------------------------------------------------------------
// TODO: store all this in a db

export const missingRequestParameter = (req, param) => {
  const fun = 'missingRequestParameter'
  try {
    switch (getLanguage()) {
      case 'en':
      case 'en-GB':
      case 'en-US':
        return `The parameter '${param}' should define in url '${req.url}' `
      case 'fr':
      case 'fr-FR':
      case 'fr-BE':
        return `Le paramètre '${param}' devrait être défini dans l'url '${req.url}' `
      default:
        return `${DEFAULT_MSG}: ${getLanguage()}`
    }
  } catch (err) {
    logE(mod, fun, err)
    throw err
  }
}

export const parameterExpected = (fun, param) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `The function '${fun}' should be called with a parameter of'${param}' `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `La fonction '${fun}' devrait être appelée avec le paramètre '${param}' `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const parameterTypeExpected = (fun, expected, obj) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `The function '${fun}' should be called with a parameter of type '${expected}' (got typeof '${typeof obj}')`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `La fonction '${fun}' devrait être appelée avec un paramètre de type '${expected}' (reçu: '${typeof obj}')`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const subPropNeededWhenPropSet = (prop, subProp) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Subproperty '${prop}.${subProp}' is required when parent property '${prop}' is set`.replace(
        /\\"/g,
        `'`
      )
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `La propriété '${prop}.${subProp}' est requise lorsque la propriété parente '${prop}' est renseignée`.replace(
        /\\"/g,
        `'`
      )
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const subPropNeededWhenPropSetToEnum = (prop, subProp, enumProp, enumVal) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return (
        `Subproperty '${prop}.${subProp}' is required when property '${prop}.${enumProp}' ` +
        `is set to '${enumVal}'`.replace(/\\"/g, `'`)
      )
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return (
        `La propriété '${prop}.${subProp}' est requise lorsque la propriété '${prop}.${enumProp}'` +
        ` vaut '${enumVal}'`.replace(/\\"/g, `'`)
      )
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const incorrectValueForEnum = (property, incorrectValue) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Incorrect value for property '${property}': '${incorrectValue}' `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Valeur incorrecte pour la propriété '${property}' : '${incorrectValue}' `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const missingObjectProperty = (jsonObject, property) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `The property '${property}' must be defined for object: ${beautify(
        jsonObject
      )} `.replace(/\\"/g, `'`)
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `La propriété '${property}' doit être définie pour l'object : ${beautify(
        jsonObject
      )} `.replace(/\\"/g, `'`)
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const parametersMismatch = (paramUrl, paramBody) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return (
        `Parameters should be the same between body and URL call!\n- URL parameter:` +
        ` '${paramUrl}'\n- body parameter: '${paramBody}' `
      )
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return (
        `Les paramètres doivent être identiques entre le corps de la requête et` +
        ` l'URL\n- URL : '${paramUrl}'\n- requête : '${paramBody}' `
      )
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const missingField = (fieldName) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `The field '${fieldName}' must be defined `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `La propriété '${fieldName}' est requise `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
// -------------------------------------------------------------------------------------------------
// Generic
// -------------------------------------------------------------------------------------------------

export const objectTypeNotFound = (objectType) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `This object type is not recognized: '${objectType}' `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Ce type d'objet n'est pas reconnu : '${objectType}' `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const objectNotFound = (objectType, objectId) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `No object of type '${objectType}' was found with id'${objectId}' `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Aucun objet de type '${objectType}' n'a été trouvé pour l'identifiant : ${objectId} `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const objectAlreadyExists = (objectType, id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `An object of type '${objectType}' already exists for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Un objet de type '${objectType}' existe déjà pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const objectAdded = (objectType, id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `New object of type '${objectType}' added with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Objet de type '${objectType}' créé avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const objectNotDeletedBecauseUsed = (objectType, id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `The object of type '${objectType}' couldn't be deleted. Its identifier is referenced in a metadata: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `L'objet de type '${objectType}' n'a pas pu être supprimé. Son identifiant est référencé dans une métadonnée : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

// -------------------------------------------------------------------------------------------------
// Metadata
// -------------------------------------------------------------------------------------------------
export const metadataAlreadyExists = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `A metadata already exists for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Une metadonnée existe déjà pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataAdded = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `New metadata added with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Metadonnée ajoutée avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataUpdated = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Metadata updated for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Metadonée mise à jour pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataFound = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `A metadata was found with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Une metadonnée a été trouvée avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataNotFound = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `No metadata was found with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Aucune metadonnée trouvée avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataDeleted = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Metadata deleted for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Métadonnée supprimée pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const metadataDeletedWithCondition = (condition) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Metadata deleted for condition: '${condition}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Métadonnées supprimées pour la condition : '${condition}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

// -------------------------------------------------------------------------------------------------
// Thesaurus
// -------------------------------------------------------------------------------------------------
export const incorrectVal = (field, val) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Incorrect value for '${field}': '${val}' `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Valeur incorrecte pour le champ '${field}' : '${val}' `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

// -------------------------------------------------------------------------------------------------
// Organization
// -------------------------------------------------------------------------------------------------
export const organizationAdded = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `New organization added with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Organisation créée avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
export const organizationAlreadyExists = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `An organization already exists for id: ${id}`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Une organisation existe déjà pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const organizationUpdated = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Organization updated for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Organisation mise à jour pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const organizationDeleted = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Organization deleted for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Organisation supprimée pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const organizationNotFound = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `No organization was found with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Aucune organisation trouvée avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

// -------------------------------------------------------------------------------------------------
// Contact
// -------------------------------------------------------------------------------------------------
export const contactAdded = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `New contact added with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Contact créé avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const contactAlreadyExists = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `A contact already exists for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Un contact existe déjà pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const contactUpdated = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Contact updated for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Contact mis à jour pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const contactDeleted = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Contact deleted for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Contact supprimé pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
export const contactNotFound = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `No contact was found with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Aucun contact trouvé avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

// -------------------------------------------------------------------------------------------------
// Report
// -------------------------------------------------------------------------------------------------
export const reportAdded = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `New report added with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Rapport créé avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const reportAlreadyExists = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `A report already exists for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Un rapport existe déjà pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const reportUpdated = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Report updated for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Rapport mis à jour pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}

export const reportDeleted = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Report deleted for id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Rapport supprimé pour l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
export const reportNotFound = (id) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `No report was found with id: '${id}'`
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `Aucun rapport trouvé avec l'identifiant : '${id}'`
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
export const reportMismatch = (reportId, urlObjectId, reportObjectId) => {
  switch (getLanguage()) {
    case 'en':
    case 'en-GB':
    case 'en-US':
      return `Resource identifier doesn't match the URL call for report ${reportId} \nURL resource id: ${urlObjectId} != report.resource_id: ${reportObjectId} `
    case 'fr':
    case 'fr-FR':
    case 'fr-BE':
      return `L'identifiant de la resource associée est incohérente avec celle utilisée dans l'URL pour le rapport ${reportId}\nURL id: ${urlObjectId} != report.resource_id: ${reportObjectId} `
    default:
      return `${DEFAULT_MSG}: ${getLanguage()}`
  }
}
