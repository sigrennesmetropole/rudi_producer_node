const { expect } = require('@jest/globals')
const databaseManager = require('../database/database')
const controllers = require('./roleController')
const { Response } = require('jest-express/lib/response')

jest.mock('../database/database')
let response

describe('RoleController', () => {
  beforeEach(() => {
    response = new Response()
  })

  afterEach(() => {
    response.resetMocked()
  })

  test('roleList should return data', async () => {
    databaseManager.getRoles.mockImplementation(() =>
      Promise.resolve([{ role: 'role', desc: 'desc' }])
    )

    await controllers.roleList({}, response, null)

    expect(response.body).toStrictEqual([{ role: 'role', desc: 'desc' }])
  })
  test('roleList should return error', async () => {
    const error = new Error('Error: Database Error')
    error.toJSON = () => error
    databaseManager.getRoles.mockImplementation(() => Promise.reject(error))

    await controllers.roleList({}, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })
  test('getRoleById should return data', async () => {
    databaseManager.getRoleById.mockImplementation(() =>
      Promise.resolve({ role: 'role', desc: 'desc' })
    )

    await controllers.getRoleById({ params: { role: 'role' } }, response, null)

    expect(response.body).toStrictEqual({ role: 'role', desc: 'desc' })
  })
  test('getRoleById should return error', async () => {
    const error = new Error('Error: Database Error')
    error.toJSON = () => error
    databaseManager.getRoleById.mockImplementation(() => Promise.reject(error))

    await controllers.getRoleById({ params: { role: 'role' } }, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })

  test('getUserRolesByUsername should return data', async () => {
    databaseManager.getUserRolesByUsername.mockImplementation(() =>
      Promise.resolve([{ role: 'role', userId: 'id' }])
    )

    await controllers.getUserRolesByUsername({ params: { username: 'user' } }, response, null)

    expect(response.body).toStrictEqual([{ role: 'role', userId: 'id' }])
  })
  test('getUserRolesByUsername should return error', async () => {
    const error = new Error('Error: Database Error')
    error.toJSON = () => error
    databaseManager.getUserRolesByUsername.mockImplementation(() => Promise.reject(error))

    await controllers.getUserRolesByUsername({ params: { username: 'user' } }, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })

  test('deleteUserRole should return data', async () => {
    databaseManager.deleteUserRole.mockImplementation(() => Promise.resolve({}))

    await controllers.deleteUserRole({ params: { role: 'role', userId: 'id' } }, response, null)

    expect(response.body).toStrictEqual({})
  })
  test('deleteUserRole should return error', async () => {
    const error = new Error('Error: Database Error')
    error.toJSON = () => error
    databaseManager.deleteUserRole.mockImplementation(() => Promise.reject(error))

    await controllers.deleteUserRole({ params: { role: 'role', userId: 'id' } }, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })

  test('postUserRole should return data', async () => {
    databaseManager.createUserRole.mockImplementation(() =>
      Promise.resolve({ role: 'role', userId: 'id' })
    )

    await controllers.postUserRole({ body: { role: 'role', userId: 'id' } }, response, null)

    expect(response.body).toStrictEqual({ role: 'role', userId: 'id' })
  })
  test('postUserRole should return error', async () => {
    const error = new Error('Error: Database Error')
    error.toJSON = () => error
    databaseManager.createUserRole.mockImplementation(() => Promise.reject(error))

    await controllers.postUserRole({ body: { role: 'role', userId: 'id' } }, response, null)

    expect(response.statusCode).toStrictEqual(501)
  })
})
