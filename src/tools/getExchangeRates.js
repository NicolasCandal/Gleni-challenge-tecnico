const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, agregarSenial, filtrarPorTipos } = require('../services/exchangeService')
const { EsquemaRateTypes, EsquemaSalidaCotizaciones } = require('../schemas/exchangeSchema')

const definicion = {
  name: 'get_exchange_rates',
  description: 'Obtiene las cotizaciones actuales del dólar en Argentina. Cada cotización incluye spread, brecha con el oficial y señal (comprar/esperar/neutral). Si se pasa amount, calcula la conversión en el servidor.',
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
        description: 'Monto a convertir. Si se omite, no se calcula conversión.'
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
  const tipoCambio = esUsdAars ? tipoUsado.venta : tipoUsado.compra
  const resultado = esUsdAars
    ? Math.round(monto * tipoCambio * 100) / 100
    : Math.round((monto / tipoCambio) * 100) / 100

  return {
    monto,
    direccion: esUsdAars ? 'USD_A_ARS' : 'ARS_A_USD',
    tipoUsado: tipoUsado.nombre,
    tipoCambio,
    resultado
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

  const conversion = amount != null ? calcularConversion(ordenadas, amount, direction) : null

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
