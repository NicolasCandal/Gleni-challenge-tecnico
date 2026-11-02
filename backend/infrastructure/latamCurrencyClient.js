const { ExternalApiError } = require('../errors/ExternalApiError')
const { fetchFawazRate, FAWAZ_CURRENCY_NAMES } = require('./fawazahmedClient')

// Currencies with Argentine buy and sell quotes from dolarapi.com.
const DOLARAPI_CURRENCIES = {
  EUR: { name: 'Euro',           urlCode: 'eur' },
  BRL: { name: 'Brazilian real', urlCode: 'brl' },
  CLP: { name: 'Chilean peso',   urlCode: 'clp' },
  UYU: { name: 'Uruguayan peso',  urlCode: 'uyu' },
}

// Currencies with an interbank reference rate: buy == sell.
const FAWAZ_CURRENCIES = Object.fromEntries(
  Object.entries(FAWAZ_CURRENCY_NAMES).map(([k, name]) => [k, { name }])
)

const SUPPORTED_CURRENCIES = { ...DOLARAPI_CURRENCIES, ...FAWAZ_CURRENCIES }

const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000
const cache = {}

async function fetchLatamRate(currencyCode) {
  const code = currencyCode.toUpperCase()

  if (!SUPPORTED_CURRENCIES[code]) {
    throw new Error(
      `Unsupported currency: ${code}. Available: ${Object.keys(SUPPORTED_CURRENCIES).join(', ')}`
    )
  }

  // Use fawazahmed0 for currencies without Argentine buy/sell quotes.
  if (FAWAZ_CURRENCIES[code]) {
    return fetchFawazRate(code)
  }

  // Currency with an Argentine buy/sell quote.
  if (cache[code] && Date.now() - cache[code].timestamp < TTL_MS) {
    return cache[code].result
  }

  const { urlCode } = DOLARAPI_CURRENCIES[code]
  let data
  try {
    const res = await fetch(`https://dolarapi.com/v1/cotizaciones/${urlCode}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`dolarapi returned ${res.status} when fetching ${code}`)
    const raw = await res.json()
    data = {
      currency: code,
      name: DOLARAPI_CURRENCIES[code].name,
      buy: raw.compra,
      sell: raw.venta,
      updatedAt: raw.fechaActualizacion,
    }
  } catch {
    throw new ExternalApiError()
  }

  const result = {
    data,
    source: 'dolarapi.com',
    timestamp: new Date().toISOString(),
    isReferenceRate: false,
  }
  cache[code] = { result, timestamp: Date.now() }
  return result
}

function _resetCache(code) {
  if (code) delete cache[code.toUpperCase()]
  else Object.keys(cache).forEach(k => delete cache[k])
}

module.exports = { fetchLatamRate, SUPPORTED_CURRENCIES, DOLARAPI_CURRENCIES, FAWAZ_CURRENCIES, _resetCache }
