/* eslint-disable no-undef */
'use strict';

/**
 * JS code for metadata form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js';
import { ForeignFile } from '../lib/MaterialInputs.js';

import { devPaste, getFileExtension, multiSplit } from './utils.js';
import { HttpRequest, JsonHttpRequest } from './Http.js';
import { encryptRsaOaepAesGcm, importPublicRsaKey } from './RudiCrypto.js';
import {
  getConf,
  getPManagerHeaders,
  isPManagerReachable,
  RudiForm,
  STYLE_BLD,
  STYLE_ERR,
  STYLE_NRM,
  STYLE_THN,
  uuidv4
} from './Rudi.js';

// ---- Access conf values -----
const IS_DEV = getConf('dev', true);
const LOCAL_URL = getConf('local');
const PM_URL = getConf('pm_url');
const MEDIA_URL = getConf('media_url');

const getUrlPmData = (suffix) => `${PM_URL}/data/${suffix}`;
const getUrlPmMedia = (suffix) => `${PM_URL}/media/${suffix}`;

// ---- Init Global Vars -----
const customForm = document.getElementById('custom_form');

const rudiForm = new RudiForm(customForm, 'fr');
rudiForm.parseOutputValue = parseOutputValue;
rudiForm.parseFormValue = parseFormValue;

const pubKeys = {};
const PROP_PUB_KEY_NAME = 'pub_key_name';

let apiFileTypes;

// ---- Helper functions ----
const getMediaHeaders = async (initialHeaders = {}) => {
  try {
    const pmMediaTokenRes = await JsonHttpRequest.get(
      getUrlPmMedia('jwt'),
      getPManagerHeaders()
    ).send();
    // console.debug('T (getMediaHeaders) pmMediaTokenRes:', pmMediaTokenRes);
    const mediaToken = pmMediaTokenRes.token;
    // console.debug('T (getMediaHeaders) mediaToken:', mediaToken);
    return Object.assign(initialHeaders, { Authorization: `Bearer ${mediaToken}` });
  } catch (err) {
    if (!err.response || !err.response.status) console.error(err);
    else
      console.error(
        `\x1b[31mFailed GET media token: ERR ${err.response?.status} ` +
          `(${err.response?.statusText}) ${err.response?.data?.message} \x1b[0m`
      );
    return;
  }
};

// ---- Create template Promise ----

const getTemplate = async () => {
  try {
    if (!(await isPManagerReachable()))
      rudiForm.addMessage(`Prod manager ne peut être joint à l'adresse: ${PM_URL}`);
    // Fetch template and enums to create form
    const templateUrl = `${LOCAL_URL}/getTemplate/metadata.js`;
    const enumsUrl = getUrlPmData('enum?lang=fr');
    const contactUrl = getUrlPmData('contacts');
    const organizationsUrl = getUrlPmData('organizations');
    const publickeysUrl = getUrlPmData('pub_keys?type=rsa');

    const pmHeaders = getPManagerHeaders();
    // console.debug('T (getTemplate metadata) headers', pmHeaders);

    if (IS_DEV) console.debug('Fetching enum from :', enumsUrl);
    // console.debug("Fetching contacts from :", contactUrl);
    // console.debug("Fetching organizations from :", organizationsUrl);
    // console.debug("Fetching publickeys from :", publickeysUrl);

    let template, enums, contacts, organizations, publickeys;
    try {
      [template, enums, contacts, organizations, publickeys] = await Promise.all([
        JsonHttpRequest.get(templateUrl).send(),
        JsonHttpRequest.get(enumsUrl, pmHeaders).send(),
        JsonHttpRequest.get(contactUrl, pmHeaders).send(),
        JsonHttpRequest.get(organizationsUrl, pmHeaders).send(),
        JsonHttpRequest.get(publickeysUrl, pmHeaders).send()
      ]);
    } catch (e) {
      if (!IS_DEV) throw e;
      else {
        console.error(e);
        template.fragmentSet.enums = undefined;
        rudiForm.addMessage('Le serveur ne peut être contacté', 'red');
        // throw e;
      }
    }
    // console.debug("template", template);
    // console.debug('enums', enums);
    // console.debug("contacts", contacts);
    // console.debug("organizations", organizations);
    // console.debug("publickeys", publickeys);

    // Build final enum
    enums.contacts = contacts.map((c) => {
      return { name: c.contact_name, value: c };
    });
    enums.organizations = organizations.map((o) => {
      return { name: o.organization_name, value: o };
    });
    enums.publickeys = publickeys.map((k) => {
      pubKeys[k.name] = k.pem;
      return k.name;
    });

    // Sort enums
    // console.debug('T (meta.getTemplate) enums.themes', enums.themes);
    Object.values(enums.themes).sort(new Intl.Collator().compare);
    enums.keywords.sort(new Intl.Collator().compare);
    enums.publickeys.sort(new Intl.Collator().compare);

    if (!template?.fragmentSet?.enums?.$) template.fragmentSet.enums.$ = {};
    Object.assign(template.fragmentSet.enums.$, enums);

    apiFileTypes = enums.fileextensions;

    return template;
  } catch (e) {
    rudiForm.addMessage(e, STYLE_ERR);
  }
};

// ---- Init form ----
rudiForm
  .load(getTemplate())
  .then(async () => {
    if (!rudiForm.customForm) {
      rudiForm.addMessage('Erreur lors du chargement du formulaire.', STYLE_ERR);
      return;
    }
    rudiForm.addMessage('Chargement du formulaire...', STYLE_NRM);
    if (!customForm?.htmlController) {
      rudiForm.addMessage(
        'Erreur lors de la création du formulaire, veuillez fermer cette fenêtre et reprendre la saisie.',
        STYLE_ERR
      );
      return;
    }
    rudiForm.updateLayout = () => customForm.htmlController.geography.invalidateSize();

    // Reduce form
    rudiForm.reduce();

    // Set defaults value
    // console.debug('T (customForm) global_id',customForm.htmlController.global_id)

    customForm.htmlController.global_id.value = uuidv4();
    customForm.htmlController.synopsis.value = [{ lang: 'fr', text: '' }];
    customForm.htmlController.summary.value = [{ lang: 'fr', text: '' }];
    customForm.htmlController.custom_licence_label.value = [{ lang: 'fr', text: '' }];
    customForm.htmlController.resource_languages.value = ['fr'];
    customForm.htmlController.storage_status.value = 'pending';
    customForm.htmlController.metadata_api_version.value = await HttpRequest.get(
      getUrlPmData('version'),
      getPManagerHeaders()
    ).send();
    customForm.htmlController.created.value = new Date().toISOString().slice(0, 10);

    await rudiForm.parseGetParam(getUrlPmData('resources'));

    customForm.htmlController.updated.value = new Date().toISOString().slice(0, 10);

    // Enable dev paste
    devPaste(rudiForm);

    const clickListener = async () => {
      try {
        console.log('Submiting...');
        rudiForm.addMessage('Envoi en cours', STYLE_NRM);
        let outputValue = rudiForm.getValue();
        if (!outputValue) {
          console.error('Submit Fail : incorrect value');
          rudiForm.addMessage(
            'Formulaire incorrect, l‘une des contraintes n‘est pas respectée.',
            STYLE_ERR
          );

          return;
        }
        customForm.htmlController.submit_btn.removeEventListener('click', clickListener);
        await publish(outputValue);
      } catch (e) {
        console.error(e);
        rudiForm.fail(true);
      }
    };

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', clickListener);
    rudiForm.addMessage('Saisie', STYLE_THN);
  })
  .catch((e) => {
    if (IS_DEV) console.error(e);
    rudiForm?.addMessage(e, STYLE_ERR);
  });

/**
 * Parse a form value to a rudi resource
 * @param {Object} formValue
 * @param {Object} originalValue
 * @returns the rudi resource
 */
function parseOutputValue(formValue, originalValue) {
  const outputValue = Object.assign({}, formValue);
  // console.debug('T (parseOutputValue) originalValue', originalValue);
  // console.debug('T (parseOutputValue) formValue', formValue);
  // console.debug('T (parseOutputValue) outputValue', outputValue.access_condition?.confidentiality);

  let hasLocalFile = false;
  if (formValue.available_formats) {
    let mediaFiles = formValue.available_formats.files?.map((file) => {
      if (file instanceof MediaFile) {
        // console.debug('T (parseOutputValue, file instanceof MediaFile) file.size:', file.size);
        return file;
      } else if (file instanceof File) {
        // console.debug('T (parseOutputValue, file instanceof File/Blob) file.size:', file.size);
        // console.debug('T (parseOutputValue, file instanceof File/Blob) file:', file);

        hasLocalFile = true;
        return MediaFile.fromFile(file);
      } else throw 'Wrong type of file';
    });

    let mediaServices = formValue.available_formats.services?.map((service) =>
      MediaService.fromService(service)
    );

    let af = [].concat(mediaFiles || [], mediaServices || []);
    outputValue.available_formats = af.length ? af : undefined;

    if (originalValue) {
      // Conserve other type of media from original value
      for (let media of originalValue.available_formats) {
        if (media.media_type != 'FILE' && media.media_type != 'SERVICE') {
          outputValue.available_formats.push(media);
        }
      }
    }
  }

  // Set restricted_access bool value
  if (!outputValue.access_condition.confidentiality)
    outputValue.access_condition.confidentiality = {};
  outputValue.access_condition.confidentiality.restricted_access = Boolean(
    (outputValue.restricted_access && hasLocalFile) ||
      originalValue?.access_condition?.confidentiality?.restricted_access
  );

  // REMOVE OR API FAIL WHEN PUBLISHING NEW RESTRICTED DATA
  outputValue.restricted_access = undefined;

  // console.debug('T (parseOutputValue) keywords', formValue.keywords);
  outputValue.keywords = multiSplit(formValue.keywords, [',', ';'], true);
  // console.debug('T (parseOutputValue) keywords', outputValue.keywords);

  return outputValue;
}

/**
 * Parse a rudi resource to a form value
 * @param {Object} rudiRessource the ressource to parse
 * @returns the form value
 */
function parseFormValue(rudiRessource) {
  // console.debug('T (parseFormValue)')
  const formValue = Object.assign({}, rudiRessource);
  const files = [];
  const services = [];
  if (rudiRessource.available_formats) {
    for (const media of rudiRessource.available_formats) {
      switch (media.media_type) {
        case 'FILE':
          // console.debug('T (parseFormValue) file.size:', media);

          files.push(MediaFile.fromLitteral(media));
          break;
        case 'SERVICE':
          services.push(MediaService.fromLitteral(media));
          break;
      }
    }
    formValue.available_formats = {};
    if (files.length) formValue.available_formats.files = files;
    if (services.length) formValue.available_formats.services = services;
  }
  const pubKeyName = files[0]?.connector?.connector_parameters?.filter(
    (p) => p.key == PROP_PUB_KEY_NAME
  )[0]?.value;
  formValue.restricted_access = pubKeyName;
  // console.debug('T (parseFormValue) formValue', formValue.access_condition.confidentiality);

  // console.debug('T (parseFormValue) keywords', formValue.keywords);
  formValue.keywords = `${formValue.keywords}`;
  return formValue;
}

async function publish(data) {
  const keyName = customForm.htmlController.restricted_access.value;
  let publicPEM, publicKey;
  if (keyName) {
    publicPEM = pubKeys[keyName];
    publicKey = await importPublicRsaKey(publicPEM, 'SHA-256').catch((e) => {
      console.error(new Error('Cannot import key from PEM', { cause: e }));
    });
  }

  let mediaFiles;
  if (data.available_formats) {
    const mediaFilesPromises = [];
    for (const media of data.available_formats) {
      if (media instanceof MediaFile && media.hasFileAttached()) {
        mediaFilesPromises.push(
          openEncryptAndChecksum(media, publicKey, publicPEM, keyName, 'SHA-256')
        );
      }
    }
    mediaFiles = await Promise.all(mediaFilesPromises);
    // console.debug('T (publish)', mediaFiles);
  }

  // console.debug('T (publish) data:', data);

  const isUpdate = rudiForm.state == 'edit';
  // console.log('Update ? : ', isUpdate);
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post;

  // TODO: check si tous les fichiers sont bien uploadés, sinon supprimer la métadonnée ou mettre son état à WIP
  try {
    // Sending the metadata to PM => API
    const pmHeaders = getPManagerHeaders();
    const res = await submitFunction(getUrlPmData('resources'), pmHeaders).sendJson(data);
    if (IS_DEV) console.debug('T (publish) metadata sent', res);
  } catch (e) {
    console.error(`Couldn't send the metadata to the API, aborting. Cause:`, e);
    throw e;
  }
  try {
    // Sending the files
    if (mediaFiles) {
      try {
        await Promise.all(
          mediaFiles.map(
            (file) =>
              new Promise((resolve, reject) =>
                sendFile(file, data.global_id)
                  .then((res) => resolve(res))
                  .catch((err) => {
                    console.error(
                      `Couldn't send file '${JSON.stringify(file)}' to media storage:`,
                      err
                    );
                    reject(err);
                  })
              )
          )
        );
        rudiForm.end();
      } catch (e) {
        console.error(`Envoi impossible:`, e);
        throw e;
      }
    }
  } catch (error) {
    try {
      if (error.toString().endsWith('No Media JWT')) {
        const errMsg =
          'la liaison ne peut être établie avec le serveur de stockage pour cet utilisateur :' +
          '  veuillez contacter le support.';
        rudiForm.addMessage(errMsg, STYLE_ERR);
        rudiForm.fail();
        return;
      }
      if (error?.responseText) {
        const err = JSON.parse(error?.responseText);
        console.error('(publish) SEND ERROR :\n', err.moreInfo.message);
        rudiForm.addMessage(err.moreInfo.message, 'red');
        console.error(err);
      } else {
        console.error(error);
        throw error;
      }
    } catch (err) {
      rudiForm.addMessage(err.toString(), STYLE_ERR);
      console.error(err);
      rudiForm.fail();
    }
  }
}

/* ---- Files Function ---- */

/**
 * Async function to open, encrypt and compute the checksum of a MediaFile
 * @param {MediaFile} mediaFile to process
 * @param {CryptoKey} publicKey for encryption, if none file is not encrypted
 * @param {String} publicPEM the PEM encoded public key
 * @param {String} publicKeyName the public key name
 * @param {String} algo can be 'SHA-1' 'SHA-256' 'SHA-384' 'SHA-512'
 * @returns the media opened, enrypted with its checksum
 */
async function openEncryptAndChecksum(mediaFile, publicKey, publicPEM, publicKeyName, algo) {
  // console.log(mediaFile);
  if (publicKey && publicPEM) await mediaFile.encrypt(publicKey, publicPEM, publicKeyName);

  await mediaFile.computeChecksum(algo);
  return mediaFile;
}

const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.log(str);
    return str;
  }
};

/**
 * Send a file to RudiMedia.
 * The MediaFile should have a file attached
 *
 * @param {MediaFile} mediaFile the file to send
 * @returns a promise, resolve when all files are sent
 */
async function sendFile(mediaFile, metadataId) {
  const mediaInfo = JSON.parse(JSON.stringify(mediaFile));
  mediaInfo.media_name = encodeURI(mediaFile.media_name);
  const postMediaOpts = await getMediaHeaders({ file_metadata: JSON.stringify(mediaInfo) });
  const mediaId = mediaFile.media_id;

  if (!postMediaOpts) {
    rudiForm.addMessage(
      'La liaison ne peut être établie avec le serveur de stockage pour cet utilisateur,' +
        ' veuillez contacter le support.',
      STYLE_NRM
    );
    throw new Error('No Media JWT');
  }
  const post = HttpRequest.post(`${MEDIA_URL}/post`, postMediaOpts);

  post.upload.addEventListener('progress', async (event) =>
    updateGlobalProgress(mediaId, mediaFile.media_name, event.total, event.loaded)
  );

  post.addEventListener('timeout', async () => {
    rudiForm.addMessage(`Timeout: L'envoi a échoué`, STYLE_ERR);
  });

  post.addEventListener('abort', async () => {
    rudiForm.addMessage(`Envoi interrompu`, STYLE_ERR);
  });

  post.addEventListener('loadstart', async () => {
    rudiForm.addMessage(
      `Le chargement peut prendre du temps,` +
        ` veuillez attendre la fin du transfert pour fermer cette page`,
      STYLE_NRM
    );
  });
  post.addEventListener('loadend', async () => {
    // Fetch commit UUID
    const data = post.responseText;
    const commitInfo = { media_id: mediaId };
    try {
      // console.log(`Media ${mediaId}: File transmission result = ${data}`);
      const resultArray = safeJsonParse(data);
      if (!Array.isArray(resultArray) || resultArray.length < 3)
        throw `Invalid response from media server: status = ${resultArray} for media ${mediaId}`;
      for (const statusInfo of resultArray) {
        if (
          typeof statusInfo !== 'string' &&
          typeof statusInfo !== 'number' &&
          !Array.isArray(statusInfo) &&
          Object.keys(statusInfo).length &&
          'status' in statusInfo &&
          statusInfo.status == 'commit_ready'
        ) {
          Object.assign(commitInfo, statusInfo);
          break;
        }
      }
      if (!commitInfo.status) {
        console.error(`Media ${mediaId}: Commit data = ` + JSON.stringify(commitInfo));
        throw `Commit message not found for media ${mediaId}`; // Might not be an error depending on access rights
      }
      if (metadataId) commitInfo.global_id = metadataId;
      return await JsonHttpRequest.post(getUrlPmMedia('commit'), getPManagerHeaders()).sendJson(
        commitInfo
      );
    } catch (error) {
      console.error(error);
    }
  });
  const data = await mediaFile.file.arrayBuffer();
  return post.send(new Int8Array(data));
}

const globalProgress = {};
const updateGlobalProgress = (mediaId, mediaName, total, loaded) => {
  globalProgress[mediaId] = { mediaName, total, loaded };
  let globalTotal = 0;
  let globalLoaded = 0;
  for (const fileProgress of Object.values(globalProgress)) {
    globalTotal += fileProgress.total;
    globalLoaded += fileProgress.loaded;
  }
  // console.log(`Transmission en cours: ${Math.floor((100 * loaded) / total)}%: fichier "${mediaName}"`);

  rudiForm.addMessage(
    `Transmission en cours ${`${Math.floor(
      (100 * globalLoaded) / globalTotal
    )}%<br/><span class="${STYLE_ERR}" syle="font-weight:light">Veuillez attendre la fin du transfert pour fermer cette page</span>`}`,
    STYLE_BLD
  );
};

/* ---- FILES ---- */

/** The object representing files for rudi resources */
class MediaFile extends ForeignFile {
  constructor(
    uuid,
    media_name,
    media_caption,
    media_visual,
    media_dates,
    connector,
    file_type,
    file_size,
    checksum,
    file_storage_status,
    file_status_update
  ) {
    super(media_name, file_size, file_type);
    this.media_id = uuid || uuidv4();
    this.media_caption = media_caption;
    this.media_visual = media_visual;
    this.media_dates = media_dates;
    this.connector = connector;
    this.checksum = checksum;
    this.file_storage_status = file_storage_status;
    this.file_status_update = file_status_update;

    this.file = undefined;
    this.encrypted = false;

    // console.debug('T (MediaFile) file.size:', file_size);
  }

  get media_name() {
    return this.name;
  }
  get file_type() {
    return this.type;
  }
  get file_size() {
    // console.debug('T (get file_size) file.size:', this.size);
    return this.size;
  }

  /**
   * Create a new instance of AvailableFormat from a litteral object
   * @param {Object} media an AvailableFormat litteral object
   * @returns a new instance of AvailableFormat
   */
  static fromLitteral(media) {
    let mediaFile = new MediaFile(
      media.media_id || uuidv4(),
      media.media_name,
      media.media_caption,
      media.media_visual,
      media.media_dates,
      media.connector,
      media.file_type,
      media.file_size,
      media.checksum,
      media.file_storage_status,
      media.file_status_update
    );
    // console.debug('T (fromLitteral) file.size:', media.file_size);

    mediaFile.file_encoding = media.file_encoding;
    mediaFile.file_structure = media.file_structure;
    mediaFile.file_storage_status = media.file_storage_status;
    mediaFile.file_status_update = media.file_status_update;
    return mediaFile;
  }

  /**
   * Create a new instance of AvailableFormat from a file
   * @param {File} file a file object
   * @returns a new instance of AvailableFormat
   */
  static fromFile(file) {
    // console.debug('T (fromFile) file.size:', file.size);
    const date = new Date(file.lastModified).toISOString();
    let fileType = file.type; // Value extractred in MaterialInput.js and is one of JS Blob.types
    if (apiFileTypes) {
      if (!fileType || Object.values(apiFileTypes).indexOf(fileType) === -1)
        fileType = apiFileTypes[getFileExtension(file.name)];
    }
    if (!fileType) fileType = 'application/octet-stream';
    const uuid = uuidv4();
    const media = new MediaFile(
      uuid,
      file.name,
      undefined,
      undefined,
      {
        created: date,
        updated: date
      },
      {
        url: `${MEDIA_URL}/download/${uuid}`,
        interface_contract: 'dwnl'
      },
      fileType,
      file.size,
      undefined
    );
    media.file = file;
    return media;
  }

  /** @return true if has a file attached, false otherwise */
  hasFileAttached = () => !!this.file;

  /**
   * Return a new File
   * @param {CryptoKey} publicKey used to encrypt
   * @param {String} publicPEM the PEM-encode public key
   * @param {String} publicKeyName the name of the key
   */
  async encrypt(publicKey, publicPEM, publicKeyName) {
    if (this.encrypted) return;
    this.encrypted = true;
    this.file = await encryptRsaOaepAesGcm(this.file, publicKey);
    const originalType = this.type;
    this.type = originalType + '+crypt';
    this.name = this.name + '+crypt';
    // console.log(this.type);
    this.connector.interface_contract = 'dwnl';
    const pubPemFirstLine = publicPEM.match(/([\w/\\+]+\n)/g)[0].slice(0, 64);
    // console.log(pubPemFirstLine);
    this.connector.connector_parameters = [];
    this.connector.connector_parameters.push(
      { key: 'encrypted', value: true, type: 'BOOLEAN' },
      { key: 'pub_key_cut', value: pubPemFirstLine, type: 'STRING' },
      { key: PROP_PUB_KEY_NAME, value: publicKeyName, type: 'STRING' },
      { key: 'original_mime_type', value: originalType, type: 'STRING' },
      { key: 'encrypted_mime_type', value: this.type, type: 'STRING' }
    );
  }

  /**
   * Compute the checksum of this MediaFile
   * @param {String} algo can be 'SHA-1' 'SHA-256' 'SHA-384' 'SHA-512'
   */
  async computeChecksum(algo) {
    // Make a digest of the file and build the hexadecimal string
    let digest = await crypto.subtle.digest(algo, await this.file.arrayBuffer());
    let hashHex = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');

    this.checksum = {
      algo: algo,
      hash: hashHex
    };
  }

  /** Override the JSON generated for this object */
  toJSON() {
    // console.debug('T (toJSON) file.size:', this.file_size);

    return {
      media_type: 'FILE',
      media_id: this.media_id,
      media_name: this.media_name,
      media_caption: this.media_caption,
      media_visual: this.media_visual,
      media_dates: this.media_dates,
      connector: this.connector,
      file_type: this.file_type,
      file_size: this.file_size,
      checksum: this.checksum,
      file_encoding: this.file_encoding,
      file_structure: this.file_structure,
      file_storage_status: this.file_storage_status,
      file_status_update: this.file_status_update
    };
  }
}

/** The object representing services for rudi resources */
class MediaService {
  constructor(uuid, media_name, media_caption, media_visual, media_dates, connector) {
    this.media_id = uuid || uuidv4();
    this.media_name = media_name;
    this.media_caption = media_caption;
    this.media_visual = media_visual;
    this.media_dates = media_dates;
    this.connector = connector;
    this.connector.interface_contract = 'external';
  }

  static fromService(service) {
    return new MediaService(
      0,
      service.media_name,
      service.media_caption,
      service.media_visual,
      service.media_dates,
      service.connector
    );
  }

  /**
   * Create a new instance of AvailableFormat from a litteral object
   * @param {Object} media an AvailableFormat litteral object
   * @returns a new instance of AvailableFormat
   */
  static fromLitteral(media) {
    return new MediaService(
      media.media_id || uuidv4(),
      media.media_name,
      media.media_caption,
      media.media_visual,
      media.media_dates,
      media.connector
    );
  }

  /** Override the JSON generated for this object */
  toJSON() {
    return {
      media_type: 'SERVICE',
      media_id: this.media_id,
      media_name: this.media_name,
      media_caption: this.media_caption,
      media_visual: this.media_visual,
      media_dates: this.media_dates,
      connector: this.connector
    };
  }
}

window.rudiForm = rudiForm;
window.testvalue = {
  other_value: 'still there ?',
  test_2: {
    something: 'here',
    array: ['whey', 'not', '?']
  },
  array: [1, 2, 3, 4, 5],
  global_id: '783f2c4a-ed99-42ce-86e4-63956624242c',
  local_id: 'Test de données',
  resource_title: 'Test de donnée 1',
  synopsis: [
    {
      lang: 'fr',
      text: 'z^àife_zyf_zegf'
    },
    {
      lang: 'cs',
      text: 'feçzufeçzç'
    }
  ],
  summary: [
    {
      lang: 'fr',
      text: 'Test de donnée description',
      autre: 'test'
    }
  ],
  theme: 'society',
  keywords: 'test',
  producer: {
    organization_id: '085da795-5551-4c1d-a924-51a56afc0ec4',
    organization_name: 'Aucun contact'
  },
  contacts: [
    {
      contact_id: '8a6c1499-e5c1-4581-815a-bbd4d97c33d9',
      contact_name: 'Aucun contact',
      email: 'aucun_contact@rennes.fr'
    }
  ],
  available_formats: [
    {
      media_type: 'SERVICE',
      media_id: '0f86dfee-d774-4416-b5c0-7cd40ff0397a',
      media_name: 'test1',
      media_caption: 'cpaiton',
      connector: {
        url: 'url1'
      }
    }
  ],
  resource_languages: ['fr'],
  dataset_dates: {
    created: '2022-04-08',
    updated: '2022-04-08'
  },
  storage_status: 'pending',
  access_condition: {
    licence: {
      licence_type: 'STANDARD',
      licence_label: 'mit'
    }
  },
  metadata_info: {
    api_version: '1.2.0'
  }
};

window.geotest = {
  global_id: '0a7ef526-5085-46cf-b6d2-526fe03b44b1',
  resource_languages: ['fr'],
  geography: {
    bounding_box: {
      west_longitude: -1.7045974731445315,
      east_longitude: -1.6331863403320315,
      north_latitude: 48.13035667153536,
      south_latitude: 48.10420799710039
    },
    geographic_distribution: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.704597, 48.104208],
            [-1.704597, 48.130357],
            [-1.633186, 48.130357],
            [-1.633186, 48.104208],
            [-1.704597, 48.104208]
          ]
        ]
      }
    },
    projection: 'WGS 84'
  },
  dataset_dates: {
    created: '2022-07-01',
    updated: '2022-07-01'
  },
  storage_status: 'pending',
  metadata_info: { api_version: '1.3.0' }
};
