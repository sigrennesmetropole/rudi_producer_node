"use strict";

/**
 * This module provide methods to use HtmlJsonTemplate
 * An HtmlJsonTemplate is a JSON object that describe an
 * HTML structure. Its purpose it to be use it to create 
 * HTMLElements from it. In the HtmlJsonTemplate you can
 * specify an id for elements. When you create the elements
 * from the template you get a controller.
 * The controller is an Object use as a key value pair
 * structure which for each id gives you the reference to
 * the associated HTMLElement in the DOM.
 * @module HtmlJsonTemplate
 * @author Florian Desmortreux
 */


/**
 * Deep clone an object
 * @param {*} object to clone
 * @returns the clone
 */
function deepClone(object) {
    if (object instanceof Array) {
        let res = [];
        for (let cell of object) res.push(deepClone(cell));
        return res;
    }
    else if (object instanceof Object) {
        let res = {}
        for (let key in object) res[key] = deepClone(object[key]);
        return res;
    } else return object;
}

/**
 * Merge template_fragment in template
 * Change value of param template.
 * Assign value of template_fragment to template but
 * but merge the value of array at the same properties path
 * @param {*} template to merge into
 * @param {*} template_fragment to merge in template
 * @returns template
 */
function merge(template, template_fragment) {
    for (let [key, value] of Object.entries(template_fragment)) {
        if (template[key]) {
            if (value instanceof Array && template[key] instanceof Array) {
                for (let cell of value) template[key].push(cell);
            } else if (value instanceof Object) {
                merge(template[key], template_fragment[key]);
            } else template[key] = template_fragment[key];
        } else {
            template[key] = template_fragment[key];
        }
    }

    return template;
}

/**
 * Create a new template, where properties of template fragment
 * are merge in template. A property already in template
 * will be overwritten except if it is an array where
 * the final property will be the concatenation of
 * the two arrays.
 * @param {*} template the base template 
 * @param {*} template_fragment the template fragment
 * @returns the new template
 */
function mergeFragment(template, template_fragment) {
    let res = deepClone(template);
    return merge(res, template_fragment);
}

function resolveFragment(id, fragmentSet) {
    let fragment = fragmentSet?.[id];
    if (!fragment) return undefined;

    // Only one
    if (typeof fragment == 'string') fragment = fragmentSet[fragment];
    
    fragment = resolveFragmentData(fragment, fragmentSet);
    return fragment;    
}

function resolveFragmentData(fragment, fragmentSet) {

    function resolveFragmentDataRecur(fragment) {
        for (let [key,value] of Object.entries(fragment)) {
            if (typeof value == 'string') {
                if (value.charAt(0) == '$') {
                    fragment[key] = fragmentSet.$?.[value.substring(1)]; 
                }
            } else resolveFragmentDataRecur(fragment[key]);
        }
    }

    if (fragment instanceof Object) resolveFragmentDataRecur(fragment);
    return fragment; 
}

function fragmentOf(fragmentSet, id) {
    if (fragmentSet instanceof Array) {
        let res = {};
        for (let set of fragmentSet) {
            let fragment = resolveFragment(id, set);
            if (fragment) Object.assign(res, fragment);
        }
        return res;
    } else if (fragmentSet instanceof Object) {
        return resolveFragment(id, fragmentSet);
    }
}

/**
 * Build a HTMLElement from an Object template
 * For any element in this tempalte, merge
 * fragment with same id from the fragmentSet
 * in the template before building.
 * Adds any identified elements to controller.
 * @param {Object} template of the element
 * @param {Object} fragmentSet 
 * @param {Object} controller 
 * @returns the builded HTMLElement
 */
function buildElement(template, controller, fragmentSet) {
    
    function buildElementChild(template){
        if (!template.tag) throw "No tag in template"

        // Check control
        let isControllable = template.id?.charAt(0) == '@';
        let id = (isControllable) ? template.id.substring(1) : template.id;

        if (id) {
            let fragment = fragmentOf(fragmentSet, id);
            template = (fragment) ? mergeFragment(template, fragment) : template;
            // if (fragment) console.log(id, "\n", template);
        }

        // Create Element
        let element = document.createElement(template.tag);
            
        // Set classes
        if (template.class) {
            for (let c of template.class) element.classList.add(c);
        }

        // Set attr
        if (template.attr) {
            for (let [key, value] of Object.entries(template.attr))
            if (typeof value == 'boolean') element.toggleAttribute(key, value);
            else element.setAttribute(key, value);
        }

        // Add textContent
        if (template.textContent) {
            element.textContent = template.textContent;
        }
        // Children
        else if (template.children && template.children instanceof Object) {
            for (let child of template.children)
                element.appendChild(buildElementChild(child));
        }

        // init func
        if (template.init) {
            for (let [func_name, args] of Object.entries(template.init)) {
                let func = element[func_name];
                if (element[func_name]) func.apply(element, args);
                else {
                    throw new Error(template.tag + " " + id + " has no method " + func_name);
                }
            }
        }

        if (isControllable) controller[id] = element;

        return element;
    }

    return buildElementChild(template);
}

/**
 * Build a HTMLElement from a given template
 * @param {Object|Array} template of the HTMLElement
 * @returns the builded HTMLElement 
 */
function build(template, fragmentSet=undefined) {
    let controller = {};
    let _fragSet = deepClone(fragmentSet);
    
    if (template instanceof Array) {
        let frag = document.createDocumentFragment();
        for (let i = 0; i < template.length; i++) {
            frag.appendChild(buildElement(template[i], controller, _fragSet));
        }

        return [frag, controller];
    } else {
        let element = buildElement(template, controller, _fragSet);
        return [element, controller];
    }
}

export default { build };