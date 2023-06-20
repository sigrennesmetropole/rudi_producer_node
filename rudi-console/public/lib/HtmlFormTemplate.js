'use strict';

/**
 * Module to create a new form based on a HtmlFormTemplate
 * A HtmlFormTemplate is a extended version of a HtmlJsonTemplate
 * @module HtmlFormTemplate
 * @author Florian Desmortreux
 */

import HtmlJsonTemplate from './HtmlJsonTemplate.js';

/**
 * Attach listeners to create bindings of CustomForm
 * @param {*} formBindings of a CustomForm
 * @param {*} controller of the CustomForm
 */
function setBindings(formBindings, controller) {
  for (let [targetId, bindings] of Object.entries(formBindings)) {
    let target = controller[targetId];
    if (!target)
      throw `Error : [HtmlFormTemplate, formBindings] No element '${targetId}' in controller. Binding fail`;
    target.addEventListener('change', () => execBinding(bindings, controller, target, targetId));
    // Play binding the first time
    target.dispatchEvent(new Event('change'));
  }
}

/**
 *
 * @param {*} bindings
 * @param {*} controller
 * @param {*} target
 * @param {*} targetId
 */
const execBinding = (bindings, controller, target, targetId) => {
  // console.debug('T (execBinding) target:', targetId);
  for (let [relatedTargetId, valueBinding] of Object.entries(bindings)) {
    let relatedTarget = controller[relatedTargetId];
    if (!target)
      throw `Error : [HtmlFormTemplate, formBindings] No element '${targetId}' in controller. Binding fail`;

    for (let [value, newState] of Object.entries(valueBinding)) {
      let hasValue = new RegExp(value).test(target.value);
      // Apply newState for value
      for (let [attrName, attrValue] of Object.entries(newState)) {
        if (typeof attrValue == 'boolean') {
          relatedTarget.toggleAttribute(attrName, Boolean(!hasValue ^ attrValue));
        } else {
          if (hasValue) relatedTarget.setAttribute(attrName, attrValue);
          else relatedTarget.toggleAttribute(attrName, false);
        }
      }
    }
  }
};
/**
 * Play bindings of the CustomForm
 * @param {Object} formBindings of a CustomForm
 * @param {*} controller of this CustomForm
 */
function playBindings(formBindings, controller) {
  // console.debug('T (playBindings) <-');
  for (let [id] of Object.entries(formBindings)) {
    controller[id]?.dispatchEvent(new Event('change'));
  }
}

/**
 * An iterator that yield template leafs and associated value of source
 *
 * ```
 * let template = { p1: "foo", p2: ["bar","baz"], p3: "abc"  };
 * let source   = { p1: "value1", p2: ["value2", "value3"], other_prop: "value4" };
 *
 * templateIterator(template, source);
 * // yield ["foo", "value1"]
 * // yield ["bar", "value2"]
 * // yield ["baz", "value3"]
 * ```
 *
 * @param {*} template
 * @param {*} source
 * @returns the iterator over leafs and associated values of source
 */
function* templateIterator(template, source) {
  if (!source) return;
  if (typeof template == 'string') {
    // An id
    yield [template, source];
  } else if (template instanceof Object) {
    for (let key in template) {
      yield* templateIterator(template[key], source[key]);
    }
  }
}

/**
 * An iterator that yield leafs of an object$
 * Leaf are described as properties values that are not object
 * @param {Object} object
 * @returns the iterator over the leafs
 */
function* leafOf(object) {
  if (!object) return;
  for (let [key, value] of Object.entries(object)) {
    if (typeof value != 'object') yield value;
    else yield* leafOf(object[key]);
  }
}

/**
 * Build a new object from a template
 *
 * The result will have the same structure as `template` but each
 * leafs will be the result to the call of `callbackFn` with the value of
 * the template leaf as argument
 *
 * ```
 * let template = { foo: "value1", bar: ["value2", "value3"] };
 *
 * let res = generateResult(template, callbackFn);
 *
 * res = {
 *      foo: callbackFn("value1")
 *      bar: [
 *          callbackFn("value2"),
 *          callbackFn("value3")
 *     ]
 * }
 * ```
 * @param {Object} template of the object
 * @param {Function} callbackfn the function to call on template leaf to get value
 * @returns the object created from template and callbackFn
 */
function generateResult(template, callbackfn) {
  let recur = (template) => {
    let result;
    if (typeof template == 'string') {
      // An id
      result = callbackfn(template);
    }
    if (template instanceof Array) {
      result = [];
      for (let element of template) {
        let res = recur(element);
        if (res) result.push(res);
      }
      if (result.length != 0) result = undefined;
    } else if (template instanceof Object) {
      result = {};
      for (let propertie in template) {
        let res = recur(template[propertie]);
        if (res) result[propertie] = res;
      }
      if (Object.keys(result).length == 0) result = undefined;
    }
    return result;
  };

  return recur(template);
}

class CustomForm extends HTMLElement {
  #focus_element;

  constructor() {
    super();
    this.htmlController = undefined;
    this.addEventListener('keyup', (event) => {
      if (event.key == 'Enter') {
        this.dispatchEvent(new Event('submit'));
        event.stopPropagation();
      }
    });
  }

  /**
   * Fill this element from the given template
   * @param {Object} template of the form
   * @param {Object} fragmentSet the associated fragmentSet
   */
  setTemplate(template, fragmentSet) {
    if (!template?.htmlJsonTemplate) throw new Error('No htmlJsonTemplate in HtmlFormTemplate');
    this.textContent = '';
    this.submitTemplate = template.submitTemplate;
    this.displayTemplate = template.displayTemplate;
    this.displayFragmentSet = template.displayFragmentSet;
    this.formBindings = template.formBindings;

    let [body, controller] = HtmlJsonTemplate.build(template.htmlJsonTemplate, fragmentSet);
    this.htmlController = controller;

    this.htmlController[template.submitBtn]?.addEventListener('click', () => {
      this.dispatchEvent(new Event('submit'));
    });

    this.#focus_element = this.htmlController[template.focusElement];

    if (this.formBindings) setBindings(this.formBindings, this.htmlController);
    this.appendChild(body);
  }

  /** Called when focused, focus the focus_element specified in template by default   */
  focus() {
    if (this.#focus_element) this.#focus_element.focus();
    else super.focus();
  }

  /**
   * Clear the form. Send an event that can cancel this action
   * @returns true if it was cleared, false if it was canceled
   */
  clear() {
    let clear = this.dispatchEvent(new Event('clear', { cancelable: true }));
    if (!clear) return false;

    // Iterate over ids of inputs (leafs of submitTemplate) and clear associated inputs
    for (let inputId of leafOf(this.submitTemplate)) this.htmlController[inputId].value = undefined;

    // Replay bindings
    if (this.formBindings) playBindings(this.formBindings, this.htmlController);
    this.dispatchEvent(new Event('cleared'));
    return true;
  }

  /**
   * Disable all fields of the form
   * @param {Boolean} state false to enable
   */
  disable(state = true) {
    if (state != (this.getAttribute('disabled') != null)) {
      this.toggleAttribute('disabled', state);
    }

    for (let element of Object.values(this.htmlController)) {
      element.toggleAttribute('disabled', state);
    }
  }

  /**
   * Set all field on read only mode
   * @param {Boolean} state false to remove read only mode
   */
  readOnly(state = true) {
    if (state != (this.getAttribute('readonly') != null)) {
      this.toggleAttribute('readonly', state);
    }

    for (let element of Object.values(this.htmlController)) {
      element.toggleAttribute('readonly', state);
    }
  }

  // Getter / Setter
  set value(newValue) {
    if (!this.clear() || !newValue) return;
    let errors = [];
    for (let [elementId, value] of templateIterator(this.submitTemplate, newValue)) {
      let input = this.htmlController[elementId];
      if (!input) continue;
      try {
        input.value = value || '';
      } catch (e) {
        errors = errors.concat(e);
      }
    }
    if (this.formBindings) setBindings(this.formBindings, this.htmlController);
    if (errors.length) throw errors;
  }

  get value() {
    let error = false;

    if (!this.submitTemplate) return undefined;

    let values = {};

    let res = generateResult(this.submitTemplate, (id) => {
      if (values[id] != undefined) return values[id];
      let result;
      try {
        let formElement = this.htmlController[id];
        result = formElement.getAttribute('hidden') == null ? formElement.value : null;
        if (!result && formElement.getAttribute('required') != null) {
          if (
            this.dispatchEvent(
              new CustomEvent('required', { cancelable: true, bubbles: false, detail: formElement })
            )
          ) {
            error = true;
          }
        }
        if (formElement.hasAttribute('error')) {
          error = true;
        }
      } catch (e) {
        console.error(e);
        console.error(`Missing element '${id}' when generating result`);
        result = `ERROR : Missing element '${id}' when generating result`;
      }
      values[id] = result;
      return result;
    });
    if (error) throw res;
    return res;
  }

  /** Build the display according to the displayTemplate in the form template */
  getDisplay(value) {
    if (!this.displayTemplate) return document.createDocumentFragment();
    let displayFragmentSet = this.displayFragmentSet || {};
    displayFragmentSet = JSON.parse(JSON.stringify(displayFragmentSet));
    displayFragmentSet.$ = {};

    for (let [id, subValue] of templateIterator(this.submitTemplate, value)) {
      displayFragmentSet[id] = displayFragmentSet[id] || { textContent: subValue };
      displayFragmentSet.$[id] = subValue;
    }

    let res = HtmlJsonTemplate.build(this.displayTemplate, displayFragmentSet);
    return res;
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.disable(newValue != null);
        break;
      case 'readonly':
        this.readOnly(newValue != null);
        break;
    }
  }

  static get observedAttributes() {
    return ['disabled', 'readonly'];
  }
}

customElements.define('custom-form', CustomForm);

export { templateIterator, generateResult };
