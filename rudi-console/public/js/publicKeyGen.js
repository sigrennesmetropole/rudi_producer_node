/* eslint-disable no-undef */
'use strict'

/**
 * JS code for the publicKeyGen form page
 * @author Florian Desmortreux
 */

// ---- IMPORT ----
import '../lib/HtmlFormTemplate.js'
import '../lib/MaterialInputs.js'

import { JsonHttpRequest } from './Http.js'
import {
  IS_DEV,
  LOCAL_URL,
  PM_URL,
  RudiForm,
  STYLE_NRM,
  STYLE_THN
} from './Rudi.js'
import {
  generateRsaOaepKeyPair,
  privateCryptoKeyToPem,
  publicCryptoKeyToPem
} from './RudiCrypto.js'
import { devPaste, pathJoin } from './utils.js'

// ---- Init Global Vars -----

const apiUrl = pathJoin(PM_URL,'data/pub_keys')

const customForm = document.getElementById('custom_form')
const rudiForm = new RudiForm(customForm, 'fr')

// ---- Create template Promise ----

const getTemplate = () => JsonHttpRequest.get(pathJoin(LOCAL_URL,'templates/publicKeyGen.json')).send()

// ---- Init form ----

rudiForm
  .load(getTemplate())
  .then(async () => {
    // Set defaults values

    await rudiForm.getEditModeAndFillData(apiUrl)

    // Enable dev paste
    devPaste(rudiForm)
    rudiForm?.addMessage('Saisie', STYLE_THN)

    // Set listener for submit event
    customForm.htmlController.submit_btn.addEventListener('click', async () => {
      try {
        console.log('Submiting...')
        this.customForm.readOnly()
        rudiForm?.addMessage('Envoi en cours', STYLE_NRM)
        let outputValue = rudiForm.getValue()
        if (!outputValue) {
          console.error('Submit Fail : incorrect value')
          rudiForm?.addErrorMsg('Formulaire incorrect, l‘une des contraintes n‘est pas respectée.')

          return
        }

        if (!outputValue.pem) {
          if (IS_DEV) console.log('Generating key pair...')
          let keyPair = await generateRsaOaepKeyPair(4096, 'SHA-256')
          let [publicPEM, privatePEM] = await Promise.all([
            publicCryptoKeyToPem(keyPair.publicKey),
            privateCryptoKeyToPem(keyPair.privateKey)
          ])
          download(privatePEM, `${outputValue.name}.prv`, 'application/x-pem-file')

          outputValue = {
            name: outputValue.name,
            pem: publicPEM
          }
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
    const response = await submitFunction(apiUrl, rudiForm.pmHeaders).sendJson(data)
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

// ---- Other Functions ----

// Function to download data to a file
function download(data, filename, type) {
  const file = new Blob([data], { type: type })
  const a = document.createElement('a')
  const url = URL.createObjectURL(file)
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(function () {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 0)
}

window.rudiForm = rudiForm
