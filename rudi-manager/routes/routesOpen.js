const express = require('express')
const router = new express.Router()

const { getHashFun, getAppTag } = require('../config/backOptions')

router.get('/test', (req, res, next) => res.status(200).send('test'))
router.get('/hash', getHashFun)
router.get('/tag', getAppTag)

module.exports = router
