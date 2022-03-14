"use strict";

/**
 * JS code for the contact form page
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
  const template_url = `${RudiForm.config.LOCAL}/getTemplate/organizations.json`;
  const apiUrl = `${RudiForm.config.API}/organizations`;

  let template = await Http.getJson(template_url).catch((e) => {
    console.error(e);
    custom_form.textContent = RudiForm.getLexR("fetching_data_error");
  });

  // Fail to fetch data, abort
  if (!template) return;

  // Check data TODO: bind to LexR
  if (!template) RudiForm.bodyError("Unknown template filename");

  RudiForm.propagateAttribute(template.htmlJsonTemplate);

  // Build form
  custom_form.setTemplate(template, template.fragmentSet.fr);

  actions = RudiForm.addHeaderButtons(custom_form);
  actions.show_btn.onclick = async () => {
    let value;
    try {
      value = custom_form.value;
    } catch (e) {
      value = e;
    }
    RudiForm.showResultOverlay(JSON.stringify(value, null, 4));
  };

  // Set defaults value
  custom_form.htmlController.organization_id.value = uuidv4();

  RudiForm.parseGetParam(apiUrl, custom_form, setValue);

  // Set listener for submit event
  custom_form.htmlController.submit_btn.addEventListener("click", async () => {
    console.log("Publishing Data");
    let rudi_ressource;
    try {
      rudi_ressource = custom_form.value;
    } catch (e) {
      // TODO:
      console.error("Error in form value");
      return;
    }
    console.log("Result = ", rudi_ressource);

    console.log(RudiForm, RudiForm.isUpdate());
    let submitFunction = RudiForm.isUpdate() ? Http.putJson : Http.postJson;
    submitFunction(apiUrl, rudi_ressource)
      .then((response) => {
        console.log("organization sent", response);
        RudiForm.endForm(custom_form);
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

function setValue(form, val) {
  form.value = val;
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
