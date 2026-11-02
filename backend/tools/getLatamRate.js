const { fetchLatamRate, SUPPORTED_CURRENCIES } = require('../infrastructure/latamCurrencyClient')
const { calculateConversionValues } = require('../services/conversionService')
const { z } = require('zod')

const VALID_CODES = Object.keys(SUPPORTED_CURRENCIES)

const LatamOutputSchema = z.object({
  quote: z.object({
    currency: z.string(),
    name: z.string(),
    buy: z.number(),
    sell: z.number(),
    spread: z.number(),
    updatedAt: z.string(),
  }),
  conversion: z
    .object({
      amount: z.number(),
      currency: z.string(),
      direction: z.enum(['TO_ARS', 'FROM_ARS']),
      reference: z.object({ exchangeRate: z.number().positive(), result: z.number() }),
      transaction: z.object({
        side: z.enum(['buy', 'sell']),
        exchangeRate: z.number().positive(),
        result: z.number(),
      }),
    })
    .nullable(),
  source: z.string(),
  timestamp: z.string(),
  note: z.string().nullable(),
})

const definition = {
  name: 'get_latam_rate',
  description:
    'Get a Latin American or European currency rate against the Argentine peso. ' +
    'Currencies with Argentine buy/sell quotes (dolarapi.com): EUR, BRL, CLP, UYU. ' +
    'Currencies with an interbank reference rate (fawazahmed0/exchange-api, buy=sell): ' +
    'MXN, COP, PEN, PYG, BOB, VES, GTQ, HNL, NIO, CRC, DOP. ' +
    'Provide amount to calculate a conversion.',
  parameters: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        enum: VALID_CODES,
        description: 'ISO currency code to look up.',
      },
      amount: {
        type: 'number',
        description: 'Amount to convert. Omit to skip conversion.',
      },
      direction: {
        type: 'string',
        enum: ['TO_ARS', 'FROM_ARS'],
        description:
          'TO_ARS: foreign currency to pesos (default). FROM_ARS: pesos to foreign currency.',
      },
    },
    required: ['currency'],
  },
}

function calculateConversion(quote, amount, direction, currency) {
  const isToArs = direction !== 'FROM_ARS'

  return {
    amount,
    currency,
    direction: isToArs ? 'TO_ARS' : 'FROM_ARS',
    ...calculateConversionValues(quote, amount, isToArs),
  }
}

async function handler({ currency, amount, direction } = {}) {
  if (!currency) throw new Error('The currency parameter is required')

  const code = currency.toUpperCase()
  const { data, source, timestamp, isReferenceRate } = await fetchLatamRate(code)

  const { name, buy, sell, updatedAt } = data
  const spread = buy === sell ? 0 : Number(((sell - buy) / buy * 100).toFixed(4))

  const quote = { currency: code, name, buy, sell, spread, updatedAt }
  const conversion = amount != null ? calculateConversion(quote, amount, direction, code) : null

  const note = isReferenceRate
    ? 'Interbank reference rate. This is not a quote from an Argentine exchange bureau.'
    : null

  return LatamOutputSchema.parse({ quote, conversion, source, timestamp, note })
}

module.exports = { definition, handler }
