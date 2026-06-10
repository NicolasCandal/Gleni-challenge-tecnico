const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenial, filtrarPorTipos } = require('../services/exchangeService')

const definicion = {
  name: 'get_exchange_rates',
  description: 'Obtiene las cotizaciones actuales del dólar en Argentina, incluyendo spread, brecha con el oficial y señal de compra/espera para cada tipo.',
  parameters: {
    type: 'object',
    properties: {
      rate_types: {
        type: 'array',
        items: { type: 'string', enum: ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta'] },
        description: 'Tipos de dólar a consultar. Si se omite, devuelve todos.'
      }
    },
    required: []
  }
}

async function manejador({ rate_types } = {}) {
  const { datos, fuente, esFallback } = await fetchExchangeRates()
  const mapeado = rawACotizaciones(datos, fuente, esFallback)

  let cotizaciones = filtrarPorTipos(mapeado.cotizaciones, rate_types)
  cotizaciones = calcularSpreads(cotizaciones)
  cotizaciones = calcularBrecha(cotizaciones)
  const seniales = obtenerSenial(cotizaciones)
  const ordenadas = ordenarParaComprar(cotizaciones)

  return {
    cotizaciones: ordenadas,
    seniales,
    omitidos: mapeado.omitidos,
    advertencia: mapeado.advertencia,
    fuente: mapeado.fuente,
    timestamp: mapeado.timestamp
  }
}

module.exports = { definicion, manejador }