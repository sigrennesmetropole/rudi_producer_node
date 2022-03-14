"use strict";

/**
 * Module to create a new form based on a HtmlFormTemplate
 * A HtmlFormTemplate is a extended version of a HtmlJsonTemplate
 * @module HtmlFormTemplate
 * @author Florian Desmortreux
 */

import HtmlJsonTemplate from "./HtmlJsonTemplate.js";

export default undefined;

function setBindings(formBindings, controller) {
    for (let [element1, bindings] of Object.entries(formBindings)) {
        element1 = controller[element1];
        element1.addEventListener('change', () => {
            for (let [element2, binding] of Object.entries(bindings)) {
                element2 = controller[element2];
                for (let [value, attrs] of Object.entries(binding)) {
                    let hasValue = (element1.value == value); 
                    for (let [attr, attr_value] of Object.entries(attrs)) {
                        if (typeof attr_value == 'boolean') {
                            element2.toggleAttribute(attr, Boolean(!hasValue ^ attr_value));
                        } else {
                            if (hasValue) element2.setAttribute(attr, attr_value);
                            else element2.toggleAttribute(attr, false);
                        }
                    } 
                }
            }
        });
        // Dispatch change event and remove error of required element
        element1.clear();
    }
}



class CustomForm extends HTMLElement {
    constructor(){
        super();
        this.htmlController = undefined;
        
        // Value
        this.value = undefined;
        this.style.display = "block";
    }

    setTemplate(template, fragmentSet) {
        if (!template.htmlJsonTemplate) throw "No htmlJsonTemplate in HtmlFormTemplate"
        this.textContent = "";
        this.sumbitTemplate = template.sumbitTemplate;

        let [body, controller] = HtmlJsonTemplate.build(template.htmlJsonTemplate, fragmentSet);
        this.htmlController = controller;

        if (template.formBindings) setBindings(template.formBindings, controller);
        this.appendChild(body);
    }

    clear() {
        if (!this.dispatchEvent(new Event('clear', { cancelable: true }))) return false;

        for (let id in this.htmlController) {
            let input = this.htmlController[id];
            if (input.clear) input.clear();
        }
        return true;
    }

    disable(state=true) {
        if (state != (this.getAttribute('disabled') != null)) {
            this.toggleAttribute("disabled", state);
        }

        for (let element of Object.values(this.htmlController)) {
            element.toggleAttribute("disabled", state);
        }
    }

    readOnly(state=true) {
        if (state != (this.getAttribute('readonly') != null)) {
            this.toggleAttribute("readonly", state);
        }

        for (let element of Object.values(this.htmlController)) {
            element.toggleAttribute("readonly", state);
        }
    }

    // Getter / Setter
    set value(value) {
        if (!this.clear()) return;

        let applyValue = (template, value) => {
            if (!value) return;
            if (typeof template == "string") { // An id
                let input = this.htmlController[template]
                if (!input) return;
                try { input.value = value; }
                catch (e) { console.error(`Error setting '${template}' value : `, value); throw e }
            }
            else if (template instanceof Object) {
                for (let key in template) {
                    applyValue(template[key], value[key]);
                }
            }
        }

        applyValue(this.sumbitTemplate, value);
    }

    get value() {
        let error= false;
        let generateResult = (template) => {
            var form_result;
            if (typeof template == "string") { // An id
                try {
                    form_result = (this.htmlController[template].getAttribute('hidden') == null) 
                        ? this.htmlController[template].value
                        : undefined;
                    if (!form_result && this.htmlController[template].getAttribute('required') != null) {
                        error = true;
                    }
                }
                catch (e) { 
                    console.error(`Missing element '${template}' when generating result`);
                    form_result = `ERROR : Missing element '${template}' when generating result`;
                }
                return form_result;
            }
            if (template instanceof Array) {
                form_result = [];
                for (let element of template) {
                    let result = generateResult(element);
                    if (result) form_result.push(result);
                }
                if (form_result.length != 0) return form_result;
                else return undefined;
            }
            else if (template instanceof Object) {
                form_result = {};
                for (let propertie in template) {
                    let result = generateResult(template[propertie]);
                    if (result) form_result[propertie] = result;
                }
                if (Object.keys(form_result).length != 0) return form_result;
                else return undefined;
            }
        }

        if (!this.sumbitTemplate) return undefined;
        let res = generateResult(this.sumbitTemplate);
        if (error) throw res;
        return res;
    }

    
    // Lifecycle
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'disabled'   : this.disable(newValue != null);   break;
            case 'readonly'   : this.readOnly(newValue != null);   break;
        }
    }

    static get observedAttributes() { 
        return ['disabled', 'readonly']; 
    }
    
}

customElements.define('custom-form', CustomForm);


