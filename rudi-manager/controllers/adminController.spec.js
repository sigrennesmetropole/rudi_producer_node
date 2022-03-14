const { expect } = require('@jest/globals');
const axios = require('axios');
const { createRudiToken } = require('../utils/utils');
const databaseManager = require('../database/database');
const controllers = require('./adminController');
const { Response } = require('jest-express/lib/response');

jest.mock('axios');
jest.mock('../utils/utils');
jest.mock('../database/database');
let response;

describe('AdminController', () => {
  beforeEach(() => {
    response = new Response();
    createRudiToken.mockImplementation(() => 'token');
  });

  afterEach(() => {
    response.resetMocked();
  });

  test('getEnum should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getEnum({}, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getEnum should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getEnum({}, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getLicences should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getLicences(null, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getLicences should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getLicences(null, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getThemeByLang should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getThemeByLang({ params: { lang: 'fr' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getThemeByLang should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getThemeByLang({ params: { lang: 'fr' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getDefaultForm should return data', async () => {
    databaseManager.getDefaultForm.mockImplementation((user) => Promise.resolve({ test: user }));

    await controllers.getDefaultForm({ user: { username: 'toto' } }, response, null);

    expect(response.body).toStrictEqual({ test: { username: 'toto' } });
  });
  test('getDefaultForm should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    databaseManager.getDefaultForm.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getDefaultForm({ user: { username: 'toto' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });
  test('deleteDefaultForm should return data', async () => {
    databaseManager.deleteDefaultForm.mockImplementation(() => Promise.resolve({}));

    await controllers.deleteDefaultForm({ user: { username: 'toto' } }, response, null);

    expect(response.body).toStrictEqual({});
  });
  test('deleteDefaultForm should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    databaseManager.deleteDefaultForm.mockImplementation(() => Promise.reject(axiosError));

    await controllers.deleteDefaultForm({ user: { username: 'toto' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('putDefaultForm should return data', async () => {
    databaseManager.updateDefaultForm.mockImplementation(() => Promise.resolve({ test: 'tata' }));

    await controllers.putDefaultForm(
      { user: { username: 'toto' }, body: { test: 'tata' } },
      response,
      null,
    );

    expect(response.body).toStrictEqual({ test: 'tata' });
  });
  test('putDefaultForm should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    databaseManager.updateDefaultForm.mockImplementation(() => Promise.reject(axiosError));

    await controllers.putDefaultForm(
      { user: { username: 'toto' }, body: { test: 'tata' } },
      response,
      null,
    );

    expect(response.statusCode).toStrictEqual(501);
  });
});
