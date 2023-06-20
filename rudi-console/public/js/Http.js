'use strict';

/**
 * This module give simple way to make
 * http request with Promise
 * @module HttpClient
 * @author Florian Desmortreux
 */

class HttpRequest extends XMLHttpRequest {
  constructor(method, url, headers) {
    super();
    this.method = method;
    this.url = url;
    this.open(this.method, this.url);
    if (headers)
      for (const [header, value] of Object.entries(headers)) {
        try {
          this.setRequestHeader(header, value);
        } catch (e) {
          console.log('HttpRequest: header=', header, ', value=', encodeURIComponent(value));
          this.setRequestHeader(header, encodeURIComponent(value));
        }
      }
  }

  static get = (url, headers) => new HttpRequest('GET', url, headers);
  static post = (url, headers) => new HttpRequest('POST', url, headers);
  static put = (url, headers) => new HttpRequest('PUT', url, headers);
  static delete = (url, headers) => new HttpRequest('DELETE', url, headers);

  /** Initiates the request.
   * @param {Object} body provides the request body, if any, and is ignored if the request method is GET or HEAD.
   * @param {String} mimeType optional MIME type of the body (e.g. 'application/json;charset=UTF-8')
   * @return {Promise} a promise of the XmlHttpRequest
   * @throws "InvalidStateError" DOMException if either state is not opened or the send() flag is set.
   */
  send(body) {
    if (this.readyState != XMLHttpRequest.OPENED)
      throw new DOMException(
        `Failed to execute 'send' on '${this.constructor.name}': The object's state must be OPENED.`
      );
    return new Promise((resolve, reject) => {
      this.addEventListener('error', () => reject(this));
      this.addEventListener('load', () => {
        if (this.readyState == 4 && this.status == 200) resolve(this.responseText);
        else reject(this);
      });
      super.send(body);
    });
  }

  /** Initiates the request.
   * @param {Object} body provides the request body, if any, and is ignored if the request method is GET or HEAD.
   * @return {Promise} a promise of the XmlHttpRequest
   * @throws "InvalidStateError" DOMException if either state is not opened or the send() flag is set.
   */
  sendJson = async (body) => {
    this.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    return await this.send(JSON.stringify(body));
  };
}
class JsonHttpRequest extends HttpRequest {
  static get = (url, headers) => new JsonHttpRequest('GET', url, headers);
  static post = (url, headers) => new JsonHttpRequest('POST', url, headers);
  static put = (url, headers) => new JsonHttpRequest('PUT', url, headers);
  static delete = (url, headers) => new JsonHttpRequest('DELETE', url, headers);

  /** Initiates the request.
   * @param body provides the request body, if any, and is ignored if the request method is GET or HEAD.
   * @return a promise of the XmlHttpRequest
   * @throws "InvalidStateError" DOMException if either state is not opened or the send() flag is set.
   */
  async send(body) {
    let res = await super.send(body);
    if (res == undefined) return;
    try {
      res = JSON.parse(res);
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new SyntaxError(
          `Cannot parse result of request '${this.method} ${this.url}'\n${res}`,
          { cause: e }
        );
      console.error(e);
      throw e;
    }
    return res;
  }

  /** Initiates the request which body is JSON
   * @param body provides the request body, if any, and is ignored if the request method is GET or HEAD.
   * @return a promise of the XmlHttpRequest, the result is parse as json
   * @throws "InvalidStateError" DOMException if either state is not opened or the send() flag is set.
   */
  async sendJson(body) {
    // console.debug('T (sendJson)', body);
    let res = await super.sendJson(body);
    if (res == undefined) return;
    try {
      res = JSON.parse(res);
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new SyntaxError(
          `Cannot parse result of request '${this.method} ${this.url}\n${res}: ${e}`
        );
      console.error(e);
      throw e;
    }
    return res;
  }
}

export { HttpRequest, JsonHttpRequest };
