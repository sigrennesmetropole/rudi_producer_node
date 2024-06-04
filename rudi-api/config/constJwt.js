// norm : https://www.iana.org/assignments/jwt/jwt.xhtml

// Required fields for RUDI JWT:
export const JWT_TYP = 'typ'
export const JWT_ALG = 'alg' // JWT signature algorithm

export const JWT_EXP = 'exp' // Expiration Time https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4
export const JWT_SUB = 'sub' // Subject https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.2

export const REQ_MTD = 'req_mtd'
export const REQ_URL = 'req_url'

// Optional fields for RUDI JWT:
export const JWT_ID = 'jti' // https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.7
// const JWT_IAT = 'iat' // Issued At https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.6
export const JWT_CLIENT = 'client_id' // https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
