'use strict';

export const lastElementOfArray = (anArray) =>
  !Array.isArray(anArray) ? null : anArray[anArray.length - 1];

/**
 * Get the extension of a file name
 */
export const getFileExtension = (fileName) => lastElementOfArray(`${fileName}`.split('.'));

/**
 * Split an input string with an array of single characters
 * @param {*} strInput the input string
 * @param {*} delimiters an array of single characters
 * @returns the splitted string
 */
export const multiSplit = (inputStr, singleCharDelimiterArray, shouldTrim) => {
  if (!inputStr) return [];
  if (!Array.isArray(singleCharDelimiterArray) && singleCharDelimiterArray.length > 0)
    throw new Error('Wrong use, second parameter should be an array');

  // Converts input delimiters array elements into string
  const delimiters = [];
  singleCharDelimiterArray.map((c) => {
    if (`${c}`.length !== 1)
      throw new Error('Wrong use, second parameter should be an array of single character strings');
    delimiters.push(`${c}`);
  });

  // Examine input string, one character at a time
  const result = [];
  let chunk = '';
  for (let i = 0; i < inputStr.length; i++) {
    let isDelimiter = false;
    // Check if the current input character is a delimiter
    for (let j = 0; j < delimiters.length; j++) {
      if (inputStr[i] === delimiters[j]) {
        // Current input character is a delimiter
        if (shouldTrim) chunk = chunk.trim();
        if (chunk.length > 0) result.push(chunk);
        chunk = '';
        isDelimiter = true;
        break;
      }
    }
    if (!isDelimiter) chunk += inputStr[i];
  }
  if (shouldTrim) chunk = chunk.trim();
  if (chunk.length > 0) result.push(chunk);
  return result;
};

/**
 *
 * @param {String} name Name of the cookie we want to access.
 *  Only non-httpOnly cookies are accessible by definition
 * @returns the value of the cookie
 */
export function getCookie(name) {
  const cookieDecoded = decodeURIComponent(document.cookie); //to be careful
  const cookieArray = cookieDecoded.split('; ');
  for (let i = 0; i < cookieArray.length; i++) {
    const val = cookieArray[i];
    if (val.startsWith(`${name}=`)) {
      const cookie = val.substring(name.length + 1);
      return cookie;
    }
  }
}

/**
 * Little utility to enable copying of data inside a RudiForm
 * Mainly for dev purposes
 * @author Florian Desmortreux
 */

export function devPaste(rudiForm) {
  try {
    const devPaste = document.getElementById('dev_paste');
    devPaste.focus();
    devPaste.addEventListener('keydown', function (e) {
      if (e.key == 'Enter' && !e.shiftKey) {
        try {
          var val = JSON.parse(devPaste.value);
        } catch (e) {
          console.error(e);
        }
        e.preventDefault();
        e.stopPropagation();
        rudiForm.setValue(val);
        if (e.ctrlKey) rudiForm.showResultOverlay();
      }
    });
  } catch {
    // Nothing
  }
}

