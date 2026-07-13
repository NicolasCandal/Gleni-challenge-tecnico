const { fetchEuroRate } = require('../infrastructure/euroApiClient')
const { z } = require('zod')

const EsquemaSalidaEuro = z.object({
  cotizacion: z.object({
    moneda: z.literal('EUR'),
    nombre: z.string(),
    compra: z.number(),
    venta: z.number(),
    spread: z.number(),
    fechaActualizacion: z.string(),
  }),
  conversion: z
    .object({
      monto: z.number(),
      direccion: z.enum(['EUR_A_ARS', 'ARS_A_EUR']),
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
  name: 'get_euro_rate',
  description:
    'Obtiene la cotizacion actual del Euro (EUR) en Argentina segun el tipo de cambio oficial (dolarapi.com). Devuelve compra, venta y spread. Si se pasa amount, calcula la conversion: referencia (al precio de venta, valor de mercado) y operacion (lo que recibe/paga el usuario en la transaccion real).',
  parameters: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description:
          'Monto a convertir. Si se omite, no se calcula conversion.',
      },
      direction: {
        type: 'string',
        enum: ['EUR_A_ARS', 'ARS_A_EUR'],
        description: 'Direccion de la conversion. Default: EUR_A_ARS.',
      },
    },
    required: [],
  },
}

function calcularConversion(cotizacion, monto, direccion) {
  const redondear = (x) => Math.round(x * 100) / 100
  const esEurAars = direccion !== 'ARS_A_EUR'

  // referencia: precio de venta (el que citan los medios)
  const refTipoCambio = cotizacion.venta
  const refResultado = esEurAars
    ? redondear(monto * refTipoCambio)
    : redondear(monto / refTipoCambio)

  // operacion: precio real para el usuario
  // EUR_A_ARS: usuario vende EUR -> casa compra -> precio compra
  // ARS_A_EUR: usuario compra EUR -> casa vende -> precio venta
  const opLado = esEurAars ? 'compra' : 'venta'
  const opTipoCambio = esEurAars ? cotizacion.compra : cotizacion.venta
  const opResultado = esEurAars
    ? redondear(monto * opTipoCambio)
    : redondear(monto / opTipoCambio)

  return {
    monto,
    direccion: esEurAars ? 'EUR_A_ARS' : 'ARS_A_EUR',
    referencia: { tipoCambio: refTipoCambio, resultado: refResultado },
    operacion: { lado: opLado, tipoCambio: opTipoCambio, resultado: opResultado },
  }
}

async function manejador({ amount, direction } = {}) {
  const { datos, fuente, timestamp } = await fetchEuroRate()

  const { nombre, compra, venta, fechaActualizacion } = datos
  const spread = Number(((venta - compra) / compra * 100).toFixed(2))

  const cotizacion = { moneda: 'EUR', nombre, compra, venta, spread, fechaActualizacion }
  const conversion = amount != null ? calcularConversion(cotizacion, amount, direction) : null

  return EsquemaSalidaEuro.parse({ cotizacion, conversion, fuente, timestamp })
}

module.exports = { definicion, manejador }
