const { GetDolarApiResponse } = require('../schemas/dolarapiSchema')
const { ExternalApiError } = require('../errors/ExternalApiError')

const DOLARAPI_URL = 'https://dolarapi.com/v1/dolares'
const BLUELYTICS_URL = 'https://api.bluelytics.com.ar/v2/latest'
const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000

let cache = null

async function fetchFromDolarApi() {
  const res = await fetch(DOLARAPI_URL, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`dolarapi returned ${res.status}`)
  const data = await res.json()
  return { data: GetDolarApiResponse.parse(data), source: 'dolarapi.com', isFallback: false }
}

async function fetchFromBluelytics() {
  const res = await fetch(BLUELYTICS_URL, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`bluelytics returned ${res.status}`)
  const data = await res.json()
  return { data: normalizeBluelytics(data), source: 'bluelytics.com.ar', isFallback: true }
}

function normalizeBluelytics(data) {
  const now = new Date().toISOString()
  return GetDolarApiResponse.parse([
    {
      moneda: 'USD',
      casa: 'oficial',
      nombre: 'Oficial',
      compra: data.oficial?.value_buy ?? null,
      venta: data.oficial?.value_sell ?? null,
      fechaActualizacion: now
    },
    {
      moneda: 'USD',
      casa: 'blue',
      nombre: 'Blue',
      compra: data.blue?.value_buy ?? null,
      venta: data.blue?.value_sell ?? null,
      fechaActualizacion: now
    }
  ])
}

async function fetchExchangeRates() {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.result
  }

  let result
  try {
    result = await fetchFromDolarApi()
  } catch {
    try {
      result = await fetchFromBluelytics()
    } catch {
      throw new ExternalApiError()
    }
  }

  cache = { result, timestamp: Date.now() }
  return result
}

module.exports = { fetchExchangeRates }
