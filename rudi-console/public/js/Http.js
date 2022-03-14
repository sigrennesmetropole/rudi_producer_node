"use strict";

/**
 * This module give simple way to make
 * http request with Promise
 * @module HttpClient
 * @author Florian Desmortreux
 */

/**
 * GET request to aUrl
 * @param {String} aUrl
 * @returns the promise of this request
 */
function get(aUrl) {
  return new Promise((resolve, reject) => {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onerror = function (e) {
      reject(e, aUrl);
    };
    anHttpRequest.onload = function () {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
        resolve(anHttpRequest.responseText);
      else reject(anHttpRequest.responseText);
    };
    anHttpRequest.open("GET", aUrl, true);
    anHttpRequest.send(null);
  });
}

/**
 * GET request to aUrl synchronously
 * @param {String} aUrl
 * @returns the result of the request
 */
function getSync(aUrl) {
  var anHttpRequest = new XMLHttpRequest();
  anHttpRequest.onerror = function (e) {
    console.log("error", aUrl);
    throw e;
  };
  anHttpRequest.open("GET", aUrl, false);
  anHttpRequest.send(null);
  if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
    return anHttpRequest.responseText;
  else throw anHttpRequest.responseText;
}

/**
 * POST request to aUrl, posting value
 * @param {String} aUrl
 * @param {*} value to post
 * @returns the promise of this request
 */
function post(aUrl, value) {
  return new Promise((resolve, reject) => {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onerror = function (e) {
      console.log("error", aUrl);
      throw e;
    };
    anHttpRequest.onload = function () {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
        resolve(anHttpRequest.responseText);
      else reject(anHttpRequest.responseText);
    };
    anHttpRequest.open("POST", aUrl, true);
    anHttpRequest.send(value);
  });
}

/**
 * GET request a JSON object to aUrl
 * @param {String} aUrl
 * @returns the promise of this request, the result is parsed to JSON
 */
function getJson(url) {
  return get(url).then((res) => {
    if (res == undefined) throw "Not available " + url;
    try {
      res = JSON.parse(res);
    } catch (e) {
      throw "Parsing error: " + e;
    }
    return res;
  });
}

/**
 * GET request a JSON object to aUrl, synchronously
 * @param {String} aUrl
 * @returns the result parsed to a JSON object (can be array)
 */
function getJsonSync(url) {
  console.log("getJsonSync: " + url);
  var res = getSync(url, true);
  if (res == undefined) throw "Not available " + url;
  try {
    res = JSON.parse(res);
    console.log(res);
  } catch (e) {
    console.log("'" + res + "'", url);
    console.error("Parsing error:", e);
  }
  return res;
}

/**
 * POST request to aUrl, posting value.
 * Value is stringify and a header is added to
 * the request
 * @param {String} aUrl
 * @param {Object|Array} value to post
 * @returns the promise of this request
 */
function postJson(aUrl, value) {
  return new Promise((resolve, reject) => {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onerror = function (e) {
      reject(e);
    };
    anHttpRequest.onload = function () {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200) {
        try {
          resolve(JSON.parse(anHttpRequest.responseText));
        } catch (e) {
          reject(anHttpRequest.responseText);
        }
      } else reject(anHttpRequest.responseText);
    };
    anHttpRequest.open("POST", aUrl, true);
    anHttpRequest.setRequestHeader(
      "Content-Type",
      "application/json;charset=UTF-8"
    );
    anHttpRequest.send(JSON.stringify(value));
  });
}

/**
 * PUT request to aUrl, posting value.
 * Value is stringify and a header is added to
 * the request
 * @param {String} aUrl
 * @param {Object|Array} value to post
 * @returns the promise of this request
 */
function putJson(aUrl, value) {
  return new Promise((resolve, reject) => {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onerror = function (e) {
      reject(e);
    };
    anHttpRequest.onload = function () {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200) {
        try {
          resolve(JSON.parse(anHttpRequest.responseText));
        } catch (e) {
          reject(anHttpRequest.responseText);
        }
      } else reject(anHttpRequest.responseText);
    };
    anHttpRequest.open("PUT", aUrl, true);
    anHttpRequest.setRequestHeader(
      "Content-Type",
      "application/json;charset=UTF-8"
    );
    anHttpRequest.send(JSON.stringify(value));
  });
}

/**
 * This function give simple way to fetch data from multiple
 * sources in few lines.
 *
 * Example :
 * ```
 * let result = fetchJSON(first_url)
 *                  .and(second_url)
 *                  .and(third_url, (e) => { // Catch error function})
 *                  .getPromise();
 *
 * result.then((values) => {
 *      let first_res, second_res, third_res;
 *      [first_res, second_res, third_res] = values;
 *
 *      // Do your stuff
 * })
 * ```
 * @author Florian Desmortreux
 */
function fetchJSON(url) {
  let promise_list = [
    getJson(url)
      .then((res) => {
        return res;
      })
      .catch((e) => {
        console.error(e);
        return undefined;
      }),
  ];
  return new (class {
    constructor() {
      this.promise_list = promise_list;
    }
    /**
     * Add an other request to the list of request to make
     * @param {String} url a url from wich make a GET request
     * @param {Function} catch_callback called when request is rejected
     * @returns this
     */
    and(url, catch_callback) {
      this.promise_list.push(
        getJson(url)
          .then((res) => {
            return res;
          })
          .catch((e) => {
            if (catch_callback) return catch_callback(e);
            else throw e;
          })
      );
      return this;
    }

    /**
     * Make all requests in a Promise. The promise contains
     * all the results of the requests made in a array
     * @returns the promise with all the requests
     */
    getPromise() {
      return Promise.all(this.promise_list);
    }
  })();
}

export default {
  get,
  getSync,
  post,
  getJson,
  getJsonSync,
  postJson,
  putJson,
  fetchJSON,
};
