const { ExternalApiError } = require('../errors/ExternalApiError')
const { fetchFawazRate, NOMBRES_FAWAZ } = require('./fawazahmedClient')

// Monedas con cotizacion oficial argentina (dolarapi.com): tienen compra Y venta reales
const MONEDAS_DOLARAPI = {
  EUR: { nombre: 'Euro',           urlCode: 'eur' },
  BRL: { nombre: 'Real Brasileno', urlCode: 'brl' },
  CLP: { nombre: 'Peso Chileno',   urlCode: 'clp' },
  UYU: { nombre: 'Peso Uruguayo',  urlCode: 'uyu' },
}

// Monedas via tasa de referencia interbancaria (fawazahmed0): compra == venta
const MONEDAS_FAWAZ = Object.fromEntries(
  Object.entries(NOMBRES_FAWAZ).map(([k, nombre]) => [k, { nombre }])
)

const MONEDAS_SOPORTADAS = { ...MONEDAS_DOLARAPI, ...MONEDAS_FAWAZ }

const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000
const cache = {}

async function fetchLatamRate(currencyCode) {
  const code = currencyCode.toUpperCase()

  if (!MONEDAS_SOPORTADAS[code]) {
    throw new Error(
      `Moneda no soportada: ${code}. Disponibles: ${Object.keys(MONEDAS_SOPORTADAS).join(', ')}`
    )
  }

  // Delegar a fawazahmed0 para monedas sin cotizacion argentina oficial
  if (MONEDAS_FAWAZ[code]) {
    return fetchFawazRate(code)
  }

  // Moneda con cotizacion oficial argentina (dolarapi.com)
  if (cache[code] && Date.now() - cache[code].timestamp < TTL_MS) {
    return cache[code].resultado
  }

  const { urlCode } = MONEDAS_DOLARAPI[code]
  let datos
  try {
    const res = await fetch(`https://dolarapi.com/v1/cotizaciones/${urlCode}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`dolarapi respondio ${res.status} al consultar ${code}`)
    datos = await res.json()
  } catch {
    throw new ExternalApiError()
  }

  const resultado = {
    datos,
    fuente: 'dolarapi.com',
    timestamp: new Date().toISOString(),
    esTasaReferencia: false,
  }
  cache[code] = { resultado, timestamp: Date.now() }
  return resultado
}

function _resetCache(code) {
  if (code) delete cache[code.toUpperCase()]
  else Object.keys(cache).forEach(k => delete cache[k])
}

module.exports = { fetchLatamRate, MONEDAS_SOPORTADAS, MONEDAS_DOLARAPI, MONEDAS_FAWAZ, _resetCache }
