const { fetchLatamRate, MONEDAS_SOPORTADAS } = require('../infrastructure/latamCurrencyClient')
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
})

const definicion = {
  name: 'get_latam_rate',
  description:
    'Obtiene la cotizacion actual de una moneda latinoamericana o europea en Argentina (tipo de cambio oficial, dolarapi.com). ' +
    'Monedas disponibles: EUR (Euro), BRL (Real Brasileno), CLP (Peso Chileno), UYU (Peso Uruguayo). ' +
    'Devuelve compra, venta y spread. Si se pasa amount, calcula la conversion: referencia (al precio de venta) y operacion (lo que recibe/paga el usuario en la transaccion real).',
  parameters: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        enum: CODIGOS_VALIDOS,
        description: 'Codigo de la moneda a consultar: EUR, BRL, CLP o UYU.',
      },
      amount: {
        type: 'number',
        description: 'Monto a convertir. Si se omite, no se calcula conversion.',
      },
      direction: {
        type: 'string',
        enum: ['TO_ARS', 'FROM_ARS'],
        description:
          'Direccion de la conversion. TO_ARS: moneda extranjera -> pesos (default). FROM_ARS: pesos -> moneda extranjera.',
      },
    },
    required: ['currency'],
  },
}

function calcularConversion(cotizacion, monto, direccion, moneda) {
  const redondear = (x) => Math.round(x * 100) / 100
  const esToArs = direccion !== 'FROM_ARS'

  // referencia: precio de venta (lo que citan los medios)
  const refTipoCambio = cotizacion.venta
  const refResultado = esToArs
    ? redondear(monto * refTipoCambio)
    : redondear(monto / refTipoCambio)

  // operacion: precio real para el usuario
  // TO_ARS:   usuario vende moneda extranjera -> casa compra -> precio compra
  // FROM_ARS: usuario compra moneda extranjera -> casa vende -> precio venta
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
  const { datos, fuente, timestamp } = await fetchLatamRate(code)

  const { nombre, compra, venta, fechaActualizacion } = datos
  const spread = Number(((venta - compra) / compra * 100).toFixed(4))

  const cotizacion = { moneda: code, nombre, compra, venta, spread, fechaActualizacion }
  const conversion = amount != null ? calcularConversion(cotizacion, amount, direction, code) : null

  return EsquemaSalidaLatam.parse({ cotizacion, conversion, fuente, timestamp })
}

module.exports = { definicion, manejador }
