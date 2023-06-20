/* eslint-disable no-undef */
'use strict';

/**
 * JS code for the organization form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js';
import '../lib/MaterialInputs.js';

import { JsonHttpRequest } from './Http.js';
import { devPaste } from './utils.js';
import { getConf, getPManagerHeaders, RudiForm, STYLE_NRM, STYLE_THN, uuidv4 } from './Rudi.js';

// ---- Init Global Vars -----

const apiUrl = `${getConf('pm_url')}/data/organizations`;
const customForm = document.getElementById('custom_form');
const rudiForm = new RudiForm(customForm, 'fr');
const IS_DEV = getConf('dev', true);

// ---- Create template Promise ----

const getTemplate = () =>
  JsonHttpRequest.get(`${getConf('local')}/getTemplate/organizations.json`).send();

// ---- Init form ----

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults values
    customForm.htmlController.organization_id.value = uuidv4();

    await rudiForm.parseGetParam(apiUrl);

    // Enable dev paste
    devPaste(rudiForm);
    rudiForm.addMessage('Saisie', STYLE_THN);

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', async () => {
      try {
        if (IS_DEV) console.log('Submiting...');
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

        if (IS_DEV) console.log('outputValue:', outputValue);

        await publish(outputValue);
      } catch (e) {
        console.error(e);
        rudiForm.fail(true);
      }
    });
  })
  .catch(() => rudiForm.fail(true));

// ---- Other Functions ----

async function publish(data) {
  const isUpdate = rudiForm.state == 'edit';
  // console.log('Update ? : ', isUpdate);
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post;
  try {
    const pmHeaders = await getPManagerHeaders();
    const response = await submitFunction(apiUrl, pmHeaders).sendJson(data);
    console.log('organization sent', response);
    rudiForm.end();
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

window.rudi_form = rudiForm;
