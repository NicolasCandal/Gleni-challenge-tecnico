const getExchangeRates = require('./getExchangeRates')
const getEuroRate = require('./getEuroRate')
const generateReport = require('./generateReport')

module.exports = [getExchangeRates, getEuroRate, generateReport]
