/* eslint-disable no-undef */
'use strict'

/**
 * JS code for the publicKey form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js'
import '../lib/MaterialInputs.js'

import { HttpRequest, JsonHttpRequest } from './Http.js'
import {
  IS_DEV,
  LOCAL_URL,
  PM_URL,
  RudiForm,
  STYLE_NRM,
  STYLE_THN
} from './Rudi.js'
import { devPaste, pathJoin } from './utils.js'

// ---- Init Global Vars -----

const KEYS_URL = pathJoin(PM_URL,'data/pub_keys')

const customForm = document.getElementById('custom_form')
const rudiForm = new RudiForm(customForm, 'fr')

// ---- Create template Promise ----

const getTemplate = () => JsonHttpRequest.get(pathJoin(LOCAL_URL,'templates/publicKey.json')).send()

// ---- Init form ----

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults values

    await rudiForm.getEditModeAndFillData(KEYS_URL)

    // Enable dev paste
    devPaste(rudiForm)

    rudiForm?.addMessage('Saisie', STYLE_THN)

    customForm.htmlController.switch.addEventListener('change', () => {
      customForm.htmlController.pem.value = ''
      update_key_display()
    })
    customForm.htmlController.url.addEventListener('change', () => {
      update_key_display()
    })

    customForm.htmlController.prop.addEventListener('change', update_key_display)

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

        if (customForm.htmlController.switch.value == 'URL') {
          let key = await get(outputValue.url).catch(() => {
            return undefined
          })

          outputValue.pem = key
        }

        if (IS_DEV) console.log('outputValue:', outputValue)
        await publish(outputValue)
      } catch (e) {
        console.error(e)
        rudiForm.fail('critic')
      }
    })
  })
  .catch(() => rudiForm.fail('critic'))

async function publish(data) {
  const isUpdate = rudiForm.state == 'edit'
  if (IS_DEV) console.log('Update ? : ', isUpdate)
  const submitFunction = isUpdate ? JsonHttpRequest.put : JsonHttpRequest.post
  try {
    const response = await submitFunction(KEYS_URL, rudiForm.pmHeaders).sendJson(data)

    if (IS_DEV) console.log('public key sent', response)
    rudiForm.end()
    rudiForm.setValue(response, true)
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

/**
 * GET request to an url.
 * Memorize the last response
 * @param url an url
 */
let previous = ''
let val

const get = async (url) => {
  if (previous == url) {
    if (IS_DEV) console.log('mem :)')
    return val
  } else {
    previous = url
    val = await HttpRequest.get(url).send()
    return val
  }
}

/**
 * Update the form in function of its current state to hide and display
 * inputs and values
 */
async function update_key_display() {
  if (
    customForm.htmlController.switch.value != 'URL' ||
    rudiForm.customForm.hasAttribute('readonly')
  )
    return

  // Clear display
  customForm.htmlController.pem.value = ''

  // Try get url
  let get_response
  let url = customForm.htmlController.url.value
  if (url) {
    try {
      get_response = await get(url)
    } catch (e) {
      if (IS_DEV) console.error(e)
      customForm.htmlController.url.toggleAttribute('error', false)
      return
    }
  }

  // Try parse json
  let json,
    key = get_response
  try {
    json = JSON.parse(get_response)
    if (IS_DEV) console.log('json:', json)
    let prop = customForm.htmlController.prop.value
    key = prop ? json[prop] : JSON.stringify(json, null, 4)
    customForm.htmlController.prop.toggleAttribute('hidden', false)
  } catch {
    customForm.htmlController.prop.value = ''
    customForm.htmlController.prop.toggleAttribute('hidden', true)
  }

  // Display key
  customForm.htmlController.pem.value = key
}

window.rudiForm = rudiForm
