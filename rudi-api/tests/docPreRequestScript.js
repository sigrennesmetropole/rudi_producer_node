const TRACE = false
const DEBUG = false

const TOKEN_DURATION_S = 1200

const initStoredVar = (name, defaultVal) => {
    const storedVal = pm.variables.get(name)
    if (!storedVal) pm.variables.set(name, defaultVal)
    return storedVal || defaultVal
}

const API_TOKEN_NAME = initStoredVar('apiTokenName', 'apiJwt')
const PORTAL_TOKEN_NAME = initStoredVar('portalTokenName', 'portalJwt')

const ADMIN_URL = pm.variables.get('apiUrl') + '/api/admin'

log = {
    d: (msg) => { if (DEBUG || TRACE) console.log(msg) },
    t: (msg) => { if (TRACE) console.log(msg) }
}

logT('API_TOKEN_NAME: ' + API_TOKEN_NAME)
logT('PORTAL_TOKEN_NAME: ' + PORTAL_TOKEN_NAME)
logT('ADMIN_URL: ' + ADMIN_URL)

time = {
    now: () => new Date().toISOString(),
    nowEpochS: () => _.floor(new Date().getTime() / 1000),
    timezone: () => new Date().getTimezoneOffset(),
}
codec = {
    streamToString: (data) => data?.stream?.toString('utf8'),

    fromBase64: (data) => Buffer.from(data, 'base64')?.toString('utf-8'),

    fromBase64Url: (base64UrlStr) => {
        logT('-- base64UrlStr --')
        if (!base64UrlStr) return ''
        //        logD('base64UrlStr: ' + base64UrlStr)
        //        logD('base64UrlStr.length: ' + base64UrlStr.length)
        const paddedStr = (base64UrlStr.length % 4 == 0)
            ? base64UrlStr
            : base64UrlStr + "====".substring(base64UrlStr.length % 4);
        // logD('paddedStr: ' + paddedStr)
        const base64Str = paddedStr
            .replace("_", "/")
            .replace("-", "+");
        // logD('base64Str: ' + base64Str)
        return codec.fromBase64(base64Str);
    },

    streamToUtf8: (data) => data?.stream?.toString('utf8')

};

rand = {
    get: (randName) => pm.collectionVariables.replaceIn(randName),

    uuid: () => rand.get('{{$randomUUID}}'),

    pickInList: (list) => list[_.random(0, list.length - 1)],

    pick: (listName) => rand.pickInList(pm.collectionVariables.get(listName)),

    initVal: (field) => {
        const val = pm.collectionVariables.get(field);
        if (val) return val;
        const randVal = rand.get('{{$randomUUID}}');
        pm.collectionVariables.set(field, randVal);
        return randVal;
    },

    getContactEmail: (contactName) => `${contactName
        .replace(/(Miss|(Ms|Mrs|Mr|Dr)\.)\s+|'Jr\.'/gi, '')
        .toLowerCase()
        .replace(/\s+|\.\./g, '.')
        .replace(/^\.+|\.+$|\'+/g, '')
        }@irisa.fr`,
    //'
    randomize: (field) => {
        const randVal = rand.uuid();
        pm.collectionVariables.set(field, randVal);
        return randVal;
    },

};

secu = {

    isTokenValid: (tokenName) => {
        logT('-- is ' + tokenName + ' Valid --')
        const token = pm.collectionVariables.get(tokenName)
        // console.log('typeof token: ' + typeof token)
        if (!token || typeof token !== 'string') {
            logD('Token ' + tokenName + ' is invalid: ' + JSON.stringify(token))
            return false
        }
        // logD('splitting token: ' + token)
        const jwtBodyEncoded = token.split('.')[1]
        // logD('split token: ' + jwtBodyEncoded)

        const jwtBody = JSON.parse(codec.fromBase64Url(jwtBodyEncoded))
        // logD('decoded body: ' + jwtBody)
        if (!jwtBody.exp) {
            logD('No expiration time was found')
            return false
        }
        // logD('is token valid?')
        const isValid = jwtBody.exp > time.nowEpochS()
        // logD(tokenName + ' is ' + (isValid ? '' : 'not ') + 'valid')
        return isValid
    },

    renewApiToken: async (tokenName, next) => {
        logT('-- renewApiToken --')
        const reqUrl = pm.variables.get('cryptoJwtUrl') + '/forge'
        // logD('reqUrl: ' + reqUrl)
        const reqNewToken = {
            url: reqUrl,
            method: 'POST',
            header: { "Content-Type": "application/json" },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    'exp': time.nowEpochS() + TOKEN_DURATION_S,
                    'jti': rand.get('{{$randomUUID}}'),
                    'sub': pm.variables.get('pmClientName') || 'rudi_api_pm',
                    'client_id': pm.variables.get('pm_client_id') || 'pm',
                    'req_mtd': 'all',
                    'req_url': 'all'
                })
            }
        }
        pm.sendRequest(reqNewToken, (err, res) => {
            if (err) {
                console.error('[renewApiToken] Crypto module most likely not running: ' + JSON.stringify(err))
                throw ('Crypto module most likely not running')
            }
            const token = codec.streamToUtf8(res)
            // logD('rudiProdToken : ' + token)
            try {
                pm.expect(res).to.have.property('code', 200);
            } catch (err) {
                console.error('[renewApiToken]: ' + err)
                throw new Error('[renewApiToken]: ' + err)
            }
            pm.expect(token).to.match(/^\w+\.\w+\.[\w\-=]+$/)
            pm.collectionVariables.set(tokenName, token)
            logD('API token stored')

            if (next) next(token)
            //return token
        })
    },

    renewPortalToken: async (tokenName, rudiProdToken) => {
        logT('-- renewPortalToken --')
        const reqUrl = ADMIN_URL + '/portal/token'
        // logD('reqUrl: ' + reqUrl)
        const reqNewToken = {
            url: reqUrl,
            method: 'GET',
            header: {
                'Content-Type': "application/json",
                'Authorization': 'Bearer ' + rudiProdToken
            },
        }
        pm.sendRequest(reqNewToken, (err, res) => {
            if (err) throw err
            try {
                pm.expect(res).to.have.property('code', 200);
            } catch (error) {
                console.error('[renewPortalToken]: ' + error)
                throw new Error('[renewPortalToken]: ' + error)
            }
            //logD('renewPortalToken res: ' + JSON.stringify(res))
            const token = JSON.parse(codec.streamToUtf8(res)).access_token
            //const token = res.json()
            logD('Portal token: ' + token)

            pm.expect(token).to.match(/^\w+\.\w+\.[\w\-=]+$/)
            pm.collectionVariables.set(tokenName, token)
            logD('Portal token stored')

        })
    },

    getRudiProdToken: async (next) => {
        logT('-- getRudiProdToken --')
        const tokenName = API_TOKEN_NAME
        if (!secu.isTokenValid(tokenName)) await secu.renewApiToken(tokenName, next)
        else if (next) next(pm.collectionVariables.get(tokenName))
        logT('API token stored')
        return pm.collectionVariables.get(tokenName)
    },

    getPortalToken: async (apiToken) => {
        logT('-- getPortalToken --')
        const tokenName = PORTAL_TOKEN_NAME
        if (!secu.isTokenValid(tokenName)) await secu.renewPortalToken(tokenName, apiToken)
        logT('Portal token stored')
        return pm.collectionVariables.get(tokenName)
    }

}

secu.getRudiProdToken()
