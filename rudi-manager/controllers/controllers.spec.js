const { expect } = require('@jest/globals');
const axios = require('axios');
const { createRudiToken } = require('../utils/utils');
const controllers = require('./controllers');
const { Response } = require('jest-express/lib/response');

jest.mock('axios');
jest.mock('../utils/utils');
let response;

describe('Controllers', () => {
  beforeEach(() => {
    response = new Response();
    createRudiToken.mockImplementation(() => 'token');
  });

  afterEach(() => {
    response.resetMocked();
  });

  test('resourcesList should return data', async () => {
    const data = [{ global_id: 'global', local_id: 'local', doi: 'string' }];
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.resourcesList({}, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('resourcesList should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.resourcesList({}, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getResourceById should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getResourceById({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getResourceById should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getResourceById({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('postResources should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.post.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.postResources({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('postResources should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.post.mockImplementation(() => Promise.reject(axiosError));

    await controllers.postResources({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('putResources should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.put.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.putResources({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('putResources should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.put.mockImplementation(() => Promise.reject(axiosError));

    await controllers.putResources({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('deleteResource should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.delete.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.deleteResource({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('deleteResource should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.delete.mockImplementation(() => Promise.reject(axiosError));

    await controllers.deleteResource({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });
});
