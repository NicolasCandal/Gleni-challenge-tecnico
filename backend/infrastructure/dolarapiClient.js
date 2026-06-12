const { GetDolarApiResponse } = require('../schemas/dolarapiSchema')
const { ExternalApiError } = require('../errors/ExternalApiError')

const DOLARAPI_URL = 'https://dolarapi.com/v1/dolares'
const BLUELYTICS_URL = 'https://api.bluelytics.com.ar/v2/latest'
const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000

let cache = null

async function fetchDeDolarApi() {
  const res = await fetch(DOLARAPI_URL, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`dolarapi respondio ${res.status}`)
  const data = await res.json()
  return { datos: GetDolarApiResponse.parse(data), fuente: 'dolarapi.com', esFallback: false }
}

async function fetchDeBluelytics() {
  const res = await fetch(BLUELYTICS_URL, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`bluelytics respondió ${res.status}`)
  const data = await res.json()
  return { datos: normalizarBluelytics(data), fuente: 'bluelytics.com.ar', esFallback: true }
}

function normalizarBluelytics(data) {
  const ahora = new Date().toISOString()
  return GetDolarApiResponse.parse([
    {
      moneda: 'USD',
      casa: 'oficial',
      nombre: 'Oficial',
      compra: data.oficial?.value_buy ?? null,
      venta: data.oficial?.value_sell ?? null,
      fechaActualizacion: ahora
    },
    {
      moneda: 'USD',
      casa: 'blue',
      nombre: 'Blue',
      compra: data.blue?.value_buy ?? null,
      venta: data.blue?.value_sell ?? null,
      fechaActualizacion: ahora
    }
  ])
}

async function fetchExchangeRates() {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.resultado
  }

  let resultado
  try {
    resultado = await fetchDeDolarApi()
  } catch {
    try {
      resultado = await fetchDeBluelytics()
    } catch {
      throw new ExternalApiError()
    }
  }

  cache = { resultado, timestamp: Date.now() }
  return resultado
}

module.exports = { fetchExchangeRates }
