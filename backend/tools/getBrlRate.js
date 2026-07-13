const { fetchBrlRate } = require('../infrastructure/brlApiClient')
const { z } = require('zod')

const EsquemaSalidaBrl = z.object({
  cotizacion: z.object({
    moneda: z.literal('BRL'),
    nombre: z.string(),
    compra: z.number(),
    venta: z.number(),
    spread: z.number(),
    fechaActualizacion: z.string(),
  }),
  conversion: z
    .object({
      monto: z.number(),
      direccion: z.enum(['BRL_A_ARS', 'ARS_A_BRL']),
      referencia: z.object({ tipoCambio: z.number().positive(), resultado: z.number() }),
      operacion: z.object({
        lado: z.enum(['compra', 'venta']),
        tipoCambio: z.number().positive(),
        resultado: z.number(),
      }),
    })
    .nullable(),
  fuente: z.string(),
  timestamp: z.string(),
})

const definicion = {
  name: 'get_brl_rate',
  description:
    'Obtiene la cotizacion actual del Real Brasileno (BRL) en Argentina segun el tipo de cambio oficial (dolarapi.com). Devuelve compra, venta y spread. Si se pasa amount, calcula la conversion: referencia (al precio de venta, valor de mercado) y operacion (lo que recibe/paga el usuario en la transaccion real).',
  parameters: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Monto a convertir. Si se omite, no se calcula conversion.',
      },
      direction: {
        type: 'string',
        enum: ['BRL_A_ARS', 'ARS_A_BRL'],
        description: 'Direccion de la conversion. Default: BRL_A_ARS.',
      },
    },
    required: [],
  },
}

function calcularConversion(cotizacion, monto, direccion) {
  const redondear = (x) => Math.round(x * 100) / 100
  const esBrlAars = direccion !== 'ARS_A_BRL'

  const refTipoCambio = cotizacion.venta
  const refResultado = esBrlAars
    ? redondear(monto * refTipoCambio)
    : redondear(monto / refTipoCambio)

  // BRL_A_ARS: usuario vende BRL -> casa compra -> precio compra
  // ARS_A_BRL: usuario compra BRL -> casa vende -> precio venta
  const opLado = esBrlAars ? 'compra' : 'venta'
  const opTipoCambio = esBrlAars ? cotizacion.compra : cotizacion.venta
  const opResultado = esBrlAars
    ? redondear(monto * opTipoCambio)
    : redondear(monto / opTipoCambio)

  return {
    monto,
    direccion: esBrlAars ? 'BRL_A_ARS' : 'ARS_A_BRL',
    referencia: { tipoCambio: refTipoCambio, resultado: refResultado },
    operacion: { lado: opLado, tipoCambio: opTipoCambio, resultado: opResultado },
  }
}

async function manejador({ amount, direction } = {}) {
  const { datos, fuente, timestamp } = await fetchBrlRate()

  const { nombre, compra, venta, fechaActualizacion } = datos
  const spread = Number(((venta - compra) / compra * 100).toFixed(2))

  const cotizacion = { moneda: 'BRL', nombre, compra, venta, spread, fechaActualizacion }
  const conversion = amount != null ? calcularConversion(cotizacion, amount, direction) : null

  return EsquemaSalidaBrl.parse({ cotizacion, conversion, fuente, timestamp })
}

module.exports = { definicion, manejador }
