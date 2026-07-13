const getExchangeRates = require('./getExchangeRates')
const getEuroRate = require('./getEuroRate')
const getBrlRate = require('./getBrlRate')
const generateReport = require('./generateReport')

module.exports = [getExchangeRates, getEuroRate, getBrlRate, generateReport]
