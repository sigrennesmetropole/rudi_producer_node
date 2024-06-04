import http.client, urllib.parse
from datetime import datetime, timedelta
import uuid
import json
import time
import sys, os
import logging
import jwt # pip PyJWT ; pip privex-pyjwt
import base64

# openssl req -x509 -nodes -newkey rsa:2048 -keyout private_key.pem -out public_key.pem -subj "/CN=rudiadmin.aqmo.org"

def dumps(obj, indent = 0, cut=False):
    def isobj(obj): return (isinstance(obj, list) or isinstance(obj, dict))
    s = json.dumps(obj, separators=(',',':'))
    if len(s) < (78- indent): return s
    indent += 4
    padb = r''
    padn = '\n'.ljust(indent+2)
    pade = '\n'.ljust(indent)
    padf = padb if isobj(obj) and (len(obj)>0) and isobj(list(obj)[0]) else padn
    if isinstance(obj, list):    return padb + '[' + padf + (','+padn).join([ dumps(i, indent, cut) for i in obj ]) + pade + ']'
    elif isinstance(obj, dict):  return padb + '{' + padf + (','+padn).join([ (dumps(k, indent, cut) + ':' + dumps(v, indent, cut)) for k,v in obj.items() ]) + pade + '}'
    elif cut:
        r = str(obj).split('.')
        if len(r) == 5: r = [ i[0:14] + ('(...)' if len(i)>15 else '') for i in r ]
        return '.'.join(r)
    else: return str(obj)

class User(object):
    def __init__(self, name, uid = None, gid = None, privkeyfile = None, password = None):
        self.name = name
        self.group = 'auth'
        self.uid = uid if uid else str(uuid.uuid4())
        self.gid = gid if gid else str(uuid.uuid4())
        self.privkeyfile = privkeyfile
        self.password = None
        self.cookie = None
        if privkeyfile:
            if os.path.exists(privkeyfile):
                try: self.privkeyfile = open(privkeyfile, 'r').read(); print('[%s] Key loaded: %s'%(self.name, privkeyfile))
                except Exception as e: pass
            else: raise Exception('private key not found: '+privkeyfile)
        elif password:
            try:
                password = base64.b64decode(password)
                self.password = base64.b64encode(self.name.encode(r'utf-8')+b':'+password).decode(r'ascii')
            except Exception as e: pass
        else: print('[%s] no authentication set'%(self.name))

    def setGroup(self, group):
        self.group = group

    def jwtData(self, group):
        now = datetime.now()
        offset = timedelta(seconds=5)
        #time.sleep(7)
        return {
            r'exp': int((now + offset).strftime('%s')),
            r'jti': str(uuid.uuid4()),
            r'sub': group,
            r'client_id': self.name
        }

    def tokenapi_forge(self):
        """ 
        """
        #conn = self.conn(r'POST', r'/crypto/jwt/forge', self.user.jwtData())
        #return self.cresult(conn)
        pass

    def authHeader(self, group = None):
        if self.cookie:
            return { "Cookie": self.cookie }
        elif self.privkeyfile:
            if not group: group = self.group
            encoded_jwt = 'None'
            kf = bytes(self.privkeyfile, 'latin1')
            try: encoded_jwt = jwt.encode(self.jwtData(group), kf, algorithm="RS256")
            except Exception as e: raise(e)
            return { "Cookie": "rudi.media.auth=" + encoded_jwt }
        elif self.password:
            return { r'Authorization' : 'Basic %s' % (self.password) }
        else: return {}

class MediaClient(object):
    def __init__(self, user = None, host = "localhost", port = 3202, prefix = r'', https = False, verify = True):
        self.user = user
        self.https = https
        self.host = host
        self.port = port
        self.prefix = prefix
        if verify and not self.home():
            logging.error('Could not contact server '+host)
            raise Exception('Could not contact server '+host)
            #sys.exit(-1)

    def execCmd(self, argv, params = None):
        qs = None
        return qs

    def helpCmd(self):
        def show(code, message):
            print('\t%s: %-20s' % (code, message))
        show('<nothing>', r'ask')

    def rawConn(self, https, host, port, ctype, path, body = None, headers = None, uheaders = {}, cut=True):
        """ Interface for an easy request connexion 
        """
        try:
            path = self.prefix + path
            if https: conn = http.client.HTTPSConnection(host, port)
            else:     conn = http.client.HTTPConnection(host, port)
            if not headers: headers = {"Content-Type": "text/plain", "Accept": "application/json" }
            for k in uheaders.keys(): headers[k] = uheaders[k]
            if body and type(body) == dict:
                headers[r'Content-Type'] = r'application/json'
                body = json.dumps(body)
            logging.warning("Request: %s: %s => %s"%(path, dumps(headers, cut=cut), body))
            if body: conn.request(ctype, path, body, headers)
            else:
                conn.putrequest(ctype, path)
                headers[r'Transfer-Encoding'] = r'chunked'
                for k, v in headers.items(): conn.putheader(k, v)
                conn.endheaders()
        except Exception as e:
            raise Exception("Server: "+str(e))
            print('Server not accessible: '+str(e))
            return None
        return conn

    def rawConnUrl(self, url, ctype, body = None, headers = None, cut = True):
        pu = urllib.parse.urlparse(url)
        return self.rawConn(pu.scheme == 'https', pu.hostname, pu.port, ctype, pu.path, body, headers, cut=cut)

    def conn(self, ctype, path, body = None, headers = None, group = None, cut = True):
        ah = self.user.authHeader() if self.user else {}
        return self.rawConn(self.https, self.host, self.port, ctype, path, body, headers, ah, cut = cut)

    def cresult(self, conn, dump = True, raw = False):
        """ Basic parsing of the result
        """
        if not conn: return None
        response = conn.getresponse()
        conn.s_response = response
        conn.s_cookie = response.getheader(r'cookie')
        print(response.status, response.reason)
        if response.status == 200 or \
           response.status == 500 or \
           response.status == 501 or \
           (response.status >= 530 and response.status < 540) or \
           (response.status >= 400 and response.status < 500):
            if response.status == 200:
                if not raw:
                    rdata = response.read()
                    conn.close()
                    try: data = json.loads(rdata)
                    except Exception as e: data = repr(rdata)
                    if dump: print(dumps(data))
                    return data
                else: return response
            else:
                rdata = response.read()
                conn.close()
                try: data = json.loads(rdata)
                except Exception as e: data = repr(rdata)
                print(dumps(data))
        else: return None

    #
    # Ping
    #
    def home(self):
        """ Check if the Host is ready
        """
        conn = self.conn(r'GET', r'/')
        return self.cresult(conn)

    #
    # Main API
    #
    def askToken(self, user):
        conn = self.conn(r'POST', r'/jwt/forge',
                         { r'user_id': user.uid, r'user_name': user.name, r'group_name': user.group },
                         cut = False)
        self.cresult(conn)
        user.cookie = conn.s_cookie
        return conn

    def logs(self):
        conn = self.conn(r'GET', r'/logs')
        return self.cresult(conn)

    def post(self, uuid, filename):
        if not uuid: uuid = str(uuid.uuid4())
        headers = { r'Content-Type': r'application/octet-stream', r'Accept': r'application/json',
                    r'file_metadata': json.dumps({
                        r'media_name': filename,
                        r'media_type': r'FILE',
                        r'media_id': uuid,
                        r'file_type': 'application/octet-stream',
                        r'charset': 'charset=binary',
                        #r'file_size': 0
                    })
        }
        try:
            with open(filename, 'rb') as fd:
                conn = self.conn(r'POST', r'/post', body=None, headers = headers)
                chunk=True
                while chunk: chunk = fd.read(16000) ; conn.send((b'%x\r\n%s\r\n'%(len(chunk),chunk)))# ; print('.',end='');
            return self.cresult(conn)
        except Exception as e: data = ''; print('Error posting data: '+str(e)) #; raise Exception()
        return ''

    def storage(self, link, outfilename, fzip = False):
        headers = {"Content-Type": "text/plain", "Accept": "application/json" }
        if fzip:   headers[r'media-access-compression'] = 'true'
        conn = self.rawConnUrl(link, r'GET', headers = headers)
        response = self.cresult(conn, False, True)
        if response:
            with open(outfilename, 'wb') as fd:
                chunk=True
                while chunk: chunk = response.read(2000) ; fd.write(chunk)
            print('%s saved'%(outfilename))
            conn.close()

    def media(self, uuid, outfilename, method = None, fzip = False): # (Direct, Check)
        headers = {"Content-Type": "text/plain", "Accept": "application/json" }
        if method: headers[r'media-access-method'] = method
        if fzip:   headers[r'media-access-compression'] = 'true'
        conn = self.conn(r'GET', r'/'+uuid, headers = headers)
        if method == 'Direct':
            response = self.cresult(conn, False, True)
            with open(outfilename, 'wb') as fd:
                chunk=True
                while chunk: chunk = response.read(2000); fd.write(chunk)
            print('%s saved'%(outfilename))
            conn.close()
        elif method != 'Check':
            data = self.cresult(conn)
            if not data: return ''
            if not r'url' in data: logging.error('Unexpected media connector: '+json.dumps(data))
            return self.storage(data[r'url'], outfilename, fzip)
        else: return self.cresult(conn)
        return ''

    def commit(self, stageId):
        if isinstance(stageId, list):
            if len(stageId) < 2: logging.error('Unexpected stage array: '+json.dumps(stageId))
            else: stageId = stageId[-2]
        if (not r'zone_name' in stageId) or (not r'commit_uuid' in stageId):
            logging.error('Unexpected stage descriptor: '+json.dumps(stageId))
            return
        headers = {"Content-Type": "text/plain", "Accept": "application/json" }
        conn = self.conn(r'POST', r'/commit/', stageId, headers = headers)
        return self.cresult(conn)

    def mediaList(self):
        headers = {"Content-Type": "text/plain", "Accept": "application/json" }
        conn = self.conn(r'GET', r'/list/', headers = headers)
        return self.cresult(conn)

def main():
    host=r'localhost'
    port=3202
    prefix=r''
    rudimanager = User(r'rudimanager', privkeyfile = r'./adminpriv.pem')
    rudiconsole = User(r'rudiconsole', '1000')
    rudiadmin = User(r'rudiadmin', password = base64.b64encode(r'mdp'.encode('utf-8')))
    admin = User(r'admin', password = base64.b64encode(r'mdp'.encode('utf-8')))

    mcAnonymous = None
    if True:
        print(r'--------------- Client anonyme (teste le /) -----------' )
        mcAnonymous = MediaClient(None, host,port,prefix)
        time.sleep(1)

    mcManager = None
    if True:
        print(r'--------------- Création du client HTTP pour utilisateur rudimanager (teste le /) -----------' )
        mcManager = MediaClient(rudimanager,host,port,prefix)
        time.sleep(1)

    mcConsole = None
    if mcManager and True:
        rudiconsole.setGroup('producer')
        print(r'--------------- Demande un token pour utilisateur "rudiconsole" -----------' )
        mcManager.askToken(rudiconsole)
        time.sleep(1)
        print(r'--------------- Création du client HTTP pour utilisateur console -----------' )
        mcConsole = MediaClient(rudiconsole,host,port,prefix, verify = False)
        time.sleep(1)

    if mcManager and True:
        print(r'--------------- utilisateur console échoue à récuper /log -----------' )
        mcConsole.logs()
        time.sleep(3)

    if mcConsole and True:
        print(r'--------------- utilisateur console récupère une donnée: fonctionne -----------' )
        mcConsole.media('8d784a62-5e20-4412-a3be-48ef85c073ec', '_OO', method = 'Check')
        time.sleep(3)

    if mcConsole and True:
        print(r'--------------- utilisateur console récupère une donnée: fonctionne -----------' )
        mcConsole.media('8d784a62-5e20-4412-a3be-48ef85c073ec', '_OO', method = 'Check')
        time.sleep(3)

    if mcAnonymous and True:
        print(r'--------------- utilisateur anonyme récupère une donnée: fonctionne -----------' )
        mcAnonymous.media('8d784a62-5e20-4412-a3be-48ef85c073ec', '_OO', method = 'Check')
        time.sleep(3)

    if mcConsole and True:
        print(r'--------------- utilisateur console récupère une donnée qui n\'existe pas -----------' )
        mcConsole.media('2b67bfd7-b7a2-40f8-bba0-56abbbbff054', '_OO')
        time.sleep(3)

    if mcConsole and mcManager and True:
        print(r'--------------- utilisateur console poste une donnée nouvelle -----------' )
        stageId = mcConsole.post('2b67bfd7-b7a2-40f8-bba0-56abbbbff054', 'zoom_amd64.deb')
        time.sleep(1)

    if mcConsole and True:
        print(r'--------------- utilisateur console commite: il échoue -----------' )
        mcConsole.commit(stageId)
        time.sleep(2)

    if mcManager and True:
        print(r'--------------- utilisateur manager commite: il réussi -----------' )
        mcManager.commit(stageId)
        print(r'--------------- utilisateur console check md5: succès -----------' )
        mcConsole.media('2b67bfd7-b7a2-40f8-bba0-56abbbbff054', '_OO', method = 'Check')
        time.sleep(1)

    if mcConsole and True:
        print(r'--------------- utilisateur console télécharge: succès -----------' )
        mcConsole.media('2b67bfd7-b7a2-40f8-bba0-56abbbbff054', '_OO')
        time.sleep(1)

    if mcConsole and True:
        print(r'--------------- utilisateur console liste les fichiers: succès -----------' )
        mcConsole.mediaList()
        time.sleep(1)

    if mcManager and True:
        print(r'--------------- utilisateur console liste les fichiers: succès -----------' )
        mcManager.mediaList()
        time.sleep(1)

    if True:
        print(r'--------------- utilisateur admin par mot de passe -----------' )
        mcAdmin = MediaClient(admin,host,port,prefix)
        #mcAdmin.logs()
        print(r'--------------- utilisateur admin poste sans commit: succès -----------' )
        mcAdmin.post('2b67bfd7-b7a2-40f8-bba0-56abbbbff054', 'zoom_amd64.deb')

def getCookie(pkey = r'adminpriv.pem', login='rudiconsole', uid = '1000', host = r'localhost', port = 3202, https = False, prefix = r''):
    rudimanager = User(r'rudimanager', privkeyfile = pkey)
    rudiconsole = User(login, uid)
    rudiconsole.setGroup('producer')
    mcManager = MediaClient(rudimanager,host,port,prefix,https)
    mcManager.askToken(rudiconsole)
    print(rudiconsole.cookie)
    time.sleep(2)
    mcConsole = MediaClient(rudiconsole,host,port,prefix,https)

#PYTHONPATH=./client/ ipython -i -m client -- -i
#PYTHONPATH=./client/ python  -m client -c "getCookie('./keys/rudimanager_shared.pem','rudiconsole','1000','shared-rudi.aqmo.org',443,True,'/media')"
asModule= len(sys.argv) >= 2 and ( sys.argv[1] == '-i' or sys.argv[1] == '-c' )
print(sys.argv, __name__)
if __name__ == '__main__':
    if not asModule: main()
    elif sys.argv[1] == '-c':
        code = ' '.join(sys.argv[2:])
        print('eval: '+code)
        eval(code)
