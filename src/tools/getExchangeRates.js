const { fetchExchangeRates } = require('../infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenial, filtrarPorTipos } = require('../services/exchangeService')

const definicion = {
  name: 'get_exchange_rates',
  description: 'Obtiene las cotizaciones actuales del dólar en Argentina, incluyendo spread, brecha con el oficial y señal de compra/espera para cada tipo. Si se pasa amount, calcula la conversión en el servidor.',
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

  const esUsdAars = direccion === 'ARS_A_USD' ? false : true
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
  const { datos, fuente, esFallback } = await fetchExchangeRates()
  const mapeado = rawACotizaciones(datos, fuente, esFallback)

  let cotizaciones = calcularSpreads(mapeado.cotizaciones)
  cotizaciones = calcularBrecha(cotizaciones)
  const seniales = obtenerSenial(cotizaciones)
  cotizaciones = filtrarPorTipos(cotizaciones, rate_types)
  const ordenadas = ordenarParaComprar(cotizaciones)

  const casasFiltradas = new Set(ordenadas.map(c => c.casa))
  const senialesFiltradas = seniales.filter(s => casasFiltradas.has(s.casa))

  const conversion = amount != null ? calcularConversion(ordenadas, amount, direction) : null

  return {
    cotizaciones: ordenadas,
    seniales: senialesFiltradas,
    conversion,
    omitidos: mapeado.omitidos,
    advertencia: mapeado.advertencia,
    fuente: mapeado.fuente,
    timestamp: mapeado.timestamp
  }
}

module.exports = { definicion, manejador }
