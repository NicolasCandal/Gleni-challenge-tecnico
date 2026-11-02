const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawToQuotes } = require('../mappers/exchangeMapper')
const { calculateSpreads, calculateGap, sortBySellPrice, addSignals, filterByTypes } = require('../services/exchangeService')
const { RateTypesSchema, ExchangeOutputSchema } = require('../schemas/exchangeSchema')
const { createConversionDTO, createExchangeOutputDTO } = require('../dtos/ExchangeDTO')
const { calculateConversionValues } = require('../services/conversionService')

const NON_RETAIL_TYPES = ['wholesale']

const definition = {
  name: 'get_exchange_rates',
  description: 'Get current US dollar exchange rates in Argentina, including the spread, gap against the official rate, and a buy/wait/neutral signal. With amount, return a reference conversion at the sell rate and the actual transaction amount the user would receive or pay.',
  parameters: {
    type: 'object',
    properties: {
      rate_types: {
        type: 'array',
        items: { type: 'string', enum: ['official', 'blue', 'mep', 'ccl', 'wholesale', 'crypto', 'card'] },
        description: 'Dollar rate types to look up. Omit to return all types.'
      },
      amount: {
        type: 'number',
        description: 'Amount to convert. Omit to skip conversion. Return conversion.reference.result at the sell rate and conversion.transaction.result at the rate applicable to the transaction.'
      },
      direction: {
        type: 'string',
        enum: ['USD_TO_ARS', 'ARS_TO_USD'],
        description: 'Conversion direction. Defaults to USD_TO_ARS.'
      }
    },
    required: []
  }
}

function calculateConversion(quotes, amount, direction) {
  const rateUsed = quotes[0]
  if (!rateUsed) return null

  const isUsdToArs = direction !== 'ARS_TO_USD'

  return createConversionDTO({
    amount,
    direction: isUsdToArs ? 'USD_TO_ARS' : 'ARS_TO_USD',
    rateUsed: rateUsed.name,
    ...calculateConversionValues(rateUsed, amount, isUsdToArs)
  })
}

async function handler({ rate_types, amount, direction } = {}, _context) {
  RateTypesSchema.parse(rate_types)

  const { data, source, isFallback } = await fetchExchangeRates()
  const mapped = rawToQuotes(data, source, isFallback)

  let quotes = calculateSpreads(mapped.quotes)
  quotes = calculateGap(quotes)
  quotes = addSignals(quotes)
  quotes = filterByTypes(quotes, rate_types)
  const sorted = sortBySellPrice(quotes)

  const hasRateTypes = Array.isArray(rate_types) && rate_types.length > 0
  const retailQuotes = hasRateTypes ? sorted : sorted.filter(c => !NON_RETAIL_TYPES.includes(c.rateType))
  const baseConversion = retailQuotes.length > 0 ? retailQuotes : sorted

  const conversion = amount != null ? calculateConversion(baseConversion, amount, direction) : null

  const output = createExchangeOutputDTO({
    quotes: sorted,
    conversion,
    omitted: mapped.omitted,
    warning: mapped.warning,
    source: mapped.source,
    timestamp: mapped.timestamp
  })

  return ExchangeOutputSchema.parse(output)
}

module.exports = { definition, handler }
