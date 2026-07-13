const getExchangeRates = require('./getExchangeRates')
const getLatamRate = require('./getLatamRate')
const generateReport = require('./generateReport')

module.exports = [getExchangeRates, getLatamRate, generateReport]
