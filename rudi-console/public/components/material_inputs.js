/* eslint-disable no-undef */
"use strict";


const material_icons_font = new FontFace('Material Icons', 'url(./font/material_icons.woff2)', {
    style: "normal",
    weight: 400
});

document.fonts.add(material_icons_font);

// Créer quelque CSS à appliquer
let material_icons_style = document.createElement('style');
let selectMixin_style = document.createElement('style');
let matFormElement_style = document.createElement('style');
let baseInput_style = document.createElement('style');
let baseTextInput_style = document.createElement('style');
let date_style = document.createElement('style');
let select_style = document.createElement('style');
let datalist_style = document.createElement('style');
let textarea_style = document.createElement('style');
let card_style = document.createElement('style');
let cardBlock_style = document.createElement('style');
let textarea_cardsBlock_style = document.createElement('style');
let option_cardsBlock_style = document.createElement('style');
let fileInput_style = document.createElement('style');
let checkbox_style = document.createElement('style');
let map_style = document.createElement('style');

let theme = `
:host {
    --primary-rgb: 33, 150, 243;
    --text-rgb: 0, 0, 0;
    --error-color: 176, 0, 32;
    --background-color: 255, 255, 255;
}
`;

let icon_style = `
/* Icons */
i.material-icons {
    width: 1em;
    height: 1em;
    vertical-align: middle;
    font-size: 1.5em;
    color: rgba(var(--text-rgb), 0.6);
}


action-icon::part(icon),
action-icon-list::part(icon) {
    color: inherit;
    padding: 0.125em;
}

action-icon,
action-icon-list {
    cursor: pointer; 
    border-radius: 0.2em;
    user-select: none;
}

action-icon:hover,
action-icon:focus,
action-icon-list:hover,
action-icon-list:focus { 
    background-color: rgba(var(--text-rgb), 0.1);
}

/* Disabled & Readonly */

action-icon[readonly],
action-icon-list[readonly] {
    cursor: default;
    color: rgba(var(--text-rgb), 0.2);
}

action-icon[disabled]:hover,
action-icon-list[disabled]:hover,
action-icon[readonly]:hover,
action-icon-list[readonly]:hover {
    cursor: default;
    background: none;
}

`
material_icons_style.textContent = `
.material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}
`;


selectMixin_style.textContent = `
div.options_wrapper {
    display: none;
    position: absolute;
    z-index: 1001;
    flex-direction: column;
    
    max-height: 70vh;
    min-height: 3.5em;
    min-width: 100%;
    
    box-shadow: 0 5px 5px -3px rgb(0 0 0 / 20%), 0 8px 10px 1px rgb(0 0 0 / 14%), 0 3px 14px 2px rgb(0 0 0 / 12%);
    overflow-y: auto;
    background-color: rgb(var(--background-color));
}

div.options_wrapper[opened] {
    display: block;
}

div.options_wrapper option-div {
    display: flex;
    gap: 0.5em;
    box-sizing: border-box;
    white-space: nowrap;
    padding: 0 1em;
    height: 3em;
    line-height: 3em;
    background-color: rgb(var(--background-color));
    user-select: none;
}

div.options_wrapper option-div:hover {
    background-color: rgba(var(--text-rgb), 0.04);
}

div.options_wrapper option-div:focus { outline: none; }
div.options_wrapper option-div[tabindex="0"] { background-color: rgba(var(--text-rgb), 0.08); }
div.options_wrapper option-div:active {
    background-color: rgba(var(--text-rgb), 0.16);
}

:host([readonly]) i.material-icons.after {
    color: rgba(var(--text-rgb), 0.4);
}

div.options_wrapper option-div[disabled] {
    color: rgba(var(--text-rgb), 0.5);
}
`

matFormElement_style.textContent = theme + icon_style + `
div.wrapper {
    width: 100%;
    box-sizing: border-box;
    font-size: inherit;
    min-width: fit-content;
}

/* Required star */
:host(:not([required])) span.required_star {
    display: none;
}

span.required_star {
    color: red;
    white-space: pre;
}
`

baseInput_style.textContent = `
div.wrapper {
    position: relative;
    width: 100%;
    padding-top: 0.5em;
    box-sizing: border-box;
    font-size: inherit;
    display: flex;
    flex-direction: column;
}

/* Content */
.content {
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    outline: none;

    border: solid 1px;
    border-color: rgba(var(--text-rgb), 0.6);
    border-radius: 4px;
    
    background-color: transparent;
    box-shadow: none;
    
    color: rgba(var(--text-rgb), 0.87);
    font-family: inherit;
    font-size: inherit;
    
    transition: border 0.2s, box-shadow 0.2s;
}

:host([label]) {
    border-top-color: transparent;
}

/* Label */
span.label_wrapper {
    display: none;
}

:host([label]) span.label_wrapper {
    z-index: 2;
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    max-height: 100%;
    
    border-color: rgba(var(--text-rgb), 0.6);

    color: rgba(var(--text-rgb), 0.6);
    cursor: text;

    transition: color 0.2s;
    pointer-events: none;
    user-select: none;
}

label, span.required_star {
    overflow: hidden;
    font-size: 0.8em;
    line-height: 1em;
    font-weight: 500;
    transition: font-size 0.2s, line-height 0.2s;
}

/* Corners */
span.label_wrapper::before {
    margin-right: 4px;
    border-left: solid 1px transparent;
    border-radius: 4px 0;
}

span.label_wrapper::after {
    flex-grow: 1;
    margin-left: 4px;
    border-right: solid 1px transparent;
    border-radius: 0 4px;
}


span.label_wrapper::before,
span.label_wrapper::after {
    content: "";
    display: block;
    box-sizing: border-box;
    height: 10px;
    min-width: calc(1em - 4px);
    margin-top: 0.5em;

    border-top: solid 1px;
    border-top-color: rgba(var(--text-rgb), 0.6);
    
    pointer-events: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

/* Helper */

div.helper_wrapper {
    display: block;
    line-height: 1.2em;
    padding-left: 0.8em;
}

div.helper_wrapper span {
    display: block;
    color: rgba(var(--text-rgb), 0.6);
    font-size: 0.8em;
    line-height: inherit;
}

/* Focus */

div.wrapper:focus-within .content {
    border-color: rgb(var(--primary-rgb));
    box-shadow: 
        inset 1px 0 rgb(var(--primary-rgb)),
        inset 0 1px rgb(var(--primary-rgb)),
        inset -1px 0 rgb(var(--primary-rgb)),
        inset 0 -1px rgb(var(--primary-rgb));
}

:host([label]) div.wrapper:focus-within .content {
    border-top-color: transparent;
    box-shadow: 
        inset 1px 0 rgb(var(--primary-rgb)),
        inset -1px 0 rgb(var(--primary-rgb)),
        inset 0 -1px rgb(var(--primary-rgb));
}

div.wrapper:focus-within span.label_wrapper label {
    color: rgb(var(--primary-rgb));
}

div.wrapper:focus-within span.label_wrapper::before, 
div.wrapper:focus-within span.label_wrapper::after {
    border-top: solid 1px;
    border-top-color: rgb(var(--primary-rgb));
    box-shadow: inset 0 1px rgb(var(--primary-rgb));
}

/* Error */

:host([error]) div.wrapper .content {
    border-color: rgb(var(--error-color));
    caret-color: rgb(var(--error-color));
}

:host([label]) div.wrapper .content {
    border-top-color: transparent;
}

:host([error]) div.wrapper span.label_wrapper label {
    color: rgb(var(--error-color)); 
}

:host([error]) div.wrapper span.label_wrapper::before, 
:host([error]) div.wrapper span.label_wrapper::after {
    border-top: solid 1px;
    border-top-color: rgb(var(--error-color));
}

:host([error]) div.wrapper:focus-within span.label_wrapper::before, 
:host([error]) div.wrapper:focus-within span.label_wrapper::after {
    box-shadow: inset 0 1px rgb(var(--error-color));
}


:host([error]) div.helper_wrapper span {
    color: rgb(var(--error-color)); 
}

:host([error]) div.wrapper:focus-within .content {
    box-shadow: 
        inset 1px 0 rgb(var(--error-color)),
        inset 0 1px rgb(var(--error-color)),
        inset -1px 0 rgb(var(--error-color)),
        inset 0 -1px rgb(var(--error-color));
}

:host([error][label]) div.wrapper:focus-within .content {
    box-shadow: 
        inset 1px 0 rgb(var(--error-color)),
        inset -1px 0 rgb(var(--error-color)),
        inset 0 -1px rgb(var(--error-color));
}

/* Disabled & Readonly */

:host([disabled]) .content,
:host([disabled]) label {
    color: rgba(var(--text-rgb), 0.6) !important;
}

:host([disabled]) .content {
    border-color: rgba(var(--text-rgb), 0.4);
    border-top-color: transparent;
}

:host([disabled]) span.label_wrapper::before,
:host([disabled]) span.label_wrapper::after {
    border-top: 1px solid;
    border-top-color: rgba(var(--text-rgb), 0.4) !important;
}

/* Thin borders */

:host([thin-borders]) div.wrapper .content,
:host([thin-borders]) span.label_wrapper::before,
:host([thin-borders]) span.label_wrapper::after {
    box-shadow: none !important;
}

`;

baseTextInput_style.textContent = `

/* Input */

.content {
    height: 3.5em;
    padding: 0 0.75em 0 1em;
    line-height: 1.5em;
    text-indent: 0.1em; /* Fix for j being cut by inputs */
    caret-color: rgb(var(--primary-rgb));
}

/* Placeholder-shown */
div.wrapper:not(:focus-within) .content:placeholder-shown,
div.wrapper:not(:focus-within) .content:placeholder-shown {
    border-top-color: rgba(var(--text-rgb), 0.6);
}

div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper label,
div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper span.required_star {
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 1em;
    line-height: 4.5em;
    font-weight: 400;
}

.content:placeholder-shown + span.label_wrapper::before, 
.content:placeholder-shown + span.label_wrapper::after {
    border-top: none;
}

/* Icons */
i.material-icons {
    display: none;
    position: absolute;
    top: 1em;
    right: 0.5em;
}

i.before {
    left: calc(2/3 * 1em);
}

i.after {
    right: 0.5em;
}

/* Error */

:host([error]) div.wrapper .content {
    padding-right: 2.3em;
}

:host([error]) i.after {
    display: block;
    color: rgb(var(--error-color));
}

:host([error]) div.wrapper:not(:focus-within) .content:placeholder-shown {
    border-top-color: rgb(var(--error-color));
}

/* Disabled */

:host([disabled]) .content:placeholder-shown {
    border-color: rgba(var(--text-rgb), 0.4) !important;
}

/* Read Only */
:host([readonly]) div.wrapper:focus-within .content:placeholder-shown {
    border-top: 1px solid rgb(var(--primary-rgb));
    box-shadow: 
        inset 1px 0 rgb(var(--primary-rgb)),
        inset 0 1px rgb(var(--primary-rgb)),
        inset -1px 0 rgb(var(--primary-rgb)),
        inset 0 -1px rgb(var(--primary-rgb));
}

:host([readonly][error]) div.wrapper:focus-within .content:placeholder-shown {
    border-top: 1px solid rgb(var(--error-color));
    box-shadow: 
        inset 1px 0 rgb(var(--error-color)),
        inset 0 1px rgb(var(--error-color)),
        inset -1px 0 rgb(var(--error-color)),
        inset 0 -1px rgb(var(--error-color));
}

:host([readonly]) .content:placeholder-shown + span.label_wrapper label,
:host([readonly]) .content:placeholder-shown + span.label_wrapper span.required_star {
    font-size: 1em;
    line-height: 4.5em;
    font-weight: 400;
}
`;

date_style.textContent = `
.content {
    padding-left: 3em;
}

input::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 1.5em;
    left: 1em;
    width: 1.5em;
    height: 1.5em;
    opacity: 0;
    margin: 0;
    padding: 0;
    cursor: pointer;
    z-index: 2;
}

:host([readonly]) input::-webkit-calendar-picker-indicator {
    display: none;
}

:host i.before {
    display: block;
}
`

select_style.textContent = `

/* Select */ 

.content {
    padding-right: 2.3em;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

i.after {
    display: block;
    color: rgb(var(--text-rgb));
}

.wrapper {
    position: realtive;
}



:host(selectm-input) div.options_wrapper option-div:before {
    content: 'check_box_outline_blank';
    line-height: 2em;
    font-family: 'Material Icons';
    font-size: 1.5em;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

:host(selectm-input) div.options_wrapper option-div[selected]:before {
    content: 'check_box';
}
`;

datalist_style.textContent = `

/* Data list */ 

.content {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.wrapper {
    position: realtive;
}

div.data_list_wrapper {
    display: none;
    position: absolute;
    z-index: 100;
    left: 0;
    
    max-height: 70vh;
    min-height: 3.5em;
    min-width: 100%;
    
    box-shadow: 0 5px 5px -3px rgb(0 0 0 / 20%), 0 8px 10px 1px rgb(0 0 0 / 14%), 0 3px 14px 2px rgb(0 0 0 / 12%);
    overflow-y: auto;
    background-color: rgb(var(--background-color));
}

.content[data_list_shown] ~ div.data_list_wrapper {
    display: block;
}

div.data_list_wrapper data-div {
    display: none;
    gap: 0.5em;
    padding: 0 1em;
    height: 3em;
    line-height: 3em;
    background-color: rgb(var(--background-color));
    user-select: none;
}

div.data_list_wrapper data-div[show] { display : flex }

div.data_list_wrapper data-div:hover {
    background-color: rgba(var(--text-rgb), 0.04);
}

div.data_list_wrapper data-div[focused] { 
    outline: none; 
    background-color: rgba(var(--text-rgb), 0.08);
}
div.data_list_wrapper data-div:active {
    background-color: rgba(var(--text-rgb), 0.16);
}

:host(selectm-input) div.data_list_wrapper data-div:before {
    content: 'check_box_outline_blank';
    line-height: 2em;
    font-family: 'Material Icons';
    font-size: 1.5em;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

:host(selectm-input) div.data_list_wrapper data-div[selected]:before {
    content: 'check_box';
}
`;

textarea_style.textContent = `
.wrapper {
    height: 100%;
}

textarea.content {
    height: 6em;
    line-height: 1em;
    padding: 0.5em 0.5em 0.5em 0.5em;
}

:host([no-resize]) textarea {
    resize: none;
}

div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper label,
div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper span.required_star {
    line-height: 4em;
}

`;

card_style.textContent = theme + icon_style + `

.wrapper {
    display: flex;
    position: relative;
    overflow: hidden;
    height: 100%;
    border-radius: 3px;
    background-color: rgb(var(--background-color));
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 14%),
    0 3px 1px -2px rgb(0 0 0 / 12%),
    0 1px 5px 0 rgb(0 0 0 / 20%);
}

:host([cornered]) .wrapper::before {
    content: '';
    position: absolute;
    background-color: gray;
    width: 1.5em;
    height: 1.5em;
    top: 0;
    right: 0;
    transform: translate(50%, -50%) rotate(45deg);
}

/* body */

slot {
    display: block;
    flex: 1 1;
    padding: 1em 0em 1em 1em;
    min-width: 0;
    overflow: hidden;
}

/* Actions */

div.actions {
    flex: 0 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 1em 0.5em 1em 0.5em;
    
}

div.actions > * {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
}

action-icon-list {
    position: relative;
}

action-icon-list div.option_wrapper {
    right: 0;
}

/* Disabled */
:host([disabled]) {
    color: rgba(var(--text-rgb), 0.4) !important;
}
`;

cardBlock_style.textContent = `
.content {
    display: flex;
    min-height: 5em;
    padding: 1em;
    align-items: center;
    gap: 1em;
}

div.helper_wrapper {
    padding-left: 1em;
}

.cardgrid {
    flex-grow: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px,1fr));
    grid-auto-rows: 1fr;
    place-items: stretch;
    column-gap: 1em;
    row-gap: 1em;
}


label, span.required_star {
    font-size: 1em;
}


action-card {
    min-width: 0;
    max-width: 100%;
    min-height: 3.5em;
}

`;

textarea_cardsBlock_style.textContent = `

.cardgrid {
    grid-template-columns: repeat(auto-fill, minmax(300px,1fr));
}

action-card[focused] {
    grid-area: 1 / 1 / 3 / -1;
}

textarea-input {
    width: 100%;
    --primary-rgb: 0,0,0;   
}

textarea-input::part(textarea) {
    height: 100%;
    min-height: 8em;
}

`;

option_cardsBlock_style.textContent = `
action-card span.name {
    display: block;
    min-height: 1.5em;
    word-wrap: break-word;
    display: flex;
    height: 100%;
    align-items: center;
}
`;

fileInput_style.textContent = `

action-card {
    position: relative;
    height: fit-content;
}

action-card span.name {
    display: block;
    min-height: 1.5em;
    word-wrap: break-word;
}

action-card div.info {
    display: flex;
    justify-content: space-between;
    color: rgba(var(--text-rgb), 0.6);
    font-size: 0.8em;
    line-height: inherit;
}

action-card div.info span {
    white-space: nowrap;
}

action-card div.progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 0.2em;
    width: 100%;
}

action-card div.progress::after {
    content:'';
    display: block;
    height: 100%;
    background-color: rgb(var(--primary-rgb));
    width: var(--progress, 0%);
}

.content { position: relative; }

.content .dragging_zone {
    position: absolute;
    top: 0.6em;
    left: 0.5em;
    width: calc(100% - 1em);
    height: calc(100% - 1em);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: 2px dashed rgb(var(--text-rgb));
    border-radius: 5px;
}

.content .dragging_zone span {
    pointer-events: none;
    font-size: 3em;
    display: block;
}

.content:not([dropping]) .dragging_zone {
    display: none;
}

`;

checkbox_style.textContent = `
div.wrapper {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding-top: 0.5em;
    height: 4em;
    align-items: center;
}
    
}

action-icon::part(icon) {
    user-select: none;
    cursor: pointer;
}

action-icon[checked] {
    color: var(--primary-color);
}

/* Box left */

:host([box-left]) div.wrapper {
    flex-direction: row-reverse;
}

/* Hover */

action-icon:hover,
action-icon:focus {
    background: none;
}

action-icon:hover,
action-icon:focus {
    color: var(--accent-color);   
}

/* Disabled & Readonly */

action-icon[disabled], action-icon[readonly] {
    color: inherit;
}

/* Error */
:host([error]) action-icon::part(icon) {
    color: red;
}
`

map_style.textContent = `
:host {
    display: flex;
    flex-direction: column;
    height: 300px;
}

.wrapper {
    flex: 1;
    width: 100%;
}

.content {
    height: 100%;
}

.content > div {
    margin: 0.5em 1px 1px 1px;
    height: calc(100% - 0.5em - 1px);
}

action-icon, action-icon:hover, action-icon:focus {
    color: rgb(var(--text-rgb));
    background: white;
}

:host([fullscreen]) {
    height: 70vh;
}
`

/** A mixin for element that has a list of selectable options */
let SelectMixin = superclass => class extends superclass {

    constructor() {
        super();

        // Options wrapper
        this.options_wrapper = document.createElement('div');

        this.findKey = undefined;
        this.findedIndex = -1;

        // Events
        this.addEventListener('keydown', (e) => {
            if (/^[a-zA-Z0-9-]$/.test(e.key)) {
                let entries = Array.from(this.option_by_id.entries());
                if (this.findKey == e.key) {
                    this.findedIndex += 1;
                } else {
                    this.findKey = e.key;
                    this.findedIndex = 0;
                }

                let findedValues = entries.filter((entry) => { return entry[1].name.toLowerCase().startsWith(e.key) });
                if (findedValues.length == 0) return;
                if (!this.focusedOption) this.showOptions();
                if (this.findedIndex > findedValues.length - 1) this.findedIndex = 0;
                
                this.focusOption(this.option_div.get(findedValues[this.findedIndex][0]));
            }

            if (this.focusedOption) {
                switch (e.key) {
                    case "Escape": this.hideOptions(); break;
                    case "Enter": 
                        this.select(this.focusedOption);
                        e.preventDefault();
                        break;
                    case "ArrowDown": this.focusNext(); e.preventDefault(); break;
                    case "ArrowUp"  : this.focusPrevious(); e.preventDefault(); break;
                }
            } else if (e.key == "Enter") {
                this.click();
                e.preventDefault();
            } 
        });
    }

    /** Show the options 
     * @return true if shown, false otherwise
    */
    showOptions() {
        // Check state
        if (this.attributes.readonly || this.attributes.disabled) return false;
        this.focusedOption = this.selectedOption || this.firstOpt;
        if (!this.focusedOption) return false;
        
        this.options_wrapper.toggleAttribute('opened', true);

        this.focusOption(this.focusedOption, true);

        this.options_wrapper.style.top = "";
        this.options_wrapper.style.bottom = "";
        this.options_wrapper.style.right = "";
        this.options_wrapper.style.left = "";
        let wrapper_br = this.getBoundingClientRect();
        let opt_br = this.options_wrapper.getBoundingClientRect();
        
        if (wrapper_br.bottom + opt_br.height > window.innerHeight) { // Bottom overflow
            if (wrapper_br.top - opt_br.height < 0) { // Top overflow
                this.options_wrapper.style.top = `calc(-${wrapper_br.top}px + 15vh)`;
            } else this.options_wrapper.style.bottom = wrapper_br.height + "px";
        } else this.options_wrapper.style.top = wrapper_br.height + "px";

        if (opt_br.right > window.innerWidth) {
            this.options_wrapper.style.right = "-" + (window.innerWidth - wrapper_br.right - 50) + "px";
        } else  this.options_wrapper.style.left = "0px";
        this.addEventListener('focusout', () => {
            // Check if not already closed
            if (this.focusedOption) this.hideOptions(); 
        }, {once: true});

        return true;
    }

    /** Hide the options */
    hideOptions() {
        this.options_wrapper.toggleAttribute('opened', false);
        this.focusOption(this.selectedOption || this.firstOpt);    // Focus for next time option shown
        this.focusedOption = undefined;     // Tracks the option wrapper show/hide state     
    }

    /** Focus the option after the current focused option */
    focusNext() {
        if (this.focusedOption.nextElementSibling) 
            this.focusOption(this.focusedOption.nextElementSibling);
    }
    
    /** Focus the option before the current focused option */
    focusPrevious() {
        if (this.focusedOption.previousElementSibling) 
            this.focusOption(this.focusedOption.previousElementSibling);
    }

    /** Focus the given option */
    focusOption(option, preventScroll) {
        this.focusedOption?.setAttribute('tabindex', -1);
        this.focusedOption = option; 
        this.focusedOption.setAttribute('tabindex', 0);
        this.focusedOption.focus({preventScroll:preventScroll});
    }

    /** Format options to be a normalize object
     * @param {Array|Object} options to format
     * @return {Map} the object representing options
     */
    formatOptions(options) {
        let res = new Map();
        if (Array.isArray(options)) {
            for (let opt of options) {
                if (typeof opt == "object") {
                    res.set(this.getId(opt.value), { name: opt.name, value: opt.value });
                } else res.set(this.getId(opt), {name: opt, value: opt} );
            }
        } else {
            for (let [value, name] of Object.entries(options)) {
                res.set(this.getId(value), { name: name, value: value });
            }
        }
        return res;
    }

    /** Change the currents options
     * @param {Array|Object} newOptions the new opt
     */
    setOptions(newOptions) {
         // Empty options wrapper
        this.options_wrapper.innerHTML = "";

        this.option_by_id = this.formatOptions(newOptions);
        this.option_div = new Map();

        // Populate options wrapper
        let frag = document.createDocumentFragment();
        for (let [id, opt] of this.option_by_id.entries()) {
            let opt_div = this.createOption(opt.value, opt.name);
            frag.appendChild(opt_div);
            this.option_div.set(id, opt_div);
        }
        this.options_wrapper.appendChild(frag);
        this.firstOpt = this.options_wrapper.children.item(0);
    }

    /** Create on option for the list */
    createOption(value, name, disabled) {
        let option = document.createElement('option-div');
        option.value = value;
        option.name = name;
        option.setAttribute('tabindex', -1);
        option.toggleAttribute('disabled', Boolean(disabled));
        let span = document.createElement('span');
        span.textContent = name;
        option.appendChild(span);

        // Event : Select this option
        option.onclick = (e) => {
            this.focusOption(option)
            this.select(option);
            e.stopPropagation();
        }

        return option;
    }

    /** Return an id for a value
     * Should always return the same id for
     * the same value
     */
    getId(value) {
        return (typeof value == "object") ? JSON.stringify(value) :value;
    }

    /** Return the option div with the given value */
    getOption(value) {
        return this.option_div.get(this.getId(value));
    }

    /** Return the name of given value */
    getName(value) {
        return this.option_by_id.get(this.getId(value))?.name;
    }

    /** Select the given option */
    select(option) {
        this.selectedOption = (typeof option == "string") ? this.getOption(option) : option;
        this.selectedOption.toggleAttribute('selected', true);
    }
}

class ActionIcon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});

        // Icon
        this.icon = document.createElement('i');
        this.icon.classList.add('material-icons');
        this.icon.setAttribute('part', 'icon');
        this.icon.style = "display: block;";
        
        
        // Wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('wrapper');
        this.wrapper.appendChild(this.icon);

        // Append elements 
        this.shadowRoot.appendChild(material_icons_style.cloneNode(true));
        this.shadowRoot.appendChild(this.wrapper);

        // Events
        this.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'Enter':
                    this.click();
                    break;
            }
        });

        this.addEventListener('click', (e) => { e.stopPropagation(); this.action(); });
    }

    /** Set the callback when click */
    setAction(func) { this.func = func; }

    /** Execute the action */
    action() {
        if (this.attributes.disabled || this.attributes.readonly) return;
        if (this.func) this.func();
    }

    /** Set icon content */
    setIcon(name) { this.icon.textContent = name; }

    /** Disable icon (state=true -> disable, state=false -> enable) */
    disable = (state=true) => {
        if (state) this.toggleAttribute('tabindex', false);
        else if (!this.attributes.readonly) this.setAttribute('tabindex', 0);
    }
        
    /** Readonly icon (state=true -> readonly, state=false -> editable) */
    readonly = (state=true) => {
        if (state) this.toggleAttribute('tabindex', false);
        else if (!this.attributes.disabled) this.setAttribute('tabindex', 0);
    }

    // Lifecycle
    connectedCallback() {
        if (this.getAttribute('tabindex') == null) this.setAttribute('tabindex', 0);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'disabled' : this.disable(newValue != null);       break;
            case 'readonly' : this.readonly(newValue != null);      break;
        }
    }

    static get observedAttributes() { 
        return ['disabled', 'readonly']; 
    }
}

class ActionIconList extends SelectMixin(ActionIcon) {
    constructor() {
        super();

        // Options wrapper
        this.options_wrapper.classList.add('options_wrapper');
        this.wrapper.appendChild(this.options_wrapper);
        this.wrapper.style.position = 'relative';

        // Append element
        this.shadowRoot.appendChild(selectMixin_style.cloneNode(true));
    }

    action() {
        this.showOptions();
    }

    select(option) {
        super.select(option);
        if (this.func) this.func(this.selectedOption.value, this.selectedOption.name);
        if (this.focusedOption) this.hideOptions();
    }
    
    // Lifecycle
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'options': {
                // Parse options
                let newOptions;
                try { newOptions = JSON.parse(newValue) } 
                catch (e) { 
                    console.error(e);
                    break;
                } 

                this.setOptions(newOptions); break;
            }            
            default: super.attributeChangedCallback(name, oldValue, newValue)
        }
    }
    
    static get observedAttributes() { 
        return ['disabled', 'readonly', 'options']; 
    }
}

class MatFormElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});

        // Create label
        let label_wrapper = document.createElement('span');
        label_wrapper.classList.add('label_wrapper');
        this.label = document.createElement('label');
        let required_star = document.createElement("span");
        required_star.classList.add("required_star");
        required_star.appendChild(document.createTextNode(' ✱'));
        label_wrapper.appendChild(this.label);
        label_wrapper.appendChild(required_star);

        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('wrapper');     
        this.wrapper.appendChild(label_wrapper);
        
        // Append elements
        this.shadowRoot.appendChild(material_icons_style.cloneNode(true));
        this.shadowRoot.appendChild(matFormElement_style.cloneNode(true));
        this.shadowRoot.appendChild(this.wrapper);
    }

    /** Clear the current value */
    clear() { this.value = ""; this.setError(false); }

    /** Toggle error state to true
     * @param {String} errMsg a message to display
     */
    setError(state) { this.toggleAttribute('error', state); }

    /** Disable or enable the input 
     * @param state, true => disable, false => enable
    */
    disable(state=true) { 
        if (state != (this.getAttribute('disabled') != null)) {
            this.toggleAttribute("disabled", state);
        }
    }

     /** Makes input readonly or editable 
      * @param state, true => readonly, false => editable
     */
    readonly(state=true) { 
        if (state != (this.getAttribute('readonly') != null)) {
            this.toggleAttribute("readonly", state);
        }
    }

    // Lifecycle
    connectedCallback() {
        let value_attr = this.getAttribute('value');
        if (value_attr) this.value = value_attr;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'label'    : this.label.textContent = newValue;    break;
            case 'disabled' : this.disable(newValue != null);       break;
            case 'readonly' : this.readonly(newValue != null);      break;
        }
    }

    static get observedAttributes() { 
        return ['label', 'disabled', 'readonly', 'required']; 
    }
} 

class BaseInput extends MatFormElement {
    constructor() {
        super();
        
        // Create helper
        let helper_wrapper = document.createElement('div')
        helper_wrapper.classList.add('helper_wrapper');
        this.helper = document.createElement('span');
        helper_wrapper.appendChild(this.helper);
        
        // Append elements
        this.shadowRoot.appendChild(baseInput_style.cloneNode(true));
        this.wrapper.appendChild(helper_wrapper);
    }

    /** Toggle error state to true
     * @param {String} errMsg a message to display
     */
    setError(errMsg) {
        let state = Boolean(errMsg);
        super.setError(state);
        this.helper.textContent = (state) ? errMsg : this.getAttribute('helper');
    }

    // Lifecycle
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'helper'   : this.helper.textContent = newValue;   break;
            default: super.attributeChangedCallback(name, oldValue, newValue);
        }
    }

    static get observedAttributes() { 
        return ['label', 'helper', 'disabled', 'readonly', 'required']; 
    }
}

class BaseTextInput extends BaseInput {
    constructor() {
        super();

        // Create input
        this.input = document.createElement('input');
        this.input.classList.add("content");
        this.input.addEventListener('change', () => { this.dispatchEvent(new Event('change')); });
        
        // Create icon
        this.icon_after = document.createElement('i');
        this.icon_after.classList.add("after");
        this.icon_before = document.createElement('i');
        this.icon_before.classList.add("before");
        this.icon_after.classList.add('material-icons');
        this.icon_before.classList.add('material-icons');
        
        // Edit wrapper
        this.shadowRoot.appendChild(baseTextInput_style.cloneNode(true));
        this.wrapper.prepend(this.input);
        this.wrapper.appendChild(this.icon_before);
        this.wrapper.appendChild(this.icon_after);
    }

    /** Disable or enable the input 
     * @param state, true => disable, false => enable
    */
    disable(state=true) { this.input.toggleAttribute("disabled", state); }

    /** Makes input readonly or editable 
     * @param state, true => readonly, false => editable
     */
    readonly(state=true) { this.input.toggleAttribute("readonly", state); }

    focus(options) {
        this.input.focus(options);
    }

    // Getters / Setters
    set value(newValue) { this.input.value = newValue; }
    get value() { 
        if (this.attributes.required && !this.input.value) {
            this.setError("Champs requis");
        } else {
            this.setError(false);
        }
        return this.input.value;
    }

    // Lifecycle
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'error'    : {
                if (newValue != null) {
                    this.icon_after_content = this.icon_after.textContent;
                    this.icon_after.textContent = "error";  
                } else this.icon_after.textContent = this.icon_after_content;
                break;
            }
            case 'size':
                if (newValue) this.input.setAttribute('size', newValue);
                else this.input.removeAttribute('size');
                break;
            default: super.attributeChangedCallback(name, oldValue, newValue);
        }
    }

    static get observedAttributes() { 
        return ['label', 'helper', 'error', 'disabled', 'readonly', 'required', 'size']; 
    }
}

class TextInput extends BaseTextInput {
    constructor() {
        super();
        this.input.setAttribute("placeholder", " ");
        this.input.addEventListener("blur", () => { this.value = this.input.value });
    }
}

class NumberInput extends BaseTextInput {
    constructor() {
        super();
        this.input.setAttribute("placeholder", " ");
        this.input.setAttribute('type', 'number');
        this.input.setAttribute('step', 1);
        this.input.addEventListener("blur", () => { this.value = this.input.value });
    }
}

class DateInput extends BaseTextInput {
    constructor() {
        super();
        this.shadowRoot.appendChild(date_style.cloneNode(true));
        this.input.setAttribute('type', 'date');
        this.icon_before.textContent = "event";
        this.input.addEventListener("blur", () => { this.value = this.input.value });
    }

    // Getters / Setters
    set value(newValue) { this.input.value = newValue.substring(0,10); }
    get value() { 
        if (this.attributes.required && !this.input.value) {
            this.setError("Champs requis");
        } else {
            this.setError(false);
        }
        return this.input.value;
    }
}

class SelectInputs extends SelectMixin(BaseTextInput) {
    constructor() {
        super();
        // Setup
        this.input.setAttribute("placeholder", " ");
        this.shadowRoot.appendChild(select_style.cloneNode(true));
        this.shadowRoot.appendChild(selectMixin_style.cloneNode(true));
        this.input.readOnly = true;
        this.icon_after.textContent = "arrow_drop_down";

        // Options wrapper
        this.options_wrapper.classList.add('options_wrapper');
        this.wrapper.appendChild(this.options_wrapper);

        this.addEventListener('click', () => { this.showOptions(); });
    }

    showOptions() {
        if (super.showOptions()) {
            // Change state
            this.icon_after.textContent = "arrow_drop_up";
        }
    }

    hideOptions() {
        super.hideOptions();
        // Change state
        this.icon_after.textContent = "arrow_drop_down";
        this.input.focus({preventScroll:true});
    }

    // Lifecycle
    connectedCallback() {
        let options = this.getAttribute('options');
        if (!options && !this.option_div) this.setOptions([]);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'options': {
                if (!newValue) return;
                
                // Parse options
                let newOptions;
                try { newOptions = JSON.parse(newValue) } 
                catch (e) { 
                    console.error(e);
                    this.setError('Bad options'); // TODO Change
                    break;
                } 

                this.setOptions(newOptions); break;
            }            
            default: super.attributeChangedCallback(name, oldValue, newValue)
        }
    }
    
    static get observedAttributes() { 
        return ['label', 'helper', 'error', 'disabled', 'readonly', 'required', 'size', 'options']; 
    }

}

class SelectInput extends SelectInputs {
    constructor() {
        super();
    }

    set value(newValue) {
        if (newValue) {
            let opt_div = this.getOption(newValue);
            if (!opt_div) throw "New value not is not in options";
            this.select(opt_div);
        } else this.select(this.options_wrapper.children.item(0));
    }

    get value() { 
        if (this.attributes.required && !this._value) {
            this.setError("Champs requis");
        } else {
            this.setError(false);
        }
        return this._value;
    }

    /** Change the currents options
     * @param {Array} newOptions the new opt
     */
    setOptions(newOptions, noEmpty = false) {
        if (!noEmpty) {
            if (Array.isArray(newOptions)) newOptions = [''].concat(newOptions);
            else newOptions = Object.assign({ 0: "" }, newOptions);
        }
        super.setOptions(newOptions);
        this.selectedOption = this.firstOpt;
        this.select(this.selectedOption);
        this.setError(false);
    }

    /** Select the given option */
    select(option) {
        // Toggle previous selected option
        if (!this.selectedOption) return "";
        this.selectedOption.toggleAttribute('selected', false);
        super.select(option);
        this._value = this.selectedOption.value;        
        this.input.value = this.selectedOption.name;
        if (this.focusedOption) this.hideOptions();
        this.dispatchEvent(new Event('change'));
    }

}

class SelectMultipleInput extends SelectInputs {
    constructor() {
        super();
        this._value = new Set();
    }

    clear() { 
        for (let opt of this.options_wrapper.children) opt.toggleAttribute('selected', false);
        this._value.clear();
        this.setError(false);
        this.input.value = "";
    }

    set value(newValue) {
        // Reset
        this.clear();
        if (typeof newValue == "string"){ try { newValue = JSON.parse(newValue);} catch {throw "New value format is incorrect (json array is expected)"}}
        let opt_div;
        for (let val of newValue) {
            if (!val) continue;
            opt_div = this.getOption(val);
            if (!opt_div) throw `New value '${val}' is not in options of '${this.getAttribute('label') || ""}'`;
            opt_div.toggleAttribute('selected', true);
            this._value.add(opt_div.name);
        }
        this.input.value = Array.from(this._value).join(', ');
    }

    get value() { 
        let val = Array.from(this._value);
        if (this.attributes.required && !val.length) {
            this.setError("Champs requis");
        } else {
            this.setError(false);
        }
        return (val.length)? val : undefined; 
    }


    createOption(value, name, disabled) {
        let option = document.createElement('option-div');
        option.value = value;
        option.name = name;
        option.setAttribute('tabindex', -1);
        option.toggleAttribute('disabled', Boolean(disabled));
        option.setAttribute('checkbox', "check_box_outline_blank");
        let span = document.createElement('span');
        span.appendChild(document.createTextNode(name));
        option.appendChild(span);

        // Event : Select this option
        option.addEventListener('click', (e) => { 
            this.select(option);
            e.stopPropagation();
        });
        return option;
    }

    /** Select the given option */
    select(option) {
        this.selectedOption = option;
        let present = this.selectedOption.toggleAttribute('selected');
        if (present) this._value.add(option.name);
        else this._value.delete(option.name);
        this.input.value = Array.from(this._value).join(', ');
    }

}

class DataListInput extends BaseTextInput {
    constructor() {
        super();
        // Setup
        this.input.setAttribute("placeholder", " ");
        this.shadowRoot.appendChild(datalist_style.cloneNode(true));

        // Options wrapper
        this.data_list_wrapper = document.createElement('div');
        this.data_list_wrapper.classList.add('data_list_wrapper');
        this.wrapper.appendChild(this.data_list_wrapper);

        this.findKey = undefined;
        this.findedIndex = -1;

        // Events
        this.wrapper.addEventListener('keyup', (e) => {
            if (/^[a-zA-Z0-9-]$/.test(e.key)) {
                this.updateDatalist(false)
                return;
            } else {
                switch (e.key) {
                    case "Escape": if (this.data_list_shown) this.hideDataList(); e.preventDefault(); break;
                    case "Enter": 
                        this.select();
                        e.preventDefault();
                        break;
                    case "Backspace": this.updateDatalist(); break;
                    case "Delete"   : this.updateDatalist(); break;
                    case "ArrowDown": this.focusNext(); e.preventDefault(); break;
                    case "ArrowUp"  : this.focusPrevious();  e.preventDefault(); break;
                }
            }
        });
        this.wrapper.addEventListener('click', () => { 
            this.addEventListener('focusout', () => { // DO NOT SET EVENT TO WRAPPER !!
                if (this.data_list_shown) this.hideDataList(); // Check if not already closed
            }, {once: true});
        });
    }

    /** Update the data list from input value
     * @param clear true by default. If false search new match from previous match list 
     */
    updateDatalist(clear=true) {
        this.clearFocus();
        let entries;
        if (clear) entries = Array.from(this.data_name.entries()); 
        else       entries = this.findedData;
        
        
        // Hide all
        entries.map((entry) => { this.data_div.get(entry[0]).toggleAttribute("show", false); })
        
        // Search for match and show
        this.findedData = entries.filter((entry) => { return entry[1].toLowerCase().startsWith(this.input.value) });
        if (this.findedData.length == 0) this.hideDataList();
        else {
            for (let entrie of this.findedData) {
                this.data_div.get(entrie[0]).toggleAttribute("show", true);
            }
            this.showDataList();
        }
    }

    /** Show the data list */
    showDataList() {
        // Check state
        if (this.attributes.readonly || this.attributes.disabled) return;

        // Change state
        this.input.toggleAttribute('data_list_shown', true);
        this.data_list_shown = true;
        
        // TODO Overflow and positionnig of options
        this.data_list_wrapper.style.top = "";
        this.data_list_wrapper.style.bottom = "";
        let wrapper_br = this.wrapper.getBoundingClientRect();
        let opt_br = this.data_list_wrapper.getBoundingClientRect();
        
        if (wrapper_br.bottom + opt_br.height > window.innerHeight) { // Bottom overflow
            if (wrapper_br.top - opt_br.height < 0) { // Top overflow
                this.data_list_wrapper.style.top = `calc(-${wrapper_br.top}px + 15vh)`;
            } else this.data_list_wrapper.style.bottom = "4em";
        } else this.data_list_wrapper.style.top = "4em";
        
    }

    /** Hide the data list */
    hideDataList() {
        this.clearFocus();

        // Change state
        this.input.toggleAttribute('data_list_shown', false);
        this.data_list_shown = false;
        
    }

    /** Focus the option after the current focused data */
    focusNext() {
        if (!this.focusedData) this.focusOption(this.data_div.get(this.findedData[0][0]));
        else if (this.focusedData.nextElementSibling) 
        this.focusOption(this.focusedData.nextElementSibling);
    }
    
    /** Focus the option before the current focused data */
    focusPrevious() {
        if (!this.focusedData) this.focusOption(this.data_div.get(this.findedData[this.findedData.length-1][0]));
        else if (this.focusedData.previousElementSibling) 
            this.focusOption(this.focusedData.previousElementSibling);
    }

    /** Focus the given option (Not real focus) */
    focusOption(option) {
        this.focusedData?.toggleAttribute('focused', false);
        this.focusedData = option; 
        this.focusedData.toggleAttribute('focused', true);
    }

    /** Remove the focus from options */
    clearFocus() {
        this.focusedData?.toggleAttribute('focused', false);
        this.focusedData = undefined;
    }

    /** Format data list to be a normalize object
     * @param {Array|Object} options to format
     * @return {Map} the object representing options
     */
     formatDataList(options) {
        if (Array.isArray(options)) {
            let res = new Map();

            for (let opt of options) {
                res.set(opt,opt);
            }
            return res;
        } else {
            return new Map(Object.entries(options));
        }
    }

    /** Change the currents data list
     * @param {Array|Object} newDataList the new opt
     */
    setDataList(newDataList) {
         // Empty options wrapper
        this.data_list_wrapper.innerHTML = "";

        this.data_name = this.formatDataList(newDataList);
        this.data_div = new Map();

        // Populate options wrapper
        let frag = document.createDocumentFragment();
        for (let [value, name] of this.data_name.entries()) {
            let opt_div = this.createData(value, name);
            frag.appendChild(opt_div);
            this.data_div.set(value, opt_div);
        }
        this.data_list_wrapper.appendChild(frag);

        this.findedData = Array.from(this.data_name.entries());
    }

    /** Create on option for the list */
    createData(value, name, disabled) {
        let option = document.createElement('data-div');
        option.value = value;
        option.name = name;
        option.setAttribute('tabindex', -1);
        option.toggleAttribute('disabled', Boolean(disabled));
        option.appendChild(document.createTextNode(name));

        // Event : Select this option
        option.onclick = (e) => {
            this.select(option);
            e.stopPropagation();
        }

        return option;
    }

    /** Select the given option */
    select() {
        if (this.focusedData) this.input.value = this.focusedData.name;
        this.hideDataList();
    }

    // Lifecycle
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'data': {
                // Parse options
                let newOptions;
                try { newOptions = JSON.parse(newValue) } 
                catch (e) { 
                    console.error(e);
                    this.setError('Bad options'); // TODO Change
                    break;
                } 

                this.setDataList(newOptions); break;
            }
            
            default: super.attributeChangedCallback(name, oldValue, newValue)
        }
    }
    
    static get observedAttributes() { 
        return ['label', 'helper', 'error', 'disabled', 'readonly', 'required', 'data']; 
    }
}

class TextareaInput extends BaseTextInput {
    constructor() {
        super();
        this.shadowRoot.appendChild(textarea_style.cloneNode(true));
        let newInput = document.createElement('textarea')
        newInput.classList.add("input", "content");
        this.input.replaceWith(newInput);
        this.input = newInput;
        this.input.setAttribute("placeholder", " ");
        this.input.setAttribute("part", "textarea");
        this.input.addEventListener("blur", () => { this.value = this.input.value });
    }    
}

class ActionCard extends HTMLElement {
    constructor() {
        super();
        let shadow = this.attachShadow({mode: 'open'});
        
        // Create slot
        this.slot_ = document.createElement('slot');
        
        // Create action
        this.actions = document.createElement('div');
        this.actions.classList.add('actions');

        // Create wrapper
        this.wrapper = document.createElement("div");
        this.wrapper.classList.add("wrapper");
        this.wrapper.appendChild(this.slot_);
        this.wrapper.appendChild(this.actions);
    
        // Append element to card
        shadow.appendChild(card_style.cloneNode(true));
        shadow.appendChild(this.wrapper);
    }

    /** Add an action to card */
    addAction(iconName, action) {
        let action_i = document.createElement('action-icon');
        action_i.setIcon(iconName);
        action_i.setAction(() => { action(this); });
        this.actions.appendChild(action_i);
        // Prevent card to take focus when deleting it
        action_i.addEventListener('focusin', (e) => { e.stopPropagation() });
    }

    /** Disable card (state=true -> disable, state=false -> enable) */
    disable(state) {
        for (let action of this.actions.children) 
            action.toggleAttribute('disabled', state);
        let event = new Event('disable');
        event.state = state;
        this.dispatchEvent(event);
    }

    /** Readonly card (state=true -> readonly, state=false -> editable) */
    readonly(state) {
        for (let action of this.actions.children) 
            action.toggleAttribute('readonly', state);
        let event = new Event('readonly');
        event.state = state;
        this.dispatchEvent(event);
    }

    // Lifecycle 
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'disabled' : this.disable(newValue != null);  break;
            case 'readonly' : this.readonly(newValue != null); break;
        }
    }

    static get observedAttributes() { 
        return ['disabled', 'readonly']; 
    }
}

class CardsBlock extends BaseInput {
    constructor() {
        super();
        
        this.cards = [];

        // Create card grid
        this.cardgrid = document.createElement('div');
        this.cardgrid.classList.add('cardgrid');
        
        // Create content
        this.content = document.createElement('div');
        this.content.classList.add('content');
        this.content.appendChild(this.cardgrid);
        
        this.addEventListener('blur', () => this.dispatchEvent(new Event('change')));
        
        // Append elements
        this.shadowRoot.appendChild(cardBlock_style.cloneNode(true));
        this.wrapper.prepend(this.content);
    }

    clear() { 
        for (let card of this.cards) card.remove();
        this.setError(false);
        this.cards = [];
    }

    set value(newValue) {
        // Reset
        this.clear();
        if (typeof newValue == "string"){ 
            try { newValue = JSON.parse(newValue);} 
            catch { throw "New value format is incorrect (json array is expected)" }
        }
        for (let val of newValue) {
            this.addCard(val);
        }
        this.dispatchEvent(new Event('change'));
    }

    get value() {
        let value = [];
        for (let card of this.cards) {
            let val = card.getValue();
            if (val) value.push(val);
        }
        if (this.attributes.required && !value.length)
            this.setError("Champ requis");
        else this.setError(false);
        return (value.length) ? value : undefined;
    }

    /**
     * Add a card to the grid with meta
     * @param {*} value the value of the card
     */
    addCard(value=undefined) {
        let card = this.createCard(value);
        if (this.attributes.readonly) card.readonly();
        
        this.cards.push(card);
        this.cardgrid.appendChild(card);
        card.focus();
        return card;
    }

    /** Return a new card
     * @param {*} value the value of the card
     */
    createCard() {
        let card = document.createElement('action-card');
        card.addAction('close', (card) => { this.removeCard(card) });
        card.getValue = () => { return "" }
        card.addEventListener('click', (e) => { e.stopPropagation(); } );
        
        return card;
    }

    /**
     * Remove the card
     * @param {*} card the card
     */
    removeCard(card) {
        card.remove(); 
        this.cards = this.cards.filter((c) => { return c != card; });
    }

    disable(state=true) {
        for (let card of this.cards) card.disable(state);
    }
    
    readonly(state=true) {
        for (let card of this.cards) card.readonly(state);
    }
}

class TextareaCardsBlock extends CardsBlock {
    constructor() {
        super();

        // Create icon
        this.add_card = document.createElement('action-icon-list');
        this.add_card.setIcon('add');
        this.add_card.classList.add("addCard");
        this.add_card.setAction((value, name) => {
            if (!this.attributes.disabled && !this.attributes.readonly) 
                this.addCard({ lang: value }, name);
        });
        this.content.addEventListener('click', () => { this.add_card.click(); });

        // Append element
        this.content.appendChild(this.add_card);
        this.shadowRoot.appendChild(textarea_cardsBlock_style.cloneNode(true));
        
        // Events
        this.addEventListener('blur', () => {
            this.focusedCard?.toggleAttribute('focused', false);
        });
    }

    createCard(value, name=undefined) {
        let card = super.createCard();
        
        let textarea = document.createElement('textarea-input');
        textarea.toggleAttribute('thin-borders', true);
        textarea.toggleAttribute('no-resize', true);
        textarea.setAttribute('label', this.getLabel(name || this.add_card.getName(value.lang)));
        textarea.value = value.text || "";
        card.appendChild(textarea);

        card.getValue = () => { return (textarea.value) ? { lang: value.lang, text: textarea.value }: undefined; }
        card.addEventListener('disable', (e) => { textarea.toggleAttribute('disabled', e.state); })
        card.addEventListener('readonly', (e) => { textarea.toggleAttribute('readonly', e.state); })
        card.addEventListener('focusin', () => {
            this.focusedCard?.toggleAttribute('focused', false);
            this.focusedCard = card; 
            this.focusedCard.toggleAttribute('focused', true);
        });
        card.focus = () => { textarea.focus(); }
        return card;
    }

    disable(state=true) {
        super.disable(state);
        this.add_card.toggleAttribute('disabled', state);
    }

    readonly(state=true) {
        super.readonly(state);
        this.add_card.toggleAttribute('readonly', state);
    }

    /** Create a label from name and returns it */
    getLabel(name) {
        return 'Langage: ' + name;
    }

    setOptions(options) {
        this.add_card.setOptions(options);
    }

    // Lifecycle
    connectedCallback() {
        let options = this.getAttribute('options');
        if (!this.add_card.option_div) {
            if (!options) this.add_card.setOptions([]);
            else {
                try {
                    this.add_card.setOptions(JSON.parse(options));
                } catch {
                    // Nothing
                }
            }
        }
    }

}

class OptionCardsBlock extends CardsBlock {
    constructor() {
        super();

        // Create icon
        this.add_card = document.createElement('action-icon-list');
        this.add_card.setIcon('add');
        this.add_card.classList.add("addCard");
        this.add_card.setAction((value, name) => {
                this.addCard(value, name);
        });
        this.content.addEventListener('click', () => { this.add_card.click(); });

        // Append element
        this.content.appendChild(this.add_card);
        this.shadowRoot.appendChild(option_cardsBlock_style.cloneNode(true));
    }

    createCard(value, name) {
        let card = super.createCard();

        // Create content
        let span = document.createElement('span');
        span.classList.add('name');
        span.textContent = name || this.add_card.getName(value);

        // Append element
        card.appendChild(span);

        card.getValue = () => { return value }
        return card;
    }

    disable(state) {
        super.disable(state);
        this.add_card.toggleAttribute('disabled', state);
    }

    readonly(state) {
        super.readonly(state);
        this.add_card.toggleAttribute('readonly', state);
    }

    /** Focus the given option (Not real focus) */
    focus(card) {
        this.focusedCard?.toggleAttribute('focused', false);
        this.focusedCard = card; 
        this.focusedCard.toggleAttribute('focused', true);
    }

    setOptions(newOptions) { this.add_card.setOptions(newOptions); }
    
    // Lifecycle
    connectedCallback() {
        let options = this.getAttribute('options');
        if (!options && !this.add_card.option_div) this.add_card.setOptions([]);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'options': {
                // Parse options
                let newOptions;
                try { newOptions = JSON.parse(newValue) } 
                catch (e) { 
                    console.error(e);
                    this.setError('Bad options'); // TODO Change
                    break;
                } 

                this.add_card.setOptions(newOptions); break;
            }            
            default: super.attributeChangedCallback(name, oldValue, newValue)
        }
    }

    static get observedAttributes() { 
        return ['label', 'helper', 'disabled', 'readonly', 'required', 'options']; 
    }
}

class FilesInput extends CardsBlock {
    constructor() {
        super();
        
        // Create file input
        let input_file = document.createElement('input');
        input_file.setAttribute('type', 'file');
        input_file.toggleAttribute('multiple');
        input_file.style.display = "none";

        // Create icon
        this.add_card = document.createElement('action-icon');
        this.add_card.setIcon("download");
        this.add_card.setAction(() => {
            input_file.click();
        });
        this.content.addEventListener('click', () => { this.add_card.click(); });

        // Handle files
        input_file.onchange = () => {
            let filelist = input_file.files;
            for (var i = 0; i < filelist.length; i++) {
                this.addCard(filelist[i]);
            }
        }

        // Dragging
        let dragging_zone = document.createElement('div');
        dragging_zone.classList.add('dragging_zone');
        let span = document.createElement('span');
        span.textContent = "+";
        dragging_zone.appendChild(span);

        this.content.addEventListener('dragenter', () => { this.content.toggleAttribute('dropping', true); });
        dragging_zone.addEventListener('dragover', (ev) => { ev.preventDefault(); });
        let drag_reset = () => { this.content.toggleAttribute('dropping', false); }
        dragging_zone.addEventListener('dragleave', drag_reset);
        dragging_zone.addEventListener('drop', (ev) => {
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
            drag_reset();
            let filelist = ev.dataTransfer.files;
            for (var i = 0; i < filelist.length; i++) {
                this.addCard(filelist[i]);
            }
        });

        // Append element
        this.content.appendChild(this.add_card);
        this.content.appendChild(dragging_zone);
        this.shadowRoot.appendChild(fileInput_style.cloneNode(true));
    }

    humanReadableByteCountSI(bytes) {
        let si = ["k","M","G","T","P","E"];
        let i = 0;
        while (bytes <= -999_950 || bytes >= 999_950) {
            bytes /= 1000;
            i++;
        }
        return `${Math.round(bytes/10) / 100.0} ${si[i]}o`;
    }

    createCard(value) {
        let card = super.createCard();

        if (!(value instanceof File)) card.toggleAttribute('cornered', true);

        // Create content
        let name = document.createElement('span');
        name.classList.add('name');
        name.textContent = value.name || "";
        
        let info = document.createElement('div');
        info.classList.add('info');
        let type = document.createElement('span');
        type.textContent = value.type;
        let size = document.createElement('span');
        size.textContent = this.humanReadableByteCountSI(value.size);
        info.appendChild(type);
        info.appendChild(size);

        let progress = document.createElement('div');
        progress.classList.add('progress');
        
        // Append element
        card.appendChild(name);
        card.appendChild(info);
        card.appendChild(progress);

        card.getValue = () => { 
            return value
        }
        return card;
    }

    setProgress(index, progress) {
        let card = this.cards[index];
        if (!card) return;
        card.style.setProperty('--progress', progress);
    }

    disable(state) {
        super.disable(state);
        this.add_card.toggleAttribute('disabled', state);
    }

    readonly(state) {
        super.readonly(state);
        this.add_card.toggleAttribute('readonly', state);
    }
}

class Checkbox extends MatFormElement {
    constructor() {
        super();

        this.check_icon = document.createElement('action-icon');
        this.check_icon.setIcon('check_box_outline_blank');
        this.check_icon.classList.add("checkbox");
        this.check_icon.setAction(() => {
            this.value = !this.checked;
        });

        // Append Element
        this.shadowRoot.appendChild(checkbox_style.cloneNode(true));
        this.wrapper.appendChild(this.check_icon);
    }

    disable(state=true) { 
        super.disablestate 
        this.check_icon.toggleAttribute('disabled', state);
    }

    readonly(state=true) { 
        super.readonly(state);
        this.check_icon.toggleAttribute('readonly', state);
    }

    set value(newValue) {
        this.checked = Boolean(newValue);
        this.check_icon.toggleAttribute('checked', this.checked);
        if (newValue) {
            this.check_icon.setIcon('check_box');
        } else {
            this.check_icon.setIcon('check_box_outline_blank');
        }
        this.dispatchEvent(new Event('change'));
    }

    get value() {
        return this.checked;
    }

    // Lifecycle
    connectedCallback() {
        let value_attr = this.getAttribute('value');
        this.value = Boolean(value_attr);
    }
}

class MapInput extends BaseInput {
    constructor() {
        super();
        let link1 = document.createElement('link');
        let link2 = document.createElement('link');
        link1.setAttribute('rel', 'stylesheet');
        link2.setAttribute('rel', 'stylesheet');
        link1.setAttribute('href', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        link2.setAttribute('href', 'https://cdn.rawgit.com/Leaflet/Leaflet.draw/v1.0.4/dist/leaflet.draw.css');

        this.shadowRoot.appendChild(link1);
        this.shadowRoot.appendChild(link2);
        

        this.map = document.createElement('div');        
        let content = document.createElement('div');
        content.classList.add('content');
        content.appendChild(this.map);
        this.wrapper.appendChild(content);
        this.shadowRoot.appendChild(map_style.cloneNode(true));

        this.currentLayer = undefined;
        this.drawnItems = undefined;
        this.drawControlFull = undefined;
        this.drawControlEditOnly = undefined;
        this.fullscreen = false;
        this.fullScreenBtn = undefined;

        this.map = L.map(this.map, {scrollWheelZoom: false});
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright" tabindex="-1">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Initialise the FeatureGroup to store editable layers
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        
        // Create a custom full screen btn control for the map
        var customControl =  L.Control.extend({        
            options: { position: 'bottomright' },
            // Add a full screen button
            onAdd: () => {
                this.fullScreenBtn = L.DomUtil.create('action-icon', 'leaflet-bar leaflet-control');
                this.fullScreenBtn.setIcon('fullscreen');
                
                this.fullScreenBtn.setAction(() => { this.toggleAttribute('fullscreen'); });
                
                return this.fullScreenBtn;
            }
        });
        
        // Basic controls
        this.drawControlFull = new L.Control.Draw({ edit: { featureGroup: this.drawnItems }, draw: { polyline: false, circle: false, marker: false, circlemarker: false } });
        this.drawControlEditOnly = new L.Control.Draw({ edit: { featureGroup: this.drawnItems }, draw: false });
        
        this.map.addControl(this.drawControlFull);
        this.map.addControl(new customControl());
        
        // Event handlers
        this.map.on('draw:created', (e) => {
            this.currentLayer = e.layer
            this.drawnItems.addLayer(this.currentLayer);

            this.map.removeControl(this.drawControlFull);
            this.map.addControl(this.drawControlEditOnly);
            this.dispatchEvent(new Event('change'))
        });

        this.map.on("draw:deleted", (e) => {
            if (Object.keys(e.layers._layers).length === 0) return;
            this.map.removeControl(this.drawControlEditOnly);
            this.map.addControl(this.drawControlFull);
            this.currentLayer = undefined;
            this.dispatchEvent(new Event('change'))
        });

        this.map.on("draw:edited", (e) => {
            this.currentLayer = Object.values(e.layers._layers)[0];
            this.dispatchEvent(new Event('change'))
        });
    }

    /** Toggle fullscreen mode for map */
    setFullScreen(state=true){
        if (state){
            this.fullScreenBtn.setIcon('fullscreen_exit');
            this.map.scrollWheelZoom.enable();
            this.map.invalidateSize();
        } else {
            this.fullScreenBtn.setIcon('fullscreen');
            this.map.scrollWheelZoom.disable();
            this.map.invalidateSize();
        }
    }

    set value(geography) {
        if (this.currentLayer) this.drawnItems.removeLayer(this.currentLayer);
        else if (!this.attributes.disabled && !this.attributes.read_only) {
            this.map.removeControl(this.drawControlFull);
            this.map.addControl(this.drawControlEditOnly);
        }
        geography.geographic_distribution.properties = geography.geographic_distribution.properties || {};
        let geoJsonLayers = L.geoJson(geography.geographic_distribution);
        this.currentLayer = geoJsonLayers.getLayers()[0];
        this.drawnItems.addLayer(this.currentLayer);
        this.dispatchEvent(new Event('change'))
    }

    get value() {
        if (this.attributes.required && !this.currentLayer) {
            this.setError("Champ requis");
            return undefined;
        } else this.setError(false);
        if (!this.currentLayer) return undefined;

        let bounds = this.currentLayer.getBounds();
        return {
            bounding_box: {
                west_longitude: bounds._southWest.lng,
                east_longitude: bounds._northEast.lng,
                north_latitude: bounds._northEast.lat,
                south_latitude: bounds._southWest.lat
            },
            geographic_distribution: this.currentLayer.toGeoJSON(),
            projection: "WGS 84"
        }
    }

    clear() {
        if (!this.currentLayer) return;
        if (!this.attributes.disabled && !this.attributes.read_only) {
            this.map.removeControl(this.drawControlEditOnly);
            this.map.addControl(this.drawControlFull);
        }
        if (this.currentLayer) this.drawnItems.removeLayer(this.currentLayer);
        this.currentLayer = undefined;
        this.setError(false);
        this.dispatchEvent(new Event('change'))
    }

    disable(state=true) {
        if (state) {
            if (this.currentLayer) this.map.removeControl(this.drawControlEditOnly);
            else this.map.removeControl(this.drawControlFull);
            if (this.map.tap) this.map.tap.disable();
            this.map._container.setAttribute('tabindex', -1);
        } else {
            if (this.currentLayer) this.map.addControl(this.drawControlEditOnly);
            else this.map.addControl(this.drawControlFull);
            if (this.map.tap) this.map.tap.enable();
            this.map._container.setAttribute('tabindex', 0);
        }
    }

    readonly(state=true) {
        if (state) {
            if (this.currentLayer) this.map.removeControl(this.drawControlEditOnly);
            else this.map.removeControl(this.drawControlFull);
        } else {
            if (this.currentLayer) this.map.addControl(this.drawControlEditOnly);
            else this.map.addControl(this.drawControlFull);
        }
    }

    // Lifecycle
    connectedCallback() {
        let lat = this.getAttribute('lat') || 0;
        let lng = this.getAttribute('lng') || 0;
        let zoom = this.getAttribute('zoom') || 2;

        this.map.setView([lat, lng], zoom);
        setTimeout(() => { 
            this.map.invalidateSize();
        }, 1000);

        // Remove tabindex on a element
        this.map._controlContainer.lastElementChild.lastElementChild.firstElementChild.setAttribute('tabindex', -1);
        this.fullScreenBtn.setAttribute('tabindex', -1);
        let control = this.map._controlContainer.firstElementChild.children[0].children;
        for (let c of control) c.setAttribute('tabindex', -1);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'fullscreen' : this.setFullScreen(newValue != null);    break;
            default: super.attributeChangedCallback(name, oldValue, newValue);
        }
    }

    static get observedAttributes() { 
        return ['label', 'helper', 'disabled', 'readonly', 'required', 'fullscreen']; 
    }
}

// Define the new element
customElements.define('action-card', ActionCard);
customElements.define('action-icon', ActionIcon);
customElements.define('action-icon-list', ActionIconList);
customElements.define('text-input', TextInput);
customElements.define('number-input', NumberInput);
customElements.define('date-input', DateInput);
customElements.define('select-input', SelectInput);
customElements.define('selectm-input', SelectMultipleInput);
customElements.define('datalist-input', DataListInput);
customElements.define('textarea-input', TextareaInput);
customElements.define('textarea-cards-block', TextareaCardsBlock);
customElements.define('option-cards-block', OptionCardsBlock);
customElements.define('file-input', FilesInput);
customElements.define('checkbox-input', Checkbox);
customElements.define('map-input', MapInput);