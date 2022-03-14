const { expect } = require('@jest/globals');
const axios = require('axios');
const { createRudiToken } = require('../utils/utils');
const controllers = require('./contactController');
const { Response } = require('jest-express/lib/response');

jest.mock('axios');
jest.mock('../utils/utils');
let response;

describe('ContactController', () => {
  beforeEach(() => {
    response = new Response();
    createRudiToken.mockImplementation(() => 'token');
  });

  afterEach(() => {
    response.resetMocked();
  });

  test('contactList should return data', async () => {
    const data = [{ global_id: 'global', local_id: 'local', doi: 'string' }];
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.contactList({}, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('contactList should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.contactList({}, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getContactById should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getContactById({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getContactById should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getContactById({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('postContact should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.post.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.postContact({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('postContact should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.post.mockImplementation(() => Promise.reject(axiosError));

    await controllers.postContact({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('putContact should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.put.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.putContact({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('putContact should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.put.mockImplementation(() => Promise.reject(axiosError));

    await controllers.putContact({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('deleteContact should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.delete.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.deleteContact({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('deleteContact should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.delete.mockImplementation(() => Promise.reject(axiosError));

    await controllers.deleteContact({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });
});
