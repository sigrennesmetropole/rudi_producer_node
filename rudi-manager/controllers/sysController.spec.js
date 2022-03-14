const { expect } = require('@jest/globals');
const axios = require('axios');
const controllers = require('./sysController');
const { Response } = require('jest-express/lib/response');

jest.mock('axios');
let response;

describe('SysController', () => {
  beforeEach(() => {
    response = new Response();
  });

  afterEach(() => {
    response.resetMocked();
  });

  test('getHash should return data', async () => {
    await controllers.getHash(null, response, null);

    expect(response.statusCode).toStrictEqual(200);
    expect(response.body).not.toBeNull();
  });

  test('getFormUrl should return data', async () => {
    await controllers.getFormUrl(null, response, null);

    expect(response.statusCode).toStrictEqual(200);
    expect(response.body).toStrictEqual('https://admin-rudi.aqmo.org/shared/');
  });
});
