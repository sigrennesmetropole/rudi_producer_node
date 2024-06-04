/* eslint-disable no-undef */
'use strict'

/**
 * @author Florian Desmortreux
 */

const material_icons_font = new FontFace('Material Icons', 'url(./font/material_icons.woff2)', {
  style: 'normal',
  weight: 400
})

document.fonts.add(material_icons_font)

function createStyleElement(...styles) {
  let style = document.createElement('style')
  style.textContent = styles.join('')
  return style
}

let theme = `
/* ---- Theme Style ---- */
:host {
    --primary-rgb: 33, 150, 243;
    --text-rgb: 0,0,0;
    --error-color: 176, 0, 32;
    --background-color: 255, 255, 255;
}
`

let iconStyle = `
/* ---- Icon Style ---- */

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

/* Icons */
i.material-icons {
    width: 1em;
    height: 1em;
    vertical-align: middle;
    font-size: 1.5em;
    color: rgba(var(--text-rgb), 0.6);
    user-select: none;
}

i {
    display: block;
}
`

let actionIconStyle = `
/* ---- Action icon Style ---- */

:host::part(icon) {
    color: inherit;
    padding: 0.125em;
}

:host {
    cursor: pointer;
    border-radius: 0.2em;
    user-select: none;
    outline: none;
}

i {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    border-radius: 0.2em;
    outline: none;
}

:host(:hover),
:host(:focus) {
    background-color: rgba(var(--text-rgb), 0.1);
}

/* Disabled & Readonly */

:host([disabled]),
:host([readonly]) {
    cursor: default;
    color: rgba(var(--text-rgb), 0.5);
}

:host([disabled]),
:host([readonly]) {
    cursor: default;
    background: none;
}
`

let selectMixinStyle = `
/* ---- SelectMixin Style ---- */

:host {
    position: relative;
}

div.list_wrapper {
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

div.list_wrapper[opened] {
    display: block;
}

div.list_wrapper option-div {
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

div.list_wrapper option-div[hidden] {
    display: none;
}

div.list_wrapper option-div:hover {
    background-color: rgba(var(--text-rgb), 0.04);
}

div.list_wrapper option-div:focus { outline: none; }
div.list_wrapper option-div[tabindex="0"] { background-color: rgba(var(--text-rgb), 0.08); }
div.list_wrapper option-div:active {
    background-color: rgba(var(--text-rgb), 0.16);
}

:host([readonly]) i.material-icons.after {
    color: rgba(var(--text-rgb), 0.4);
}

div.list_wrapper option-div[disabled] {
    color: rgba(var(--text-rgb), 0.5);
}
`

let matFormElementStyle = `
/* ---- MatFormElement Style ---- */

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

let baseInputStyle = `
/* ---- BaseInput Style ---- */

div.wrapper {
    position: relative;
    width: 100%;
    padding-top: 0.5em;
    box-sizing: border-box;
    font-size: inherit;
    display: flex;
    flex-direction: column;
    min-width: 0;
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

/* Label & Required */

span.label_wrapper {
    display: none;
}

:host([label]) span.label_wrapper,
:host([required]) span.label_wrapper {
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

:host([label]) div.wrapper:focus-within .content,
:host([required]) div.wrapper:focus-within .content {
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

:host([label]) div.wrapper .content,
:host([required]) div.wrapper .content {
    border-top-color: transparent;
}


:host([error]) div.wrapper span.label_wrapper label {
    color: rgb(var(--error-color));
}

:host([error]) div.wrapper span.label_wrapper::before,
:host([error]) div.wrapper span.label_wrapper::after {
    /*border-top: solid 1px;*/
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

:host([error][label]) div.wrapper:focus-within .content,
:host([error][required]) div.wrapper:focus-within .content {
    box-shadow:
        inset 1px 0 rgb(var(--error-color)),
        inset -1px 0 rgb(var(--error-color)),
        inset 0 -1px rgb(var(--error-color));
}

/* Disabled & Readonly */

:host([disabled]) .content,
:host([disabled]) label {
    color: rgba(var(--text-rgb), 0.6);
}

:host([disabled]) .content {
    border-color: rgba(var(--text-rgb), 0.4);
}

:host([disabled]) span.label_wrapper::before,
:host([disabled]) span.label_wrapper::after {
    border-top: 1px solid;
    border-top-color: rgba(var(--text-rgb), 0.4);
}

`

let baseTextInputStyle = `
/* ---- BaseTextInput Style ---- */

:host div.wrapper {
    --input-height: 3.5em;
    --input-padding: 0 0.75em 0 1em;
    --line-height: 4.5em
}

:host([slim]) div.wrapper {
    --input-height: 2.5em;
    --input-padding: 0 0.75em 0 0.5em;
    --line-height: 3.5em
}

/* Input */

.content {
    height: var(--input-height);
    padding: var(--input-padding);
    line-height: 1.5em;
    text-indent: 0.1em; /* Fix for j being cut by inputs */
    caret-color: rgb(var(--primary-rgb));
}

/* Placeholder-shown */
div.wrapper:not(:focus-within) .content:placeholder-shown {
    border-top-color: rgba(var(--text-rgb), 0.6);
}

div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper label,
div.wrapper:not(:focus-within) .content:placeholder-shown + span.label_wrapper span.required_star {
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 1em;
    line-height: var(--line-height);
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

/* Disabled */
:host([disabled]) div.wrapper:not(:focus-within) .content:placeholder-shown {
    border-top-color: rgba(var(--text-rgb), 0.4);
}

/* Readonly */
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

/* Error */

:host([error]) div.wrapper:not(:focus-within) .content:placeholder-shown {
    border-top-color: rgb(var(--error-color));
}
`

let dateStyle = `
/* ---- Date Style ---- */

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

let selectStyle = `
/* ---- Select Style ---- */

.content {
    padding-right: 2.3em;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: default;
}

i.after {
    display: block;
    color: rgb(var(--text-rgb));
    cursor: pointer;
    pointer-events: none;
}

.wrapper {
    position: realtive;
}
`

let selectMStyle = `
/* ---- Select Multiple Style ---- */

:host(selectm-input) div.list_wrapper option-div:before {
    content: 'check_box_outline_blank';
    line-height: 2em;
    font-family: 'Material Icons';
    font-size: 1.5em;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

:host(selectm-input) div.list_wrapper option-div[selected]:before {
    content: 'check_box';
}
`

let datalistStyle = `
/* ---- DataList Style ---- */

.content {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.wrapper {
    position: realtive;
}

div.list_wrapper {
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

div.list_wrapper[opened] {
    display: block;
}

div.list_wrapper data-div {
    display: none;
    gap: 0.5em;
    padding: 0 1em;
    height: 3em;
    line-height: 3em;
    background-color: rgb(var(--background-color));
    user-select: none;
}

div.list_wrapper data-div[show] { display : flex }

div.list_wrapper data-div:hover {
    background-color: rgba(var(--text-rgb), 0.04);
}

div.list_wrapper data-div[focused] {
    outline: none;
    background-color: rgba(var(--text-rgb), 0.08);
}
div.list_wrapper data-div:active {
    background-color: rgba(var(--text-rgb), 0.16);
}

:host(selectm-input) div.list_wrapper data-div:before {
    content: 'check_box_outline_blank';
    line-height: 2em;
    font-family: 'Material Icons';
    font-size: 1.5em;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

:host(selectm-input) div.list_wrapper data-div[selected]:before {
    content: 'check_box';
}
`

let textareaStyle = `
/* ---- TextArea Style ---- */

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

`

let actionCardStyle = `
/* ---- Card Style ---- */

.wrapper {
    display: flex;
    height: 100%;
    border-radius: 3px;
    background-color: rgb(var(--background-color));
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 14%),
    0 3px 1px -2px rgb(0 0 0 / 12%),
    0 1px 5px 0 rgb(0 0 0 / 20%);
}

:host([cornered]) .wrapper {
    background: linear-gradient(45deg, rgba(0,0,0,0) 94%, rgba(128,128,128,1) 94%);
}

.content  {
    display: block;
    flex: 1 1;
    padding: 1em 0em 1em 1em;
    overflow: hidden;
}

/* Actions */

div.actions {
    flex: 0;
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
`

let cardBlockStyle = `
/* ---- CardBlock Style ---- */

.content {
    display: flex;
    min-height: 5em;
    padding: 0.8em;
    align-items: center;
    gap: 1em;
}

slot[name="display"] {
    flex-grow: 1;
    display: block;
}

label, span.required_star {
    font-size: 1em;
}
`

let multiTextAreaStyle = `
/* ---- Multi Textarea Style ---- */

label, span.required_star {
    font-size: 1em;
}

.content {
    display: flex;
    flex-direction: column;
    min-width: 0;
    align-items: stretch;
    min-height: 3.5em;
    justify-content: center;
}

action-icon-list {
    display: block;
}

.tab_bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 0.8em;
}

.content:not([empty]) .tab_bar {
    border-bottom: 1px solid rgba(var(--text-rgb), 0.4);
}

.tabs_wrapper {
    flex: 1;
    display: flex;
    min-height: 2.5em;
    min-width: 0;
    align-content: stretch;
    outline: none;
    /* hide scrollbar but allow scrolling */
    overflow-x: auto;
    -ms-overflow-style: none; /* for Internet Explorer, Edge */
    scrollbar-height: 1px; /* for Firefox */
}

.tabs_wrapper::-webkit-scrollbar {
    display: none; /* for Chrome, Safari, and Opera */
}

/* Tabs */

.tabs_wrapper span {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0.5em 1em;
    font-size: 1.2em;
    white-space: nowrap;
    color: rgb(var(--text-rgb), 0.6);
    background-color: rgba(var(--text-rgb), 0.01);
    cursor: pointer;
    user-select: none;
}

.tabs_wrapper span i {
    font-size: 1.2em;
    border-radius: 0.2em;
}

.tabs_wrapper span:after {
    content: '';
    display: none;
    position: absolute;
    height: 0.12em;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(var(--text-rgb), 0.3);
}

/* Textarea */

textarea {
    resize: vertical;
    box-sizing: border-box;
    min-height: 5em;
    outline: none;
    border: none;
    padding: 0.5em 0.8em;
    margin: 2px;2
    display: block;
}

.content[empty] textarea {
    display: none;
}

/* Hover */

.tabs_wrapper span:hover {
    background-color: rgba(var(--primary-rgb), 0.1);
}

:host(:not([disabled]):not([readonly])) .tabs_wrapper span i:hover {
    background: rgba(var(--text-rgb), 0.2);
}

/* Focus */

.tabs_wrapper span:focus {
    background-color: rgba(var(--primary-rgb), 0.1);
    outline: none;
}

/* Selected */

.tabs_wrapper span[selected]:after {
    display: block;
}

/* Focus + Selected */

:host(:focus) .tabs_wrapper span[selected] {
    color: rgba(var(--text-rgb));
}

:host(:focus) span[selected]:after {
    background: rgba(var(--primary-rgb), 0.6);
}
`

let fileCardStyle = `

.wrapper {
    position: relative;
}

:host span.name {
    display: block;
    min-height: 1.5em;
    word-wrap: break-word;
}

:host div.info {
    display: flex;
    justify-content: space-between;
    color: rgba(var(--text-rgb), 0.6);
    font-size: 0.8em;
    line-height: inherit;
}

:host div.info span {
    white-space: nowrap;
}

.alert {
    color: red;
    font-weight: bold;
}

:host div.progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 0.2em;
    width: 100%;
}

:host div.progress::after {
    content:'';
    display: block;
    height: 100%;
    background-color: rgb(var(--primary-rgb));
    width: var(--progress, 0%);
}
`

let fileInputStyle = `
/* ---- FileInput Style ---- */

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

slot[name="display"] {
    flex-grow: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px,1fr));
    grid-auto-rows: 1fr;
    place-items: stretch;
    column-gap: 1em;
    row-gap: 1em;
}

`

let checkboxStyle = `
/* ---- Checkbox Style ---- */

div.wrapper {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding-top: 0.5em;
    height: 4em;
    align-items: center;
}

}

:host([checked]) action-icon {
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

:host([disabled]) {
    color: rgba(var(--text-rgb), 0.5);
}

:host([disabled]) action-icon, :host([readonly]) action-icon {
    color: inherit;
}

/* Error */
:host([error]) action-icon::part(icon) {
    color: red;
}
`

let mapStyle = `
/* ---- Map Style ---- */

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

.content > slot {
    display: block;
    margin: 0.5em 2px 2px 2px;
    height: calc(100% - 0.5em - 1px);
}

:host([fullscreen]) {
    height: 70vh;
}
`
/** A mixin for element with list of focusable options */
export let ListMixin = (superclass) =>
  class extends superclass {
    constructor(...args) {
      super(...args)

      this.listWrapper = document.createElement('div')
      this.listWrapper.classList.add('list_wrapper')

      // Events
      this.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'Escape':
            this.hideList()
            e.preventDefault()
            break
          case 'ArrowDown':
            this.focusNext()
            e.preventDefault()
            break
          case 'ArrowUp':
            this.focusPrevious()
            e.preventDefault()
            break
        }
      })

      this.addEventListener('focusout', () => {
        if (this.isListShown()) this.hideList()
      })
    }

    /** @returns True if the list is currently shown */
    isListShown() {
      return this.listWrapper.getAttribute('opened') != null
    }

    /** Show the list
     * @return true if shown, false otherwise
     */
    showList() {
      if (this.isListShown()) return true
      // Check state
      this.listWrapper.toggleAttribute('opened', true)

      this.updateListPosition()
      return true
    }

    /**
     * Update list position on screen
     */
    updateListPosition() {
      this.listWrapper.style.top = ''
      this.listWrapper.style.bottom = ''
      this.listWrapper.style.right = ''
      this.listWrapper.style.left = ''
      let wrapperBr = this.getBoundingClientRect()
      let optBr = this.listWrapper.getBoundingClientRect()

      if (wrapperBr.bottom + optBr.height > window.innerHeight) {
        // Bottom overflow
        if (wrapperBr.top - optBr.height < 0) {
          // Top overflow
          this.listWrapper.style.top = `calc(-${wrapperBr.top}px + 15vh)`
        } else this.listWrapper.style.bottom = wrapperBr.height + 'px'
      } else this.listWrapper.style.top = wrapperBr.height + 'px'

      if (optBr.right > window.innerWidth) {
        this.listWrapper.style.right = '-' + (window.innerWidth - wrapperBr.right - 50) + 'px'
      } else this.listWrapper.style.left = '0px'
    }

    /**
     * Hide the list
     * @returns true if list was opened, false if it was closed
     */
    hideList() {
      let previous = this.listWrapper.getAttribute('opened') != null
      this.listWrapper.toggleAttribute('opened', false)
      return previous
    }

    /**
     * If list shown, hide the list
     * If list hidden, shows the list
     * @return true if list shown after, false if hidden
     */
    toggleList() {
      let shown = this.isListShown()
      if (shown) this.hideList()
      else this.showList()
      return !shown
    }

    /** Focus the option after the current focused option
     * @returns the focused element
     */
    focusNext() {
      let nextFocused = this.focusedElement
        ? this.focusedElement.nextElementSibling
        : this.listWrapper.firstElementChild

      while (nextFocused && nextFocused.hasAttribute('hidden')) {
        nextFocused = nextFocused.nextElementSibling
      }

      return this.focusElement(nextFocused)
    }

    /** Focus the option before the current focused option
     * @returns the focused element
     */
    focusPrevious() {
      let previousFocused = this.focusedElement
        ? this.focusedElement.previousElementSibling
        : this.listWrapper.lastElementChild

      while (previousFocused && previousFocused.hasAttribute('hidden')) {
        previousFocused = previousFocused.previousElementSibling
      }

      return this.focusElement(previousFocused)
    }

    /** Focus the given option
     * @param element, the element to focus
     * @param preventScroll, boolean
     * @returns the focused element
     */
    focusElement(element, preventScroll) {
      if (!element) return
      this.focusedElement?.setAttribute('tabindex', -1)
      this.focusedElement = element
      this.focusedElement.setAttribute('tabindex', 0)
      this.focusedElement.focus({ preventScroll: preventScroll })
      return this.focusedElement
    }
  }

/** A mixin for element with list of selectable options */
export let SelectListMixin = (superclass) =>
  class extends ListMixin(superclass) {
    constructor(...args) {
      super(...args)

      this.optionById = new Map()
      this.searchText = undefined
      this.addEventListener('keyup', (event) => {
        if (/^[a-zA-Z0-9-]$/.test(event.key)) {
          if (this.searchText) {
            this.searchText += event.key
          } else {
            this.searchText = event.key
          }
          let entries = this.optionById.values()

          let findValue = ''
          for (let entry of entries) {
            if (entry.name.toLowerCase().startsWith(this.searchText)) {
              findValue = entry.value
              break
            }
          }

          if (!findValue) this.searchText = undefined
          if (!this.focusedOption) this.showList()

          this.focusElement(this.optionById.get(this.getId(findValue)))
        }

        if (event.key == 'Backspace') {
          this.searchText = undefined
          this.focusElement(this.optionById.get(''))
          event.preventDefault()
        } else if (event.key == 'Enter') {
          event.stopPropagation()
          this.showList()
        }
      })
    }

    /** @inheritdoc */
    showList() {
      // console.trace('show SelectMixin');
      if (!this.focusedElement && !this.focusNext()) return false
      super.showList()
      this.focusedElement.focus()
    }

    /** @inheritdoc */
    hideList() {
      let previous = super.hideList()
      if (previous) this.focus()
      // Reset search
      this.searchText = undefined
      return previous
    }

    /** Change the currents options
     * @param {Array|Object} newOptions the new opt
     */
    setOptions(newOptions) {
      // Empty options wrapper
      this.listWrapper.innerHTML = ''

      if (!newOptions) return
      this.optionById = new Map()

      // Create options wrapper content
      let frag = document.createDocumentFragment()
      let addToOption = (value, name) => {
        let opt = this.createOption(value, name)
        frag.appendChild(opt)
        return opt
      }

      // Read newOptions to fill option wrapper
      if (Array.isArray(newOptions)) {
        for (let opt of newOptions) {
          if (typeof opt == 'object') {
            this.optionById.set(this.getId(opt.value), addToOption(opt.value, opt.name))
          } else this.optionById.set(this.getId(opt), addToOption(opt, opt))
        }
      } else {
        for (let [value, name] of Object.entries(newOptions)) {
          this.optionById.set(this.getId(value), addToOption(value, name))
        }
      }

      this.listWrapper.appendChild(frag)
      this.firstOpt = this.listWrapper.firstElementChild
    }

    /** Create on option for the list */
    createOption(value, name, disabled) {
      let option = document.createElement('option-div')
      option.value = value
      option.name = name
      option.setAttribute('tabindex', -1)
      option.toggleAttribute('disabled', Boolean(disabled))
      let span = document.createElement('span')
      span.textContent = name
      option.appendChild(span)

      // Event : Select this option
      option.onclick = (e) => {
        this.focusElement(option)
        this.select(option)
        e.stopPropagation()
      }

      option.addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
          this.select(option)
          event.stopPropagation()
        }
      })

      return option
    }

    /**
     * Return an id for a value
     * Should always return the same id for the same value
     */
    getId(value) {
      return typeof value == 'object' ? JSON.stringify(value) : value
    }

    /** Return the option div with the given value */
    getOption(value) {
      return this.optionById.get(this.getId(value))
    }

    /** Return the name of given value */
    getName(value) {
      return this.optionById.get(this.getId(value))?.name
    }

    hide(value) {
      let option = this.getOption(value)
      option.toggleAttribute('hidden', true)
      if (option == this.focusedElement)
        this.focusedElement = this.focusNext() || this.focusPrevious()
    }

    show(value) {
      this.getOption(value).toggleAttribute('hidden', false)
    }

    /**
     * Select the given option
     * @param option the value of the option or the dom element
     * @return the dom element selected
     */
    select(option) {
      let selectedOption = typeof option == 'string' ? this.getOption(option) : option

      // Reset search
      this.searchText = undefined

      this.dispatchEvent(
        new CustomEvent('select', {
          detail: { value: selectedOption.value, name: selectedOption.name }
        })
      )

      return selectedOption
    }

    // Lifecycle
    connectedCallback() {
      if (this.hasAttribute('options')) {
        let newOptions
        try {
          newOptions = JSON.parse(this.getAttribute('options'))
          this.setOptions(newOptions)
        } catch {
          //
        }
      }
      if (super.connectedCallback) super.connectedCallback()
    }
  }

export let ActionMixin = (superclass) =>
  class extends superclass {
    constructor(action, ...args) {
      super(...args)
      this.action = action
    }

    /**
     * Add click events and 'Enter' keyup events
     * to an element that trigger action click
     */
    bindEventTo(element) {
      element.addEventListener('click', (event) => {
        event.preventDefault()
        this.action.focus()
        this.action.click()
      })
    }

    attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
        case 'disabled':
          this.action.toggleAttribute('disabled', newValue != null)
          break
        case 'readonly':
          this.action.toggleAttribute('readonly', newValue != null)
          break
      }
      super.attributeChangedCallback(name, oldValue, newValue)
    }

    static get observedAttributes() {
      return super.observedAttributes.concat(['disabled', 'readonly'])
    }
  }

export class ActionIcon extends HTMLElement {
  constructor(...styles) {
    super()
    this.attachShadow({ mode: 'open' })

    // Icon
    this.icon = document.createElement('i')
    this.icon.classList.add('material-icons')
    this.icon.setAttribute('tabindex', 0)
    this.icon.setAttribute('part', 'icon')
    this.icon.appendChild(document.createElement('slot'))

    // Append elements
    this.shadowRoot.appendChild(createStyleElement(iconStyle, actionIconStyle, ...styles))
    this.shadowRoot.appendChild(this.icon)

    this.addEventListener('keyup', (e) => {
      if (e.key == 'Enter') {
        e.stopImmediatePropagation()
        this.click()
      }
    })
  }

  focus() {
    if (this.icon.hasAttribute('tabindex')) this.icon.focus()
    else super.focus()
  }

  /** @inheritdoc  */
  addEventListener(type, listener, ...rest) {
    let customListener =
      type == 'click'
        ? (event, ...other) => {
            if (this.attributes.disabled || this.attributes.readonly) return
            event.stopPropagation()
            listener(event, ...other)
          }
        : listener

    super.addEventListener(type, customListener, ...rest)
  }

  /**
   * Update the focus of the component according to its state
   * @param {Boolean} noFocus if true disable focus
   */
  #updateFocusable(noFocus) {
    if (noFocus) this.icon.toggleAttribute('tabindex', false)
    else if (
      !this.hasAttribute('readonly') &&
      !this.hasAttribute('disabled') &&
      !this.hasAttribute('tabindex')
    ) {
      this.icon.setAttribute('tabindex', 0)
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.#updateFocusable(newValue != null)
        break
      case 'readonly':
        this.#updateFocusable(newValue != null)
        break
      case 'tabindex':
        this.#updateFocusable(newValue != null)
        break
    }
  }

  static get observedAttributes() {
    return ['disabled', 'readonly', 'tabindex']
  }
}

export class ActionIconList extends SelectListMixin(ActionIcon) {
  constructor(...styles) {
    super(selectMixinStyle, ...styles)

    // event
    this.addEventListener('click', (event) => {
      event.preventDefault()
      this.toggleList()
    })

    // Options wrapper
    this.shadowRoot.appendChild(this.listWrapper)
  }

  /** @inheritdoc */
  select(option) {
    this.hideList()
    let selectedOption = super.select(option)
    if (this.func) this.func(selectedOption.value, selectedOption.name)
  }
}

export class MatFormElement extends HTMLElement {
  constructor(...styles) {
    super()
    this.attachShadow({ mode: 'open' })

    // Create label
    let labelWrapper = document.createElement('span')
    labelWrapper.classList.add('label_wrapper')
    this.label = document.createElement('label')
    let requiredStar = document.createElement('span')
    requiredStar.classList.add('required_star')
    requiredStar.appendChild(document.createTextNode(' ✱'))
    labelWrapper.appendChild(this.label)
    labelWrapper.appendChild(requiredStar)

    // Create wrapper
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('wrapper')
    this.wrapper.appendChild(labelWrapper)

    this.addEventListener('change', () => {
      this.toggleAttribute('error', false)
    })

    // Append elements
    this.shadowRoot.appendChild(
      createStyleElement(theme, iconStyle, matFormElementStyle, ...styles)
    )
    this.shadowRoot.appendChild(this.wrapper)
  }

  // Lifecycle
  connectedCallback() {
    if (this.hasAttribute('value')) this.value = this.getAttribute('value')
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'label':
        this.label.textContent = newValue
        break
    }
  }

  static get observedAttributes() {
    return ['label']
  }
}

export class BaseInput extends MatFormElement {
  constructor(...styles) {
    super(baseInputStyle, ...styles)

    // Create helper
    let helperWrapper = document.createElement('div')
    helperWrapper.classList.add('helper_wrapper')
    this.helper = document.createElement('span')
    helperWrapper.appendChild(this.helper)

    // Append elements
    this.wrapper.appendChild(helperWrapper)
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'helper':
        if (!this.hasAttribute('error')) this.helper.textContent = newValue
        break
      case 'error':
        this.helper.textContent = newValue != null ? newValue : this.getAttribute('helper')
        break
      default:
        super.attributeChangedCallback(name, oldValue, newValue)
    }
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(['helper', 'error'])
  }
}

export class BaseTextInput extends BaseInput {
  constructor(...styles) {
    super(baseTextInputStyle, ...styles)

    // Create input
    this.input = document.createElement('input')
    this.input.classList.add('content')
    this.input.addEventListener('change', () => {
      this.dispatchEvent(new Event('change'))
    })

    // Create icon
    this.iconAfter = document.createElement('i')
    this.iconAfter.classList.add('after')
    this.iconBefore = document.createElement('i')
    this.iconBefore.classList.add('before')
    this.iconAfter.classList.add('material-icons')
    this.iconBefore.classList.add('material-icons')

    // Edit wrapper
    this.wrapper.prepend(this.input)
    this.wrapper.appendChild(this.iconBefore)
    this.wrapper.appendChild(this.iconAfter)
  }

  focus(options) {
    this.input.focus(options)
  }

  // Getters / Setters
  set value(newValue) {
    this.input.value = newValue || ''
  }
  get value() {
    return this.input.value
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.input.toggleAttribute('disabled', newValue != null)
        break
      case 'readonly':
        this.input.toggleAttribute('readonly', newValue != null)
        break
      case 'size':
        if (newValue) this.input.setAttribute('size', newValue)
        else this.input.removeAttribute('size')
        break
      default:
        super.attributeChangedCallback(name, oldValue, newValue)
    }
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(['disabled', 'readonly', 'size'])
  }
}

export class TextInput extends BaseTextInput {
  #validationHandler

  constructor() {
    super()
    this.input.setAttribute('placeholder', ' ')
    this.#validationHandler = undefined
    this.input.addEventListener('change', () => {
      if (this.#validationHandler) this.#validationHandler()
    })
  }

  #setValidation(name) {
    if (name == 'email') this.#validationHandler = this.#emailValidation
    else this.#validationHandler = undefined
  }

  #emailValidation() {
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(this.input.value))
      this.setAttribute('error', 'Email invalide')
    else this.toggleAttribute('error', false)
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    if (name == 'validation') this.#setValidation(newValue)
    else super.attributeChangedCallback(name, oldValue, newValue)
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(['validation'])
  }
}

export class NumberInput extends BaseTextInput {
  constructor() {
    super()
    this.input.setAttribute('placeholder', ' ')
    this.input.setAttribute('type', 'number')
    this.input.setAttribute('step', 1)
    this.input.addEventListener('blur', () => {
      this.value = this.input.value
    })
  }
}

export class DateInput extends BaseTextInput {
  constructor(...styles) {
    super(dateStyle, ...styles)
    this.input.setAttribute('type', 'date')
    this.iconBefore.textContent = 'event'
    this.input.addEventListener('blur', () => {
      this.value = this.input.value
    })
  }

  // Getters / Setters
  set value(newValue) {
    this.input.value = newValue?.substring(0, 10) || ''
  }
  get value() {
    return super.value
  }
}

export class SelectInputs extends SelectListMixin(BaseTextInput) {
  constructor(...styles) {
    super(selectStyle, selectMixinStyle, ...styles)
    // Setup
    this.input.setAttribute('placeholder', ' ')
    this.input.readOnly = true
    this.iconAfter.textContent = 'arrow_drop_down'

    // event
    this.input.addEventListener('click', (event) => {
      event.preventDefault()
      this.toggleList()
    })

    // Options wrapper
    this.wrapper.appendChild(this.listWrapper)
  }

  /** @inheritdoc */
  showList() {
    if (this.getAttribute('readonly') != null || this.getAttribute('disabled') != null) return false
    let show = super.showList()
    if (show) this.iconAfter.textContent = 'arrow_drop_up'
    return show
  }

  /** @inheritdoc */
  hideList() {
    let previous = super.hideList()
    this.iconAfter.textContent = 'arrow_drop_down'
    if (previous) this.input.focus({ preventScroll: true })
  }

  // Lifecycle
  connectedCallback() {
    if (!this.hasAttribute('options') && !this.optionById) this.setOptions([])
    super.connectedCallback()
  }
}

export class SelectInput extends SelectInputs {
  #value

  set value(newValue) {
    if (newValue) {
      let optDiv = this.getOption(newValue)
      if (!optDiv) throw new SetValueError(this, newValue, 'Value is not in options')
      this.#select(optDiv)
    } else this.#select(this.listWrapper.firstElementChild)
  }

  get value() {
    return this.#value
  }

  /**
   * @inheritdoc
   * @param {Array|Object} newOptions the new opt
   * @param noEmpty do not add an empty option
   */
  setOptions(newOptions, noEmpty) {
    if (!noEmpty) {
      // Add an empty option
      if (Array.isArray(newOptions)) newOptions = [''].concat(newOptions)
      else newOptions = Object.assign({ 0: '' }, newOptions)
    }
    super.setOptions(newOptions)
    this.#select(this.firstOpt) // Select first option by default
  }

  /** @inheritdoc */
  select(option) {
    // Toggle previous selected option
    let previousValue = this.#value
    let selectedOption = this.#select(option)
    if (this.isListShown()) this.hideList()
    if (previousValue != selectedOption.value) this.dispatchEvent(new Event('change'))
    return selectedOption
  }

  #select(option) {
    // Toggle previous selected option
    let selectedOption = super.select(option)
    super.value = selectedOption.name
    this.#value = selectedOption.value
    return selectedOption
  }
}

export class SelectMultipleInput extends SelectInputs {
  #value

  constructor(...styles) {
    super(selectMStyle, ...styles)
    this.#value = new Set()
  }

  set value(newValue) {
    // Reset
    for (let opt of this.listWrapper.children) opt.toggleAttribute('selected', false)
    this.#value.clear()
    if (!newValue) {
      super.value = ''
      return
    }

    try {
      newValue = JSON.parse(newValue)
    } catch {
      /**/
    }

    let optDiv
    let errors = []
    for (let val of newValue) {
      // if (!val) continue;
      optDiv = this.getOption(val)
      if (!optDiv) errors.push(new SetValueError(this, val, `Value '${val}' is not in options`))
      else {
        optDiv.toggleAttribute('selected', true)
        this.#value.add(optDiv)
      }
    }
    if (errors.length) throw errors
    super.value = Array.from(this.#value)
      .map((option) => option.name)
      .join(', ')
  }

  get value() {
    let val = Array.from(this.#value).map((option) => option.value)
    return val.length ? val : undefined
  }

  /** Select the given option */
  select(option) {
    let selectedOption = super.select(option)
    let isSelected = selectedOption.toggleAttribute('selected')
    if (isSelected) this.#value.add(selectedOption)
    else this.#value.delete(selectedOption)
    let val = Array.from(this.#value)
      .map((option) => option.name)
      .join(', ')
    this.input.value = val.length ? val : ''
    this.dispatchEvent(new Event('change'))
  }
}

export class DataListInput extends ListMixin(BaseTextInput) {
  constructor(...styles) {
    super(datalistStyle, ...styles)
    // Setup
    this.input.setAttribute('placeholder', ' ')

    // Options wrapper
    this.wrapper.appendChild(this.listWrapper)

    // Events
    this.input.addEventListener('keyup', (e) => {
      if (/^[a-zA-Z0-9-]$/.test(e.key)) {
        this.updateDatalist()
        return
      }
      switch (e.key) {
        case 'Backspace':
          this.updateDatalist()
          break
        case 'Delete':
          this.updateDatalist()
          break
        case 'Enter': {
          if (this.focusedElement) {
            this.select(this.focusedElement)
            e.stopPropagation()
          }
          break
        }
      }
    })
  }

  /** Update the data list from input value
   * @param clear true by default. If false search new match from previous match list
   */
  updateDatalist() {
    // Reset focus
    this.focusedElement?.toggleAttribute('focused', false)
    this.focusedElement = undefined
    if (!this.dataById) return

    // Show only relevent options
    let count = 0,
      firstElement
    for (let dataDiv of this.dataById.values()) {
      let inRange = dataDiv.name.toLowerCase().startsWith(this.input.value.toLowerCase())
      dataDiv.toggleAttribute('show', inRange)
      if (inRange) {
        if (count == 0) firstElement = dataDiv
        count++
      }
    }

    if (count) {
      if (this.isListShown()) this.updateListPosition()
      else this.showList()
      this.focusElement(firstElement)
    } else this.hideList()
  }

  /** @inheritdoc */
  showList() {
    if (this.getAttribute('readonly') != null || this.getAttribute('disabled') != null) return false
    return super.showList()
  }

  /** @inherirtdoc */
  hideList() {
    super.hideList()
    this.focusedElement = undefined
  }

  /** @inheritdoc */
  focusNext() {
    let nextFocused = this.focusedElement
      ? this.focusedElement.nextElementSibling
      : this.listWrapper.firstElementChild

    while (nextFocused && !nextFocused.hasAttribute('show')) {
      nextFocused = nextFocused.nextElementSibling
    }

    return this.focusElement(nextFocused)
  }

  /** @inheritdoc */
  focusPrevious() {
    let previousFocused = this.focusedElement
      ? this.focusedElement.previousElementSibling
      : this.listWrapper.lastElementChild

    while (previousFocused && !previousFocused.hasAttribute('show')) {
      previousFocused = previousFocused.previousElementSibling
    }

    return this.focusElement(previousFocused)
  }

  /** @inheritdoc */
  focusElement(element) {
    if (!element) return
    this.focusedElement?.toggleAttribute('focused', false)
    this.focusedElement = element
    this.focusedElement.toggleAttribute('focused', true)

    // Scrolling
    let twoOffsetHeight = 2 * this.focusedElement.offsetHeight
    if (
      this.focusedElement.offsetTop + twoOffsetHeight >
      this.listWrapper.offsetHeight + this.listWrapper.scrollTop
    ) {
      this.listWrapper.scroll(
        0,
        this.focusedElement.offsetTop - this.listWrapper.offsetHeight + twoOffsetHeight
      )
    } else if (
      this.focusedElement.offsetTop - this.focusedElement.offsetHeight <
      this.listWrapper.scrollTop
    ) {
      this.listWrapper.scroll(0, this.focusedElement.offsetTop - this.focusedElement.offsetHeight)
    }
    return this.focusedElement
  }

  /** Change the currents data list
   * @param {Array|Object} newDataList the new opt
   */
  setDataList(newDataList) {
    // Empty options wrapper
    this.listWrapper.innerHTML = ''

    if (!newDataList) return
    this.dataById = new Map() // TODO Check if it can be better with list mixin or SelectMixin inspired stuff

    // Create data wrapper content
    let frag = document.createDocumentFragment()
    let addToData = (value, name) => {
      let data = this.createData(value, name)
      frag.appendChild(data)
      return data
    }

    // Read newOptions to fill option wrapper
    if (Array.isArray(newDataList)) {
      for (let data of newDataList) {
        if (typeof data == 'object') {
          this.dataById.set(data.value, addToData(data.value, data.name))
        } else this.dataById.set(data, addToData(data, data))
      }
    } else {
      for (let [value, name] of Object.entries(newDataList)) {
        this.dataById.set(value, addToData(value, name))
      }
    }

    this.listWrapper.appendChild(frag)
  }

  /** Create on option for the list */
  createData(value, name, disabled) {
    let option = document.createElement('data-div')
    option.value = value
    option.name = name
    option.setAttribute('tabindex', -1)
    option.toggleAttribute('disabled', Boolean(disabled))
    option.appendChild(document.createTextNode(name))

    // Event : Select this option
    option.onclick = (e) => {
      this.select(option)
      e.stopPropagation()
      this.focus()
    }

    return option
  }

  /** Select the given option */
  select(option) {
    if (option) this.input.value = option.name
    this.hideList()
  }

  // Lifecycle
  connectedCallback() {
    if (this.hasAttribute('data')) {
      let newOptions
      try {
        newOptions = JSON.parse(this.getAttribute('data'))
        this.setDataList(newOptions)
      } catch {
        //
      }
    }
    super.connectedCallback()
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(['data'])
  }
}

export class TextareaInput extends BaseTextInput {
  constructor(...styles) {
    super(textareaStyle, ...styles)
    let newInput = document.createElement('textarea')
    newInput.classList.add('input', 'content')
    this.input.replaceWith(newInput)
    this.input = newInput
    this.input.setAttribute('placeholder', ' ')
    this.input.setAttribute('part', 'textarea')
    this.input.addEventListener('blur', () => {
      this.value = this.input.value
    })
  }
}

export class ActionCard extends HTMLElement {
  constructor(...styles) {
    super()
    let shadow = this.attachShadow({ mode: 'open' })

    // Create content
    let content = document.createElement('slot')
    content.classList.add('content')

    // Create action
    this.actions = document.createElement('div')
    this.actions.classList.add('actions')

    // Create wrapper
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('wrapper')
    this.wrapper.appendChild(content)
    this.wrapper.appendChild(this.actions)

    // Append element to card
    shadow.appendChild(createStyleElement(theme, iconStyle, actionCardStyle, ...styles))
    shadow.appendChild(this.wrapper)
  }

  /** Add an action to card */
  addAction(iconName, action, pos) {
    let actionIcon = document.createElement('action-icon')
    actionIcon.textContent = iconName
    actionIcon.addEventListener('click', () => {
      action(this)
    })
    if (typeof pos != 'number') this.actions.appendChild(actionIcon)
    else this.actions.children[pos].insertAdjacentElement('beforebegin', actionIcon)
  }

  /** Disable card (state=true -> disable, state=false -> enable) */
  #disable(state) {
    for (let action of this.actions.children) action.toggleAttribute('disabled', state)
    let event = new Event('disable')
    event.state = state
    this.dispatchEvent(event)
  }

  /** Readonly card (state=true -> readonly, state=false -> editable) */
  #readonly(state) {
    for (let action of this.actions.children) action.toggleAttribute('readonly', state)
    let event = new Event('readonly')
    event.state = state
    this.dispatchEvent(event)
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.#disable(newValue != null)
        break
      case 'readonly':
        this.#readonly(newValue != null)
        break
    }
  }

  static get observedAttributes() {
    return ['disabled', 'readonly']
  }
}

export class BaseCardsBlock extends BaseInput {
  constructor(...styles) {
    super(cardBlockStyle, ...styles)
    this.cardTag = 'action-card'

    // Create slot
    this.displaySlot = document.createElement('slot')
    this.displaySlot.setAttribute('name', 'display')
    this.displaySlot.setAttribute('part', 'display')

    // Create content
    this.content = document.createElement('div')
    this.content.classList.add('content')
    this.content.appendChild(this.displaySlot)

    // Append elements
    this.wrapper.prepend(this.content)
  }

  set value(newValue) {
    // Reset
    for (let card of this.cardsIterator()) card.remove()
    if (!newValue) return

    let errors = []
    for (let val of newValue) {
      try {
        this.addCard(val)
      } catch (e) {
        errors.push(e)
      }
    }
    if (errors.length) throw errors
    this.dispatchEvent(new Event('change'))
  }

  get value() {
    let value = []
    for (let card of this.cardsIterator()) {
      let val = card.value
      if (val) value.push(val)
    }
    return value.length ? value : undefined
  }

  get cardsIterator() {
    return function* () {
      let children = [...this.children]
      for (let card of children) {
        if (card.slot == 'display') yield card
      }
    }
  }

  /**
   * Add a card to the grid with meta
   * @param {*} value the value of the card
   */
  addCard(value = undefined) {
    let card = this.createCard(value)
    card.toggleAttribute('readonly', this.hasAttribute('readonly'))
    card.toggleAttribute('disabled', this.hasAttribute('disabled'))

    this.appendChild(card)
    this.dispatchEvent(new Event('change'))
    return card
  }

  /** Return a new card
   * @param {*} value the value of the card
   */
  createCard(value) {
    let card = document.createElement(this.cardTag)
    card.value = value
    card.setAttribute('slot', 'display')
    card.addAction('close', (card) => {
      this.removeCard(card)
    }) // TODO handle focus when removing card
    card.addEventListener('click', (e) => {
      e.stopPropagation()
    })

    return card
  }

  /**
   * Remove the card
   * @param {*} card the card
   */
  removeCard(card) {
    card.remove()
  }

  // Lifecycle
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        for (let card of this.cardsIterator()) card.toggleAttribute('disabled', newValue != null)
        break
      case 'readonly':
        for (let card of this.cardsIterator()) card.toggleAttribute('readonly', newValue != null)
        break
      default:
        super.attributeChangedCallback(name, oldValue, newValue)
    }
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(['disabled', 'readonly'])
  }
}

export class MultiTextArea extends ActionMixin(BaseInput) {
  constructor(...styles) {
    super(document.createElement('action-icon-list'), multiTextAreaStyle, ...styles)

    // Create content
    this.content = document.createElement('div')
    this.content.classList.add('content')
    this.content.toggleAttribute('empty', true)

    // Create tab bar
    let tabBar = document.createElement('div')
    tabBar.classList.add('tab_bar')

    // Create tabs wrapper
    this.tabsWrapper = document.createElement('div')
    this.tabsWrapper.classList.add('tabs_wrapper')
    // this.tabsWrapper.setAttribute('tabindex', -1);
    this.tabsWrapper.addEventListener('click', (event) => {
      if (this.tabsWrapper.hasChildNodes()) {
        this.action.focus()
        event.stopPropagation()
      }
    })

    // Create textarea
    this.textarea = document.createElement('textarea')
    // this.textarea.setAttribute('tabindex', 2)
    this.textarea.addEventListener('click', (event) => event.stopPropagation())

    // Init action
    this.action.textContent = 'add'
    this.action.setAttribute('tabindex', -1)
    this.action.addEventListener('select', (event) => {
      let tab = this.createTab(event.detail.value, '', event.detail.name)
      this.tabTo(tab)
      this.textarea.focus()
    })

    // Append element
    tabBar.appendChild(this.tabsWrapper)
    tabBar.appendChild(this.action)
    this.content.appendChild(tabBar)
    this.content.appendChild(this.textarea)
    this.wrapper.prepend(this.content)

    // Events
    this.bindEventTo(this.content)

    tabBar.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowRight':
          this.tabNext()
          event.preventDefault()
          break
        case 'ArrowLeft':
          this.tabPrevious()
          event.preventDefault()
          break
      }
    })

    tabBar.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'Enter':
          this.textarea.focus()
          break
        case 'Backspace':
          this.removeTab(this.currentTab)
          break
      }
    })
  }

  set value(newValue) {
    // Reset
    while (this.tabsWrapper.firstChild) {
      this.removeTab(this.tabsWrapper.lastChild)
    }
    if (!newValue) return

    let errors = []
    for (let val of newValue) {
      try {
        let tabName = this.action.getName(val.lang)
        if (!tabName) errors.push(new SetValueError(this, val, 'Value is not in options'))
        this.createTab(val.lang, val.text, tabName)
      } catch (e) {
        errors.push(e)
      }
    }
    if (errors.length) throw errors
    this.currentTab = this.tabsWrapper.firstChild
    this.currentTab.toggleAttribute('selected', true)
    // this.currentTab.setAttribute('tabindex', 1);
    this.textarea.value = this.currentTab.text || ''
    this.dispatchEvent(new Event('change'))
  }

  get value() {
    if (this.currentTab) this.currentTab.text = this.textarea.value
    let value = []
    for (let tab of this.tabsWrapper.children) {
      value.push({
        lang: tab.tabValue,
        text: tab.text
      })
    }
    return value.length ? value : undefined
  }

  createTab(tabValue, text, tabName) {
    let tab = document.createElement('span')
    // tab.setAttribute('tabindex', -1);
    tab.textContent = tabName
    tab.tabValue = tabValue
    tab.text = text

    // Close
    let i = document.createElement('i')
    i.classList.add('material-icons')
    i.textContent = 'close'
    i.addEventListener('click', (event) => {
      if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return
      event.stopPropagation()
      this.removeTab(tab)
    })

    tab.appendChild(i)
    this.tabsWrapper.appendChild(tab)

    // Hide options
    this.action.hide(tab.tabValue)

    tab.addEventListener('click', (event) => {
      event.stopPropagation()
      this.tabTo(tab)
      this.textarea.focus()
    })

    this.content.toggleAttribute('empty', false)
    return tab
  }

  removeTab(tab) {
    if (!tab) return
    if (tab == this.currentTab) this.currentTab = this.tabNext() || this.tabPrevious()
    tab.remove()
    this.action.show(tab.tabValue)
    if (!this.currentTab) {
      this.textarea.textContent = ''
      this.content.toggleAttribute('empty', true)
    }
  }

  tabNext() {
    return this.tabTo(this.currentTab?.nextElementSibling)
  }
  tabPrevious() {
    return this.tabTo(this.currentTab?.previousElementSibling)
  }

  tabTo(tab) {
    if (!tab || tab == this.currentTab) return
    if (this.currentTab) {
      this.currentTab.toggleAttribute('selected', false)
      // this.currentTab.setAttribute('tabindex', -1);
      this.currentTab.text = this.textarea.value
    }
    this.currentTab = tab
    this.currentTab.toggleAttribute('selected', true)
    // this.currentTab.setAttribute('tabindex', 1);
    this.currentTab.focus()
    this.textarea.value = this.currentTab.text || ''

    // Scrolling
    let scrollZone = 0.2 * this.tabsWrapper.offsetWidth
    let offSetRight = this.currentTab.offsetLeft + this.currentTab.offsetWidth
    if (offSetRight > this.tabsWrapper.offsetWidth + this.tabsWrapper.scrollLeft - scrollZone) {
      this.tabsWrapper.scroll({
        left: offSetRight - this.tabsWrapper.offsetWidth + scrollZone,
        behavior: 'smooth'
      })
    } else if (this.currentTab.offsetLeft < this.tabsWrapper.scrollLeft + scrollZone) {
      this.tabsWrapper.scroll({
        left: this.currentTab.offsetLeft - scrollZone,
        behavior: 'smooth'
      })
    }
    return this.currentTab
  }

  /**
   * Set options for to add cards
   * @param {Array|Object} options
   */
  setOptions(options) {
    this.action.setOptions(options)
  }

  // Lifecycle
  connectedCallback() {
    let options = this.getAttribute('options')
    if (!this.action.optionById) {
      if (!options) this.action.setOptions([''])
      else {
        try {
          this.setOptions(JSON.parse(options))
        } catch {
          // Nothing
        }
      }
    }
  }
}

export class FileCard extends ActionCard {
  #value

  constructor(...styles) {
    super(fileCardStyle, ...styles)
    this.#value = undefined

    let content = document.createElement('div')
    content.classList.add('content')
    this.wrapper.firstElementChild.replaceWith(content)

    // Create content
    this.name = document.createElement('span')
    this.name.classList.add('name')

    let info = document.createElement('div')
    info.classList.add('info')
    this.type = document.createElement('span')

    this.size = document.createElement('span')
    info.appendChild(this.type)
    info.appendChild(this.size)

    let progress = document.createElement('div')
    progress.classList.add('progress')

    // Append element
    content.appendChild(this.name)
    content.appendChild(info)
    content.appendChild(progress)
    this.wrapper.prepend(content)
  }

  set value(file) {
    if (file instanceof ForeignFile) this.toggleAttribute('cornered', true)
    else if (!(file instanceof File))
      throw new SetValueError(
        this,
        file,
        new TypeError('Value should be a File or ForeignFile instance')
      )
    this.#value = file
    this.name.textContent = file?.name
    this.type.textContent = file?.type
    this.size.textContent = file?.size ? this.humanReadableByteCountSI(file.size) : ''
    if (file.file_storage_status === 'missing')
      this.size.innerHTML = "<span class='alert'>indisponible</span>"
  }

  get value() {
    return this.#value
  }

  humanReadableByteCountSI(bytes) {
    let si = ['k', 'M', 'G', 'T', 'P', 'E']
    let i = 0
    while (bytes <= -999_950 || bytes >= 999_950) {
      bytes /= 1000
      i++
    }
    return `${Math.round(bytes / 10) / 100.0} ${si[i]}o`
  }
}

export class FilesInput extends ActionMixin(BaseCardsBlock) {
  constructor(...styles) {
    super(document.createElement('action-icon'), fileInputStyle, ...styles)

    this.cardTag = 'action-card-file'

    // Create file input
    let inputFile = document.createElement('input')
    inputFile.setAttribute('type', 'file')
    inputFile.toggleAttribute('multiple')
    inputFile.style.display = 'none'

    // Init action-icon
    this.action.textContent = 'upload'
    this.action.addEventListener('click', () => {
      inputFile.click()
    })

    // Handle files
    inputFile.onchange = () => {
      let filelist = inputFile.files
      for (var i = 0; i < filelist.length; i++) {
        this.addCard(filelist[i])
      }
      inputFile.value = ''
    }

    // Dragging
    let draggingZone = document.createElement('div')
    draggingZone.classList.add('dragging_zone')
    let span = document.createElement('span')
    span.textContent = '+'
    draggingZone.appendChild(span)

    this.content.addEventListener('dragenter', () => {
      this.content.toggleAttribute('dropping', true)
    })
    draggingZone.addEventListener('dragover', (ev) => {
      ev.preventDefault()
    })
    let dragReset = () => {
      this.content.toggleAttribute('dropping', false)
    }
    draggingZone.addEventListener('dragleave', dragReset)
    draggingZone.addEventListener('drop', (ev) => {
      // Prevent default behavior (Prevent file from being opened)
      ev.preventDefault()
      dragReset()
      let filelist = ev.dataTransfer.files
      for (let i = 0; i < filelist.length; i++) {
        this.addCard(filelist[i])
      }
    })

    // Append element
    this.content.appendChild(this.action)
    this.content.appendChild(draggingZone)
    this.bindEventTo(this.content)
  }

  /** @inheritdoc */
  createCard(value) {
    let card = super.createCard(value)
    return card
  }

  /**
   * Set the progress bar of a card to the progress value
   * @param {Integer} index the index of the card in list
   * @param {Number} progress the percentage of progress
   */
  setProgress(index, progress) {
    let card = this.cards[index]
    if (!card) return
    card.style.setProperty('--progress', progress)
  }
}

export class Checkbox extends ActionMixin(MatFormElement) {
  #checked

  constructor(...styles) {
    super(document.createElement('action-icon'), checkboxStyle, ...styles)

    this.#checked = false
    this.action.textContent = 'check_box_outline_blank'
    this.action.classList.add('checkbox')
    this.action.addEventListener('click', () => {
      if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return
      this.value = !this.#checked
      this.action.focus()
    })

    // Append Element
    this.wrapper.appendChild(this.action)
  }

  set value(newValue) {
    this.#checked = Boolean(newValue)
    if (newValue) {
      this.action.textContent = 'check_box'
    } else {
      this.action.textContent = 'check_box_outline_blank'
    }
    this.dispatchEvent(new Event('change'))
  }

  get value() {
    return this.#checked
  }
}

export class MapInput extends BaseInput {
  constructor(...styles) {
    super(mapStyle, ...styles)

    this.map = document.createElement('div')
    this.map.style.height = '100%'
    let content = document.createElement('div')
    content.classList.add('content')
    let slot_ = document.createElement('slot')
    content.appendChild(slot_)
    this.wrapper.prepend(content)

    this.currentLayer = undefined
    this.drawnItems = undefined
    this.drawControlFull = undefined
    this.drawControlEditOnly = undefined
    this.fullscreen = false
    this.fullScreenBtn = undefined

    this.map = L.map(this.map, { scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="http://osm.org/copyright" tabindex="-1">OpenStreetMap</a> contributors'
    }).addTo(this.map)

    // Initialise the FeatureGroup to store editable layers
    this.drawnItems = new L.FeatureGroup()
    this.map.addLayer(this.drawnItems)

    // Create a custom full screen btn control for the map
    var customControl = L.Control.extend({
      options: { position: 'bottomright' },
      // Add a full screen button
      onAdd: () => {
        this.fullScreenBtn = L.DomUtil.create('action-icon', 'leaflet-bar leaflet-control')
        this.fullScreenBtn.style = `background: white;`
        this.fullScreenBtn.textContent = 'fullscreen'

        this.fullScreenBtn.addEventListener('click', () => {
          this.toggleAttribute('fullscreen')
        })

        return this.fullScreenBtn
      }
    })

    // Basic controls
    this.drawControlFull = new L.Control.Draw({
      draw: { polyline: false, circle: false, marker: false, circlemarker: false }
    })
    this.drawControlEditOnly = new L.Control.Draw({
      edit: { featureGroup: this.drawnItems },
      draw: false
    })
    this.drawControlFull.isOnMap = false
    this.drawControlEditOnly.isOnMap = false

    this.#updateControls()
    this.map.addControl(new customControl())

    // Event handlers
    this.map.on('draw:created', (e) => {
      this.currentLayer = e.layer
      this.drawnItems.addLayer(this.currentLayer)
      this.#updateControls()
      this.dispatchEvent(new Event('change'))
    })

    this.map.on('draw:deleted', (e) => {
      if (Object.keys(e.layers._layers).length === 0) return
      this.currentLayer = undefined
      this.#updateControls()
      this.dispatchEvent(new Event('change'))
    })

    this.map.on('draw:edited', (e) => {
      this.currentLayer = Object.values(e.layers._layers)[0]
      this.dispatchEvent(new Event('change'))
    })
  }

  /** Toggle fullscreen mode for map */
  setFullScreen(state = true) {
    if (state) {
      this.fullScreenBtn.textContent = 'fullscreen_exit'
      this.map.scrollWheelZoom.enable()
      this.map.invalidateSize()
    } else {
      this.fullScreenBtn.textContent = 'fullscreen'
      this.map.scrollWheelZoom.disable()
      this.map.invalidateSize()
    }
  }

  set value(geography) {
    // Reset
    if (this.currentLayer) this.drawnItems.removeLayer(this.currentLayer)
    this.currentLayer = undefined

    if (geography) {
      geography.geographic_distribution.properties =
        geography.geographic_distribution.properties || {}
      let geoJsonLayers = L.geoJson(geography.geographic_distribution)
      this.currentLayer = geoJsonLayers.getLayers()[0]
      this.drawnItems.addLayer(this.currentLayer)
    }

    this.#updateControls()
    this.dispatchEvent(new Event('change'))
  }

  get value() {
    if (!this.currentLayer) return undefined

    let bounds = this.currentLayer.getBounds()
    return {
      bounding_box: {
        west_longitude: bounds._southWest.lng,
        east_longitude: bounds._northEast.lng,
        north_latitude: bounds._northEast.lat,
        south_latitude: bounds._southWest.lat
      },
      geographic_distribution: this.currentLayer.toGeoJSON(),
      projection: 'WGS 84'
    }
  }

  #updateControls() {
    let addControl = (control) => {
      if (control.isOnMap) return
      control.isOnMap = true
      this.map.addControl(control)
    }
    let removeControl = (control) => {
      if (!control.isOnMap) return
      control.isOnMap = false
      this.map.removeControl(control)
    }

    if (!this.hasAttribute('readonly') && !this.hasAttribute('disabled')) {
      if (this.currentLayer) {
        addControl(this.drawControlEditOnly)
        removeControl(this.drawControlFull)
      } else {
        addControl(this.drawControlFull)
        removeControl(this.drawControlEditOnly)
      }
    } else {
      removeControl(this.drawControlFull)
      removeControl(this.drawControlEditOnly)
      if (this.hasAttribute('disabled')) {
        this.map.dragging.disable()
        this.map.touchZoom.disable()
        this.map.doubleClickZoom.disable()
        this.map.scrollWheelZoom.disable()
        this.map.boxZoom.disable()
        this.map.keyboard.disable()
        if (this.map.tap) this.map.tap.disable()
        this.map._container.setAttribute('tabindex', -1)
      } else {
        this.map.dragging.enable()
        this.map.touchZoom.enable()
        this.map.doubleClickZoom.enable()
        this.map.scrollWheelZoom.enable()
        this.map.boxZoom.enable()
        this.map.keyboard.enable()
        if (this.map.tap) this.map.tap.enable()
        this.map._container.setAttribute('tabindex', 0)
      }
    }
  }

  // Lifecycle
  connectedCallback() {
    this.appendChild(this.map._container)
    let lat = this.getAttribute('lat') || 0
    let lng = this.getAttribute('lng') || 0
    let zoom = this.getAttribute('zoom') || 2

    // Hack to Wait for childrens to be connected
    setTimeout(() => {
      this.map.setView([lat, lng], zoom)
      this.map.invalidateSize()
    })

    // Remove tabindex on a element
    this.map._controlContainer.lastElementChild.lastElementChild.firstElementChild.setAttribute(
      'tabindex',
      -1
    )
    this.fullScreenBtn.setAttribute('tabindex', -1)
    let control = this.map._controlContainer.firstElementChild.children[0].children
    for (let c of control) c.setAttribute('tabindex', -1)
  }

  /** * Refresh display of the map according to size of container */
  invalidateSize = () => this.map.invalidateSize()

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.#updateControls()
        break
      case 'readonly':
        this.#updateControls()
        break
      case 'fullscreen':
        this.setFullScreen(newValue != null)
        break
      default:
        super.attributeChangedCallback(name, oldValue, newValue)
    }
  }

  static get observedAttributes() {
    return ['label', 'helper', 'error', 'disabled', 'readonly', 'fullscreen']
  }
}

/** Represent a foreign file for the file input */
export class ForeignFile {
  constructor(name, size, type, file_storage_status) {
    this.name = name
    this.size = size
    this.type = type
    this.file_storage_status = file_storage_status
  }
}

/** The error sent when setting the value of an input failed */
export class SetValueError extends Error {
  constructor(input, value, message) {
    super(message)
    this.target = input
    this.value = value
  }
}

// Define the new elements
customElements.define('action-card', ActionCard)
customElements.define('action-card-file', FileCard)
customElements.define('action-icon', ActionIcon)
customElements.define('action-icon-list', ActionIconList)
customElements.define('text-input', TextInput)
customElements.define('number-input', NumberInput)
customElements.define('date-input', DateInput)
customElements.define('select-input', SelectInput)
customElements.define('selectm-input', SelectMultipleInput)
customElements.define('datalist-input', DataListInput)
customElements.define('textarea-input', TextareaInput)
customElements.define('multi-textarea', MultiTextArea)
customElements.define('file-input', FilesInput)
customElements.define('checkbox-input', Checkbox)
customElements.define('map-input', MapInput)
