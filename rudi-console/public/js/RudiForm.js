"use strict";

/**
 * JS code for the form pages
 * @author Florian Desmortreux
 */

import Http from "./Http.js";
import OverlayManager from "./OverlayManager.js";

// Import JSON
const LexR = importJSON(
  "./js/LexicalResources.json",
  "No lexical resources. Try to reload."
);
const config = importJSON("./config.json", "No config. Try to reload.");

// Init vars
var result_overlay = OverlayManager.addOverlay(document.createElement("pre"));
var _is_update = false;
var language = "fr";

// ---- Lifecycle ----

function importJSON(url, error_msg) {
  try {
    return Http.getJsonSync(url);
  } catch (e) {
    console.error(e);
    bodyError(error_msg);
  }
}

function bodyError(err_msg) {
  let h1 = document.createElement("h1");
  h1.textContent = err_msg;

  document.body.prepend(h1);
}

function parseGetParam(apiUrl, form, setValue) {
  var params = new URL(window.location.href).searchParams;
  console.log("window.location.href: " + JSON.stringify(window.location.href));
  console.log("parseGetParam: " + params);
  var update_id = params.get("update");
  var read_only = params.get("read-only");
  // history.replaceState(null, "", window.location.pathname);

  if (update_id) console.debug("update_id :", update_id);
  if (read_only) console.debug("MODE READ ONLY");

  if (update_id) {
    const formValue = Http.getJsonSync(`${apiUrl}/${update_id}`);
    console.log("formValue: " + JSON.stringify(formValue));
    setValue(form, formValue);

    form.onclear = () => {
      let end = window.confirm(getLexR("ask_cancel_update"));
      if (end) cancelUpdate();
      return end;
    };
  } else if (read_only) {
    form.readOnly();
    setValue(form, Http.getJsonSync(`${apiUrl}/${read_only}`));
  }

  _is_update = new Boolean(update_id);
}

function isUpdate() {
  return _is_update;
}

function endForm(form) {
  form.readOnly();
  var h1 = document.createElement("h1");
  h1.appendChild(
    document.createTextNode(getLexR(_is_update ? "end_update" : "end_create"))
  );
  form.prepend(h1);
  window.scrollTo(0, 0);
}

function getLexR(lex_id) {
  return LexR[language][lex_id];
}

function cancelUpdate(form) {
  form.textContent = "";
  var h1 = document.createElement("h1");
  h1.appendChild(document.createTextNode(getLexR("cancel_update")));
  form.appendChild(h1);
}

/* ----- ----- */

// TODO: bind to LexR and doc
function addHeaderButtons(custom_form) {
  let header_actions = custom_form.htmlController.header_actions;

  // Add header actions TODO: link tooltips to lexicalResources
  let show_btn = icon_flat_btn("code", "Show value", () => {
    let value;
    try {
      value = custom_form.value;
    } catch (e) {
      value = e;
    }
    showResultOverlay(JSON.stringify(value, undefined, 4));
  });
  header_actions.appendChild(show_btn);

  let reduce_btn = icon_flat_btn(
    "keyboard_arrow_down",
    "Show required only",
    () => {
      if (custom_form.toggleAttribute("reduced"))
        reduce_btn.setIcon("keyboard_arrow_up", "Show all");
      else reduce_btn.setIcon("keyboard_arrow_down", "Show required only");
    }
  );
  header_actions.appendChild(reduce_btn);

  let showDisabled_btn = icon_flat_btn(
    "visibility_off",
    "show disabled fields",
    () => {
      if (custom_form.toggleAttribute("showdisabled"))
        showDisabled_btn.setIcon("visibility", "hide disabled fields");
      else showDisabled_btn.setIcon("visibility_off", "show disabled fields");
    }
  );
  header_actions.appendChild(showDisabled_btn);

  header_actions.appendChild(
    icon_flat_btn("save", "Save as default", () => {
      window.alert("Not implemented yet");
    })
  );

  header_actions.appendChild(
    icon_flat_btn("delete", "Clear form", () => {
      if (window.confirm("Clear the form ?")) custom_form.clear();
    })
  );

  return {
    show_btn: show_btn,
    reduce_btn: reduce_btn,
    showDisabled_btn: showDisabled_btn,
  };
}

/**
 * Take a HtmlJsonTemplate and for each element and/or child
 *  - if has a child with attr required, give element the required attr
 *  - if all child has attr hidden, give element the hidden attr
 * Used in styling to kwown which element contains at least a required
 * elements and if it has only hidden elements.
 * @param {Object|Array} template
 */
function propagateAttribute(template) {
  function recur(element) {
    if (!element.children) return;
    let isRequired = false;
    let hasOnlyDisabledChild = true;
    for (let child of element.children) {
      if (child.children) recur(child);
      if (child.tag.charAt(0) == "h") continue;
      let attr = child.attr;

      if (attr?.required && !attr?.disabled) isRequired = true;
      if (!attr?.disabled) hasOnlyDisabledChild = false;
    }
    if (!element.attr) element.attr = {};
    if (isRequired) element.attr.required = isRequired;
    if (hasOnlyDisabledChild) element.attr.disabled = hasOnlyDisabledChild;
  }

  if (template instanceof Array) {
    for (let child of template) recur(child);
  } else recur(template);
}
/* ---- OTHER FUNCTIONS ----- */

/**
 * Create an button with an icon
 * Based on material icons
 * @param {String} name name of the icon
 * @param {String} tooltip a tooltip for the button
 * @param {Function} onclick a callback for click
 * @returns the button
 */
function icon_flat_btn(name, tooltip, onclick) {
  let btn = document.createElement("button");
  btn.classList.add("icon-flat");
  btn.setAttribute("type", "button");

  if (tooltip) {
    btn.classList.add("top-tooltip");
    btn.setAttribute("data-tooltip", tooltip);
  }
  let icon = document.createElement("i");
  icon.classList.add("material-icons");
  icon.textContent = name;
  btn.appendChild(icon);
  btn.setIcon = (name, tooltip) => {
    icon.textContent = name;
    if (tooltip) btn.setAttribute("data-tooltip", tooltip);
    else if (tooltip == null) btn.toggleAttribute("data-tooltip", false);
  };
  btn.onclick = () => {
    onclick(btn);
  };

  return btn;
}

function showResultOverlay(text) {
  result_overlay.textContent = text;
  result_overlay.show();
  result_overlay.focus();
}

// Allow to select result with ctrl+a
result_overlay.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key == "a") {
    e.preventDefault();
    let range = document.createRange(); //range object
    range.selectNodeContents(result_overlay); //sets Range

    let sel = window.getSelection();
    sel.removeAllRanges(); //remove all ranges from selection
    sel.addRange(range); //add Range to a Selection.
  }
});

export default {
  config,
  language,
  isUpdate,
  endForm,
  bodyError,
  parseGetParam,
  addHeaderButtons,
  propagateAttribute,
  showResultOverlay,
};
