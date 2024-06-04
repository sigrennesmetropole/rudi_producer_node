/* eslint-disable no-undef */
'use strict'

/**
 * JS code for the contact form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js'
import '../lib/MaterialInputs.js'

import { JsonHttpRequest } from './Http.js'
import { IS_DEV, LOCAL_URL, PM_URL, RudiForm, STYLE_NRM, STYLE_THN, uuidv4 } from './Rudi.js'
import { devPaste, pathJoin } from './utils.js'

// ---- Init Global Vars -----

const apiUrl = pathJoin(PM_URL, 'data/contacts')
const customForm = document.getElementById('custom_form')
const rudiForm = new RudiForm(customForm, 'fr')

// ---- Create template Promise ----

const getTemplate = () => JsonHttpRequest.get(pathJoin(LOCAL_URL, 'templates/contacts.json')).send()

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults value
    customForm.htmlController.contact_id.value = uuidv4()

    await rudiForm.getEditModeAndFillData(apiUrl)

    // Enable dev paste
    devPaste(rudiForm)
    rudiForm?.addMessage('Saisie', STYLE_THN)

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', async () => {
      try {
        console.log('Submiting...')
        rudiForm?.addMessage('Envoi en cours', STYLE_NRM)
        let outputValue = rudiForm.getValue()
        if (!outputValue) {
          console.error('Submit Fail : incorrect value')
          rudiForm?.addErrorMsg('Formulaire incorrect, l‘une des contraintes n‘est pas respectée.')
          return
        }
        await publish(outputValue)
      } catch (e) {
        if (IS_DEV) console.error(e)
        rudiForm.fail('critic')
      }
    })
  })
  .catch(() => rudiForm.fail('critic'))

// ---- Other Functions ----
const publish = async (data) => {
  const isUpdate = rudiForm.state == 'edit'
  if (IS_DEV) console.log('Update ? : ', isUpdate)
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post
  try {
    const response = await submitFunction(apiUrl, rudiForm.pmHeaders).sendJson(data)
    console.log('contact sent', response)
    rudiForm.end()
  } catch (error) {
    try {
      const err = JSON.parse(error.responseText)
      console.error('SEND ERROR :\n', err?.moreInfo?.message || err)
      rudiForm?.addErrorMsg(err?.moreInfo?.message || err)
    } catch (e) {
      console.error(e)
      if (IS_DEV) console.error(error?.responseText)
      rudiForm?.addErrorMsg(error?.responseText)
      rudiForm.fail('critic')
    }
  }
}

window.rudiForm = rudiForm
