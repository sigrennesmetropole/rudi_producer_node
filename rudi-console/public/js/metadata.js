/* eslint-disable no-undef */
"use strict";

/**
 * JS code for metadata form page
 * @author Florian Desmortreux
 */

import Http from "./Http.js";
import RudiForm from "./RudiForm.js";
import "./HtmlFormTemplate.js";
import "./HtmlJsonTemplate.js";
import "../components/material_inputs.js";

// --- INITIALIZATION ----

// GLOBAL VARS
var custom_form = document.getElementById("custom_form");
var actions;

// Attach some property to the window to make them accessible outside
window.custom_form = custom_form;

(async () => {
  // Fetch template and enums to create form
  let template_url = `${RudiForm.config.LOCAL}/getTemplate/RUDI_v2.0.json`;
  const resources_url = `${RudiForm.config.API}/resources`;
  let enums_url = `${RudiForm.config.API}/enum`;
  let contact_url = `${RudiForm.config.API}/contacts`;
  let organizations_url = `${RudiForm.config.API}/organizations`;

  console.debug("Fetching enum from :", enums_url);
  console.debug("Fetching contacts from :", contact_url);
  console.debug("Fetching organizations from :", organizations_url);

  let res = Http.fetchJSON(template_url)
    .and(enums_url)
    .and(contact_url)
    .and(organizations_url)
    .getPromise()
    .catch((e) => {
      console.error(e);
      custom_form.textContent = RudiForm.getLexR("fetching_data_error");
    });

  // Fail to fetch data, abort
  if (!res) return;

  // Get data
  let template, enums, contacts, organizations;
  [template, enums, contacts, organizations] = await res;

  // console.debug("template", template);
  // console.debug("enums", enums);
  // console.debug("contacts", contacts);
  // console.debug("organizations", organizations);

  // Check data TODO: bind to LexR
  if (!template) RudiForm.bodyError("Unknown template filename");
  if (!enums) RudiForm.bodyError("Enums empty");

  // Build final enum
  enums.contacts = contacts.map((c) => {
    return { name: c.contact_name, value: c };
  });
  enums.organizations = organizations.map((o) => {
    return { name: o.organization_name, value: o };
  });

  template.fragmentSet.enums.$ = enums;

  RudiForm.propagateAttribute(template.htmlJsonTemplate);

  // Build form
  custom_form.setTemplate(template, [
    template.fragmentSet.fr,
    template.fragmentSet.enums,
  ]);

  actions = RudiForm.addHeaderButtons(custom_form);
  actions.show_btn.onclick = async () => {
    let value;
    try {
      value = custom_form.value;
    } catch (e) {
      value = e;
    }

    value = await toRudiRessource(value);
    RudiForm.showResultOverlay(JSON.stringify(value, null, 4));
  };

  // Reduce form
  actions.reduce_btn.click();

  // Set defaults value
  custom_form.htmlController.global_id.value = uuidv4();
  custom_form.htmlController.resource_languages.value = ["fr"];
  custom_form.htmlController.storage_status.value = "online";
  custom_form.htmlController.metadata_api_version.value = "1.2.0";
  custom_form.htmlController.created.value = new Date()
    .toISOString()
    .slice(0, 10);

  RudiForm.parseGetParam(resources_url, custom_form, setValue);

  custom_form.htmlController.updated.value = new Date()
    .toISOString()
    .slice(0, 10);

  // Set listener for submit event
  custom_form.htmlController.submit_btn.addEventListener("click", async () => {
    console.log("Publishing Data");
    let form_value;
    try {
      form_value = custom_form.value;
    } catch (e) {
      // TODO:
      console.error("Error in form value");
      return;
    }
    let rudi_ressource = await toRudiRessource(form_value);
    console.log("Result = ", rudi_ressource);

    console.log(RudiForm, RudiForm.isUpdate());
    let submitFunction = RudiForm.isUpdate() ? Http.putJson : Http.postJson;
    submitFunction(resources_url, rudi_ressource)
      .then((response) => {
        console.log("metadata sent", response);
        sendFiles(
          form_value.available_formats,
          rudi_ressource.available_formats
        )
          .then(() => {
            RudiForm.endForm(custom_form);
          })
          .catch((e) => {
            console.error(e);
          });
      })
      .catch((e) => {
        try {
          let err = JSON.parse(e);
          console.error(err.moreInfo.message);
        } catch {
          console.error(e);
        }
      });
  });
})();

/**
 * Transform the value of the form to a Rudi resource
 * @param {Object} value
 * @returns the rudi resource
 */
async function toRudiRessource(value) {
  let rudi_ressource = Object.assign({}, value);
  if (!value.available_formats) return rudi_ressource;

  rudi_ressource.available_formats = await Promise.all(
    value.available_formats.map(toRudiAvailableFormat)
  );

  return rudi_ressource;

  async function toRudiAvailableFormat(file) {
    if (!(file instanceof File)) return file;
    const mediaUuid = file.media_id || uuidv4();
    return {
      media_type: "FILE",
      media_id: mediaUuid,
      media_name: file.name,
      file_size: file.size,
      file_type: file.type,
      connector: file.connector || {
        url: `${RudiForm.config.MEDIA.connector}/${mediaUuid}`,
      },
      checksum: file.checksum || {
        algo: "MD5",
        hash: await getHash(file),
      },
    };
  }
}

/**
 * Hash a File from an file input
 * @param {File} file the file to hash
 * @param {Function} onprogress
 * @returns the file's hash
 */
function getHash(file) {
  return new Promise(function (resolve, reject) {
    let reader = new FileReader();
    reader.onload = () => {
      var binary = CryptoJS.lib.WordArray.create(reader.result);
      var md5 = CryptoJS.MD5(binary).toString();
      resolve(md5);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ---- FILES ---- */

/**
 *
 * @param {File[]} files the array of files
 * @param {Object} metadata the array of corresponding metadata
 * @returns
 */
function sendFiles(files, metadata) {
  let promise_list = [];
  for (let i = 0; i < files.length; i++) {
    promise_list.push(
      uploadFile(files[i], metadata[i], (event) => {
        let p = event.loaded / event.total;
        custom_form.htmlController.available_formats.setProgress(i, p);
      })
    );
  }

  return Promise.all(promise_list);

  function uploadFile(file, metadata, onprogress) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        resolve(undefined);
        return;
      }
      let reader = new FileReader();
      let xhr = new XMLHttpRequest();
      xhr.onload = (m) => {
        resolve(m);
      };
      xhr.onerror = (e) => {
        reject(e);
      };

      xhr.open("POST", RudiForm.config.MEDIA.POST);
      xhr.setRequestHeader(
        "Authorization",
        `Basic xxxxxxxxx`
      );
      xhr.setRequestHeader("file_metadata", JSON.stringify(metadata));
      xhr.onprogress = onprogress;
      reader.onload = function () {
        var array = new Int8Array(reader.result);
        xhr.send(array);
      };
      reader.readAsArrayBuffer(file);
    });
  }
}

try {
  let dev_paste = document.getElementById("dev_paste");
  dev_paste.focus();
  dev_paste.addEventListener("keydown", function (e) {
    if (e.key == "Enter" && !e.shiftKey) {
      try {
        var val = JSON.parse(dev_paste.value);
      } catch (e) {
        console.error(e);
      }
      setValue(custom_form, val);
      if (e.ctrlKey) {
        actions.show_btn.click();
      }
      e.preventDefault();
    }
  });
} catch {
  // Nothing
}

/**
 * Change the value of the form with a given
 * rudi resource. The form's fields are filled
 * accordingly to the new value
 * @param {Object} rudi_ressource
 */
function setValue(form, rudi_ressource) {
  console.log(rudi_ressource);
  let form_value = Object.assign({}, rudi_ressource);
  if (rudi_ressource.available_formats) {
    form_value.available_formats = rudi_ressource.available_formats.map(
      toFormAvailableFormat
    );
  }

  try {
    form.value = form_value;
  } catch (e) {
    if (e instanceof Array) {
      for (let err of e) console.error(err);
    } else console.error(e);
  }

  function toFormAvailableFormat(file) {
    let form_file = Object.assign({}, file);
    form_file.name = file.media_name;
    form_file.size = file.file_size;
    form_file.type = file.file_type;
    return form_file;
  }
}
