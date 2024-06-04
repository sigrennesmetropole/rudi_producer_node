/* eslint-disable max-len */
export const REGEX_EMAIL =
  /^([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export const VALID_EMAIL = [REGEX_EMAIL, `'{VALUE}' n'est pas un e-mail valide`]

export const VALID_NOT_EMPTY_STRING = [/^.+$/, 'Ce champ ne peut pas être vide']
export const VALID_NOT_EMPTY_WORD = [/^[\w-]+$/, 'Ce champ contient des caractères invalides']
export const VALID_NOT_EMPTY_USERNAME = [
  /^[\w-\.@\ ]+$/,
  'Ce champ contient des caractères invalides',
]
