const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenial } = require('../services/exchangeService')

const definicion = {
  name: 'generate_report',
  description: 'Genera un reporte completo del mercado cambiario argentino con todas las cotizaciones disponibles, sus spreads, brechas respecto al oficial y señales de recomendación.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
}

async function manejador() {
  const { datos, fuente, esFallback } = await fetchExchangeRates()
  const mapeado = rawACotizaciones(datos, fuente, esFallback)

  let cotizaciones = calcularSpreads(mapeado.cotizaciones)
  cotizaciones = calcularBrecha(cotizaciones)
  const seniales = obtenerSenial(cotizaciones)
  const ordenadas = ordenarParaComprar(cotizaciones)

  const resumen = {
    total: ordenadas.length,
    comprar: seniales.filter(s => s.senial === 'comprar').map(s => s.nombre),
    esperar: seniales.filter(s => s.senial === 'esperar').map(s => s.nombre),
    neutral: seniales.filter(s => s.senial === 'neutral').map(s => s.nombre)
  }

  return {
    cotizaciones: ordenadas,
    seniales,
    resumen,
    omitidos: mapeado.omitidos,
    advertencia: mapeado.advertencia,
    fuente: mapeado.fuente,
    timestamp: mapeado.timestamp
  }
}

module.exports = { definicion, manejador }
