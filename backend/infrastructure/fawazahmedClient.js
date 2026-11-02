const { ExternalApiError } = require('../errors/ExternalApiError')

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies'
const FALLBACK_URL = 'https://latest.currency-api.pages.dev/v1/currencies'
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours; the source updates once a day.

const CURRENCY_NAMES = {
  MXN: 'Mexican peso',
  COP: 'Colombian peso',
  PEN: 'Peruvian sol',
  PYG: 'Paraguayan guarani',
  BOB: 'Bolivian boliviano',
  VES: 'Venezuelan bolivar',
  GTQ: 'Guatemalan quetzal',
  HNL: 'Honduran lempira',
  NIO: 'Nicaraguan cordoba',
  CRC: 'Costa Rican colon',
  DOP: 'Dominican peso',
}

const cache = {}

async function fetchFromUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchFawazRate(currencyCode) {
  const code = currencyCode.toUpperCase()
  const codeLower = code.toLowerCase()

  if (cache[code] && Date.now() - cache[code].timestamp < TTL_MS) {
    return cache[code].result
  }

  let data
  try {
    data = await fetchFromUrl(`${BASE_URL}/${codeLower}.json`)
  } catch {
    try {
      data = await fetchFromUrl(`${FALLBACK_URL}/${codeLower}.json`)
    } catch {
      throw new ExternalApiError()
    }
  }

  const arsRate = data[codeLower]?.ars
  if (arsRate == null) throw new ExternalApiError()

  const name = CURRENCY_NAMES[code] || code
  const updatedAt = data.date
    ? new Date(data.date + 'T12:00:00Z').toISOString()
    : new Date().toISOString()

  const result = {
    data: { currency: code, name, buy: arsRate, sell: arsRate, updatedAt },
    source: 'fawazahmed0/exchange-api',
    timestamp: new Date().toISOString(),
    isReferenceRate: true,
  }

  cache[code] = { result, timestamp: Date.now() }
  return result
}

function _resetCache(code) {
  if (code) delete cache[code.toUpperCase()]
  else Object.keys(cache).forEach(k => delete cache[k])
}

module.exports = { fetchFawazRate, FAWAZ_CURRENCY_NAMES: CURRENCY_NAMES, _resetCache }
