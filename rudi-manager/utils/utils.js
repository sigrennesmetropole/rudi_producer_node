const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');
const fs = require('fs');
const { parsePrivateKey } = require('sshpk');
const axios = require('axios');

const KTYP = 'ktyp';
const PRVK = 'prvk';

const createToken = (user) => {
  let exp = moment().add(config.auth.token_expire, 'minutes').format('X');
  exp = parseInt(exp, 10);
  const body = { id: user.id, username: user.username };
  return {
    authToken: jwt.sign({ user: body, exp }, config.auth.secret_key_JWT),
    publicToken: jwt.sign({ exp }, config.auth.secret_key_JWT),
    exp: exp,
  };
};
const createRudiToken = (payload) => {
  return createRudiApiToken(payload);
};

/**
 * Retrieve the string that states which algorithm was used for the
 * private/public key pair.
 * see https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
 * @param {String} algo
 * @return {String} Key algo
 */
exports.getJwtAlgo = (algo) => {
  try {
    switch (algo) {
      case 'ed25519':
      case 'EdDSA':
        return 'EdDSA';
      case 'HS256':
      case 'ES256':
      case 'RS256':
      case 'PS256':
      case 'HS512':
      case 'ES512':
      case 'RS512':
      case 'PS512':
        return algo;
      default:
        throw Error(`Algo not recognized: '${algo}'`);
    }
  } catch (err) {
    throw err;
  }
};

/**
 * Hash algo to be used to sign the JWT
 * @param {String} algo
 * @return {String} Hash algo
 */
exports.getHashAlgo = (algo) => {
  try {
    switch (algo) {
      case 'HS256':
      case 'RS256':
      case 'ES256':
      case 'PS256':
        return 'sha256';
      case 'ES512':
      case 'HS512':
      case 'RS512':
      case 'PS512':
      case 'ed25519':
      case 'EdDSA':
        return 'sha512';
      default:
        throw Error(`Algo not recognized: '${algo}'`);
    }
  } catch (err) {
    throw err;
  }
};

const createRudiApiToken = (jwtPayload) => {
  try {
    const keyInfo = getKeyInfo();
    const keyType = keyInfo[KTYP];
    const prvKey = keyInfo[PRVK];

    // Building the JWT header
    const jwtAlgo = this.getJwtAlgo(keyType);
    const jwtHeader = {
      typ: 'JWT', // (optional)
      alg: jwtAlgo,
    };

    let exp = moment().add(1, 'minutes').format('X');
    exp = parseInt(exp, 10);
    const body = {
      exp,
      sub: config.API_RUDI.manager_id,
      client_id: jwtPayload.req.user && jwtPayload.req.user.id,
      req_mtd: jwtPayload.methode || jwtPayload.req.method,
      req_url: axios.getUri({ url: jwtPayload.url, params: jwtPayload.req.query }),
    };

    // Building the data to sign
    const headerBase64url = toBase64url(JSON.stringify(jwtHeader));
    const payloadBase64url = toBase64url(JSON.stringify(body));
    const data = headerBase64url + '.' + payloadBase64url;

    // Building the JWT signature
    const hashAlgo = this.getHashAlgo(keyType);

    const signBuffer = prvKey.createSign(hashAlgo);
    signBuffer.update(data);
    const signatureBase64 = signBuffer.sign();
    const signatureBase64url = convertEncoding(signatureBase64.toString(), 'base64', 'base64url');
    // log.d(mod, fun, `base64url signature: ${signatureBase64url}`)

    // Building the final JWT
    const jwt = data + '.' + signatureBase64url;
    return jwt;
  } catch (err) {
    throw err;
  }
};

/**
 * Returns both the private key and the algo
 * @return {*} key info
 */
function getKeyInfo() {
  try {
    // Extracting the private key
    const prvKeyPem = fs.readFileSync(config.API_RUDI.RUDI_key, 'ascii');
    const prvKey = parsePrivateKey(prvKeyPem);
    const keyType = prvKey.type;

    // Storing key info
    const keyInfos = {
      [KTYP]: keyType,
      [PRVK]: prvKey,
    };
    return keyInfos;
  } catch (err) {
    throw err;
  }
}

const toBase64url = (str) => convertEncoding(str, 'utf-8', 'base64url');
const convertEncoding = (data, fromEncoding, toEncoding) => {
  try {
    const dataStr = data;
    // if (typeof data === 'object') dataStr = JSON.stringify(data)
    return Buffer.from(dataStr, fromEncoding).toString(toEncoding);
  } catch (err) {
    throw err;
  }
};

exports.createToken = createToken;
exports.createRudiToken = createRudiToken;
