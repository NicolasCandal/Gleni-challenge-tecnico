const { ExternalApiError } = require('../errors/ExternalApiError')

const EUROAPI_URL = 'https://dolarapi.com/v1/cotizaciones/eur'
const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000

let cache = null

async function fetchEuroRate() {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.resultado
  }

  let datos
  try {
    const res = await fetch(EUROAPI_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`dolarapi respondio ${res.status} al consultar EUR`)
    datos = await res.json()
  } catch {
    throw new ExternalApiError()
  }

  const resultado = { datos, fuente: 'dolarapi.com', timestamp: new Date().toISOString() }
  cache = { resultado, timestamp: Date.now() }
  return resultado
}

// Expuesto solo para tests: resetear cache entre casos
function _resetCache() { cache = null }

module.exports = { fetchEuroRate, _resetCache }
