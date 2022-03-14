const { expect } = require('@jest/globals');
const axios = require('axios');
const { createRudiToken } = require('../utils/utils');
const controllers = require('./orgaController');
const { Response } = require('jest-express/lib/response');

jest.mock('axios');
jest.mock('../utils/utils');
let response;

describe('OrgaController', () => {
  beforeEach(() => {
    response = new Response();
    createRudiToken.mockImplementation(() => 'token');
  });

  afterEach(() => {
    response.resetMocked();
  });

  test('orgaList should return data', async () => {
    const data = [{ global_id: 'global', local_id: 'local', doi: 'string' }];
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.orgaList({}, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('orgaList should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.orgaList({}, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('getOrgaById should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.get.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.getOrgaById({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('getOrgaById should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.get.mockImplementation(() => Promise.reject(axiosError));

    await controllers.getOrgaById({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('postOrga should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.post.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.postOrga({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('postOrga should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.post.mockImplementation(() => Promise.reject(axiosError));

    await controllers.postOrga({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });

  test('putOrga should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.put.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.putOrga({ body: data }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('putOrga should return error', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };

    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.put.mockImplementation(() => Promise.reject(axiosError));

    await controllers.putOrga({ body: data }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });
  test('deleteOrga should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' };
    axios.delete.mockImplementation(() => Promise.resolve({ data: data }));

    await controllers.deleteOrga({ params: { id: 'aaaa' } }, response, null);

    expect(response.body).toStrictEqual(data);
  });
  test('deleteOrga should return error', async () => {
    const error = new Error('Error: Request failed with status code 500');
    let axiosError = {
      status: 500,
      response: { error },
    };
    axiosError.toJSON = () => axiosError;
    axios.delete.mockImplementation(() => Promise.reject(axiosError));

    await controllers.deleteOrga({ params: { id: 'aaaa' } }, response, null);

    expect(response.statusCode).toStrictEqual(501);
  });
});
