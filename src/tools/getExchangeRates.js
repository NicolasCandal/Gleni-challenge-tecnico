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

  let cotizaciones = calcularSpreads(mapeado.cotizaciones)
  cotizaciones = calcularBrecha(cotizaciones)
  const seniales = obtenerSenial(cotizaciones)
  cotizaciones = filtrarPorTipos(cotizaciones, rate_types)
  const ordenadas = ordenarParaComprar(cotizaciones)

  const casasFiltradas = new Set(ordenadas.map(c => c.casa))
  const senialesFiltradas = seniales.filter(s => casasFiltradas.has(s.casa))

  return {
    cotizaciones: ordenadas,
    seniales: senialesFiltradas,
    omitidos: mapeado.omitidos,
    advertencia: mapeado.advertencia,
    fuente: mapeado.fuente,
    timestamp: mapeado.timestamp
  }
}

module.exports = { definicion, manejador }