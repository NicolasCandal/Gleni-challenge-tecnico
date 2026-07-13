const { ExternalApiError } = require('../errors/ExternalApiError')

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies'
const FALLBACK_URL = 'https://latest.currency-api.pages.dev/v1/currencies'
const TTL_MS = 6 * 60 * 60 * 1000  // 6 horas (la fuente actualiza una vez por dia)

const NOMBRES = {
  MXN: 'Peso Mexicano',
  COP: 'Peso Colombiano',
  PEN: 'Sol Peruano',
  PYG: 'Guarani Paraguayo',
  BOB: 'Boliviano',
  VES: 'Bolivar Venezolano',
  GTQ: 'Quetzal Guatemalteco',
  HNL: 'Lempira Hondureno',
  NIO: 'Cordoba Nicaraguense',
  CRC: 'Colon Costarricense',
  DOP: 'Peso Dominicano',
}

const cache = {}

async function fetchDeUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchFawazRate(currencyCode) {
  const code = currencyCode.toUpperCase()
  const codeLower = code.toLowerCase()

  if (cache[code] && Date.now() - cache[code].timestamp < TTL_MS) {
    return cache[code].resultado
  }

  let data
  try {
    data = await fetchDeUrl(`${BASE_URL}/${codeLower}.json`)
  } catch {
    try {
      data = await fetchDeUrl(`${FALLBACK_URL}/${codeLower}.json`)
    } catch {
      throw new ExternalApiError()
    }
  }

  const tasaArs = data[codeLower]?.ars
  if (tasaArs == null) throw new ExternalApiError()

  const nombre = NOMBRES[code] || code
  const fechaActualizacion = data.date
    ? new Date(data.date + 'T12:00:00Z').toISOString()
    : new Date().toISOString()

  const resultado = {
    datos: { moneda: code, nombre, compra: tasaArs, venta: tasaArs, fechaActualizacion },
    fuente: 'fawazahmed0/exchange-api',
    timestamp: new Date().toISOString(),
    esTasaReferencia: true,
  }

  cache[code] = { resultado, timestamp: Date.now() }
  return resultado
}

function _resetCache(code) {
  if (code) delete cache[code.toUpperCase()]
  else Object.keys(cache).forEach(k => delete cache[k])
}

module.exports = { fetchFawazRate, NOMBRES_FAWAZ: NOMBRES, _resetCache }
