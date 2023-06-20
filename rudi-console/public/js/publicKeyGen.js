/* eslint-disable no-undef */
'use strict';

/**
 * JS code for the publicKeyGen form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js';
import '../lib/MaterialInputs.js';

import { JsonHttpRequest } from './Http.js';
import { devPaste } from './utils.js';
import {
  generateRsaOaepKeyPair,
  privateCryptoKeyToPem,
  publicCryptoKeyToPem
} from './RudiCrypto.js';
import { getConf, getPManagerHeaders, RudiForm, STYLE_NRM, STYLE_THN } from './Rudi.js';

// ---- Init Global Vars -----

const IS_DEV = getConf('dev', true);
const apiUrl = `${getConf('pm_url')}/data/pub_keys`;

const customForm = document.getElementById('custom_form');
const rudiForm = new RudiForm(customForm, 'fr');

// ---- Create template Promise ----

const getTemplate = () =>
  JsonHttpRequest.get(`${getConf('local')}/getTemplate/publicKeyGen.json`).send();

// ---- Init form ----

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults values

    await rudiForm.parseGetParam(apiUrl);

    // Enable dev paste
    devPaste(rudiForm);
    rudiForm.addMessage('Saisie', STYLE_THN);

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', async () => {
      try {
        console.log('Submiting...');
        this.customForm.readOnly();
        rudiForm.addMessage('Envoi en cours', STYLE_NRM);
        let outputValue = rudiForm.getValue();
        if (!outputValue) {
          console.error('Submit Fail : incorrect value');
          rudiForm.addMessage(
            'Formulaire incorrect, l‘une des contraintes n‘est pas respectée.' ,
            STYLE_ERR
          );

          return;
        }

        if (!outputValue.pem) {
          if (IS_DEV) console.log('Generating key pair...');
          let keyPair = await generateRsaOaepKeyPair(4096, 'SHA-256');
          let [publicPEM, privatePEM] = await Promise.all([
            publicCryptoKeyToPem(keyPair.publicKey),
            privateCryptoKeyToPem(keyPair.privateKey)
          ]);
          download(privatePEM, `${outputValue.name}.prv`, 'application/x-pem-file');

          outputValue = {
            name: outputValue.name,
            pem: publicPEM
          };
        }

        if (IS_DEV) console.log('outputValue:', outputValue);
        await publish(outputValue);
      } catch (e) {
        console.error(e);
        rudiForm.fail(true);
      }
    });
  })
  .catch(() => rudiForm.fail(true));

async function publish(data) {
  const isUpdate = rudiForm.state == 'edit';
  if (IS_DEV) console.log('Update ? : ', isUpdate);
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post;
  try {
    const response = await submitFunction(apiUrl, getPManagerHeaders()).sendJson(data);
    if (IS_DEV) console.log('public key sent', response);
    rudiForm.end();
    rudiForm.setValue(response, true);
  } catch (request) {
    try {
      const err = JSON.parse(request.responseText);
      console.error('SEND ERROR :\n', err.moreInfo.message);
      rudiForm.addMessage(err.moreInfo.message, 'red');
    } catch (e) {
      if (IS_DEV) console.error(e);
      console.error(request?.responseText);
      rudiForm.fail(true);
    }
  }
}

// ---- Other Functions ----

// Function to download data to a file
function download(data, filename, type) {
  var file = new Blob([data], { type: type });
  var a = document.createElement('a');
  let url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

window.rudiForm = rudiForm;
