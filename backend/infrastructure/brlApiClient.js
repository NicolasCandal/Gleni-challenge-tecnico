const { ExternalApiError } = require('../errors/ExternalApiError')

const BRLAPI_URL = 'https://dolarapi.com/v1/cotizaciones/brl'
const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000

let cache = null

async function fetchBrlRate() {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.resultado
  }

  let datos
  try {
    const res = await fetch(BRLAPI_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`dolarapi respondio ${res.status} al consultar BRL`)
    datos = await res.json()
  } catch {
    throw new ExternalApiError()
  }

  const resultado = { datos, fuente: 'dolarapi.com', timestamp: new Date().toISOString() }
  cache = { resultado, timestamp: Date.now() }
  return resultado
}

function _resetCache() { cache = null }

module.exports = { fetchBrlRate, _resetCache }
