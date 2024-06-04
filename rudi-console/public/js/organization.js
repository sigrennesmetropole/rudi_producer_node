/* eslint-disable no-undef */
'use strict'

/**
 * JS code for the organization form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js'
import '../lib/MaterialInputs.js'

import { JsonHttpRequest } from './Http.js'
import { IS_DEV, LOCAL_URL, PM_URL, RudiForm, STYLE_NRM, STYLE_THN, uuidv4 } from './Rudi.js'
import { devPaste, pathJoin } from './utils.js'

// ---- Init Global Vars -----

const apiUrl = pathJoin(PM_URL, 'data/organizations')
const customForm = document.getElementById('custom_form')
const rudiForm = new RudiForm(customForm, 'fr')

// ---- Create template Promise ----

const getTemplate = () =>
  JsonHttpRequest.get(pathJoin(LOCAL_URL, 'templates/organizations.json')).send()

// ---- Init form ----

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults values
    customForm.htmlController.organization_id.value = uuidv4()

    await rudiForm.getEditModeAndFillData(apiUrl)

    // Enable dev paste
    devPaste(rudiForm)
    rudiForm?.addMessage('Saisie', STYLE_THN)

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', () => submitOrg())
  })
  .catch(() => rudiForm.fail('critic'))

// ---- Other Functions ----
const submitOrg = async () => {
  try {
    if (IS_DEV) console.log('Submiting...')
    rudiForm?.addMessage('Envoi en cours', STYLE_NRM)
    let outputValue = rudiForm.getValue()
    if (!outputValue) {
      console.error('Submit Fail : incorrect value')
      rudiForm?.addErrorMsg('Formulaire incorrect, l‘une des contraintes n‘est pas respectée.')

      return
    }

    if (IS_DEV) console.log('outputValue:', outputValue)

    await publish(outputValue)
  } catch (e) {
    console.error(e)
    rudiForm.fail('critic')
  }
}

async function publish(data) {
  const isUpdate = rudiForm.state == 'edit'
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post
  try {
    const response = await submitFunction(apiUrl, rudiForm.pmHeaders).sendJson(data)
    console.log('organization sent', response)
    rudiForm.end()
  } catch (request) {
    try {
      const err = JSON.parse(request.responseText)
      console.error('SEND ERROR :\n', err.moreInfo.message)
      rudiForm?.addErrorMsg(err.moreInfo.message)
    } catch (e) {
      if (IS_DEV) console.error(e)
      console.error(request?.responseText)
      rudiForm.fail('critic')
    }
  }
}

window.rudi_form = rudiForm
