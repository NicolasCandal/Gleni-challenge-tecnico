const { createBaseQuoteDTO } = require('../dtos/ExchangeDTO')

function mapQuote(item) {
  return createBaseQuoteDTO(item)
}

function rawToQuotes(data, source, isFallback = false) {
  const quotes = data
    .filter(item => item.buy !== null && item.sell !== null)
    .map(mapQuote)

  const omitted = data
    .filter(item => item.buy === null || item.sell === null)
    .map(item => item.name)

  const warning = isFallback
    ? 'Partial data: only official and blue rates are available because the primary source is unavailable'
    : null

  return {
    quotes,
    omitted,
    warning,
    source,
    timestamp: new Date().toISOString()
  }
}

module.exports = { rawToQuotes }
