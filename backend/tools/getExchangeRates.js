const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, agregarSenial, filtrarPorTipos } = require('../services/exchangeService')
const { EsquemaRateTypes, EsquemaSalidaCotizaciones } = require('../schemas/exchangeSchema')

const TIPOS_NO_OPERABLES = ['mayorista']

const definicion = {
  name: 'get_exchange_rates',
  description: 'Obtiene las cotizaciones actuales del dólar en Argentina. Cada cotización incluye spread, brecha con el oficial y señal (comprar/esperar/neutral). Si se pasa amount, calcula la conversión en el servidor y devuelve dos valores: referencia (al precio de venta, el que citan los medios) y operacion (el resultado neto que recibiría/pagaría el usuario si ejecutara la transacción).',
  parameters: {
    type: 'object',
    properties: {
      rate_types: {
        type: 'array',
        items: { type: 'string', enum: ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta'] },
        description: 'Tipos de dólar a consultar. Si se omite, devuelve todos.'
      },
      amount: {
        type: 'number',
        description: 'Monto a convertir. Si se omite, no se calcula conversión. La respuesta incluirá conversion.referencia.resultado (al precio de venta) y conversion.operacion.resultado (al precio que le corresponde al usuario en la transacción real).'
      },
      direction: {
        type: 'string',
        enum: ['USD_A_ARS', 'ARS_A_USD'],
        description: 'Dirección de la conversión. Default: USD_A_ARS.'
      }
    },
    required: []
  }
}

function calcularConversion(cotizaciones, monto, direccion) {
  const tipoUsado = cotizaciones[0]
  if (!tipoUsado) return null

  const esUsdAars = direccion !== 'ARS_A_USD'
  const redondear = (x) => Math.round(x * 100) / 100

  // referencia: siempre al precio de venta (el que citan los medios)
  const refTipoCambio = tipoUsado.venta
  const refResultado = esUsdAars
    ? redondear(monto * refTipoCambio)
    : redondear(monto / refTipoCambio)

  // operacion: precio que le toca al usuario en la transacción real
  // USD_A_ARS → usuario vende USD → casa le compra → precio compra
  // ARS_A_USD → usuario compra USD → casa le vende → precio venta
  const opLado = esUsdAars ? 'compra' : 'venta'
  const opTipoCambio = esUsdAars ? tipoUsado.compra : tipoUsado.venta
  const opResultado = esUsdAars
    ? redondear(monto * opTipoCambio)
    : redondear(monto / opTipoCambio)

  return {
    monto,
    direccion: esUsdAars ? 'USD_A_ARS' : 'ARS_A_USD',
    tipoUsado: tipoUsado.nombre,
    referencia: {
      tipoCambio: refTipoCambio,
      resultado: refResultado
    },
    operacion: {
      lado: opLado,
      tipoCambio: opTipoCambio,
      resultado: opResultado
    }
  }
}

async function manejador({ rate_types, amount, direction } = {}) {
  EsquemaRateTypes.parse(rate_types)

  const { datos, fuente, esFallback } = await fetchExchangeRates()
  const mapeado = rawACotizaciones(datos, fuente, esFallback)

  let cotizaciones = calcularSpreads(mapeado.cotizaciones)
  cotizaciones = calcularBrecha(cotizaciones)
  cotizaciones = agregarSenial(cotizaciones)
  cotizaciones = filtrarPorTipos(cotizaciones, rate_types)
  const ordenadas = ordenarParaComprar(cotizaciones)

  const tieneRateTypes = Array.isArray(rate_types) && rate_types.length > 0
  const operables = tieneRateTypes ? ordenadas : ordenadas.filter(c => !TIPOS_NO_OPERABLES.includes(c.casa))
  const baseConversion = operables.length > 0 ? operables : ordenadas

  const conversion = amount != null ? calcularConversion(baseConversion, amount, direction) : null

  const salida = {
    cotizaciones: ordenadas,
    conversion,
    omitidos: mapeado.omitidos,
    advertencia: mapeado.advertencia,
    fuente: mapeado.fuente,
    timestamp: mapeado.timestamp
  }

  return EsquemaSalidaCotizaciones.parse(salida)
}

module.exports = { definicion, manejador }
