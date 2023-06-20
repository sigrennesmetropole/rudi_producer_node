const { expect } = require('@jest/globals')
const axios = require('axios')
const controllers = require('./mediaController')
const { Response } = require('jest-express/lib/response')

jest.mock('axios')
let response

describe('MediaController', () => {
  beforeEach(() => {
    response = new Response()
  })

  afterEach(() => {
    response.resetMocked()
  })

  test('getMediaById should return data', async () => {
    const data = { global_id: 'global', local_id: 'local', doi: 'string' }
    axios.get.mockImplementation(() => Promise.resolve({ data: data }))

    await controllers.getMediaById({ params: { id: 'aaaa' } }, response, null)

    expect(response.body).toStrictEqual(data)
  })
  test('getMediaById should return error', async () => {
    const error = new Error('Error: Request failed with status code 500')
    let axiosError = {
      status: 500,
      response: { error },
    }
    axiosError.toJSON = () => axiosError
    axios.get.mockImplementation(() => Promise.reject(axiosError))

    await controllers.getMediaById({ params: { id: 'aaaa' } }, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })
})
