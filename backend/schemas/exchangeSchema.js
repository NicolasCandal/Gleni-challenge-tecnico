const { z } = require('zod')

const VALID_RATE_TYPES = ['official', 'blue', 'mep', 'ccl', 'wholesale', 'crypto', 'card']

const RateTypesSchema = z
  .array(z.enum(VALID_RATE_TYPES))
  .optional()

const QuoteSchema = z.object({
  rateType: z.string(),
  name: z.string(),
  buy: z.number(),
  sell: z.number(),
  updatedAt: z.string(),
  spread: z.number(),
  gap: z.number().nullable(),
  signal: z.enum(['buy', 'wait', 'neutral'])
})

const ConversionSideSchema = z.object({
  exchangeRate: z.number().positive(),
  result: z.number()
})

const ConversionSchema = z.object({
  amount: z.number(),
  direction: z.enum(['USD_TO_ARS', 'ARS_TO_USD']),
  rateUsed: z.string(),
  reference: ConversionSideSchema,
  transaction: ConversionSideSchema.extend({ side: z.enum(['buy', 'sell']) })
})

const ExchangeOutputSchema = z.object({
  quotes: z.array(QuoteSchema),
  conversion: ConversionSchema.nullable(),
  omitted: z.array(z.string()),
  warning: z.string().nullable(),
  source: z.string(),
  timestamp: z.string()
})

module.exports = { RateTypesSchema, QuoteSchema, ConversionSchema, ExchangeOutputSchema }
