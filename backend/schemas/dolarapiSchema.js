const { z } = require('zod')

// Provider keys and identifiers are fixed by dolarapi's Spanish API contract.
const RATE_TYPES = {
  oficial: { rateType: 'official', name: 'Official' },
  blue: { rateType: 'blue', name: 'Blue' },
  bolsa: { rateType: 'mep', name: 'MEP' },
  contadoconliqui: { rateType: 'ccl', name: 'CCL' },
  mayorista: { rateType: 'wholesale', name: 'Wholesale' },
  cripto: { rateType: 'crypto', name: 'Crypto' },
  tarjeta: { rateType: 'card', name: 'Card' },
}

const GetDolarApi = z.object({
  moneda: z.string(),
  casa: z.enum(Object.keys(RATE_TYPES)),
  nombre: z.string(),
  compra: z.number().nullable(),
  venta: z.number().nullable(),
  fechaActualizacion: z.string().datetime(),
}).transform(raw => ({
  currency: raw.moneda,
  ...RATE_TYPES[raw.casa],
  buy: raw.compra,
  sell: raw.venta,
  updatedAt: raw.fechaActualizacion,
}))

const GetDolarApiResponse = z.array(GetDolarApi)

module.exports = { GetDolarApi, GetDolarApiResponse }
