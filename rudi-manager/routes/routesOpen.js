const express = require('express')
const router = new express.Router()

const { getAppTag, getTags, getHash } = require('../config/backOptions')

router.get('/test', (req, reply) => reply.status(200).send('test'))
router.get('/hash', (req, reply) => reply.status(200).send(getHash()))
router.get('/tag', (req, reply) => reply.status(200).send(getAppTag()))
router.get('/tags', (req, reply) => reply.status(200).send(getTags()))

module.exports = router
