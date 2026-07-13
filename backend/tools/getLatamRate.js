const { fetchLatamRate, MONEDAS_SOPORTADAS, MONEDAS_DOLARAPI } = require('../infrastructure/latamCurrencyClient')
const { z } = require('zod')

const CODIGOS_VALIDOS = Object.keys(MONEDAS_SOPORTADAS)

const EsquemaSalidaLatam = z.object({
  cotizacion: z.object({
    moneda: z.string(),
    nombre: z.string(),
    compra: z.number(),
    venta: z.number(),
    spread: z.number(),
    fechaActualizacion: z.string(),
  }),
  conversion: z
    .object({
      monto: z.number(),
      moneda: z.string(),
      direccion: z.enum(['TO_ARS', 'FROM_ARS']),
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
  nota: z.string().nullable(),
})

const definicion = {
  name: 'get_latam_rate',
  description:
    'Obtiene la cotizacion de una moneda de America Latina o Europa frente al peso argentino. ' +
    'Monedas con cotizacion oficial argentina (dolarapi.com, con compra/venta): EUR, BRL, CLP, UYU. ' +
    'Monedas con tasa de referencia interbancaria (fawazahmed0/exchange-api, compra=venta): ' +
    'MXN, COP, PEN, PYG, BOB, VES, GTQ, HNL, NIO, CRC, DOP. ' +
    'Si se pasa amount, calcula la conversion.',
  parameters: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        enum: CODIGOS_VALIDOS,
        description: 'Codigo ISO de la moneda a consultar.',
      },
      amount: {
        type: 'number',
        description: 'Monto a convertir. Si se omite, no se calcula conversion.',
      },
      direction: {
        type: 'string',
        enum: ['TO_ARS', 'FROM_ARS'],
        description:
          'TO_ARS: moneda extranjera -> pesos (default). FROM_ARS: pesos -> moneda extranjera.',
      },
    },
    required: ['currency'],
  },
}

function calcularConversion(cotizacion, monto, direccion, moneda) {
  const redondear = (x) => Math.round(x * 100) / 100
  const esToArs = direccion !== 'FROM_ARS'

  const refTipoCambio = cotizacion.venta
  const refResultado = esToArs
    ? redondear(monto * refTipoCambio)
    : redondear(monto / refTipoCambio)

  const opLado = esToArs ? 'compra' : 'venta'
  const opTipoCambio = esToArs ? cotizacion.compra : cotizacion.venta
  const opResultado = esToArs
    ? redondear(monto * opTipoCambio)
    : redondear(monto / opTipoCambio)

  return {
    monto,
    moneda,
    direccion: esToArs ? 'TO_ARS' : 'FROM_ARS',
    referencia: { tipoCambio: refTipoCambio, resultado: refResultado },
    operacion: { lado: opLado, tipoCambio: opTipoCambio, resultado: opResultado },
  }
}

async function manejador({ currency, amount, direction } = {}) {
  if (!currency) throw new Error('El parametro currency es requerido')

  const code = currency.toUpperCase()
  const { datos, fuente, timestamp, esTasaReferencia } = await fetchLatamRate(code)

  const { nombre, compra, venta, fechaActualizacion } = datos
  const spread = compra === venta ? 0 : Number(((venta - compra) / compra * 100).toFixed(4))

  const cotizacion = { moneda: code, nombre, compra, venta, spread, fechaActualizacion }
  const conversion = amount != null ? calcularConversion(cotizacion, amount, direction, code) : null

  const esDolarapi = !!MONEDAS_DOLARAPI[code]
  const nota = esTasaReferencia
    ? 'Tasa de referencia interbancaria. No representa el tipo de cambio de una casa de cambio argentina.'
    : null

  return EsquemaSalidaLatam.parse({ cotizacion, conversion, fuente, timestamp, nota })
}

module.exports = { definicion, manejador }
