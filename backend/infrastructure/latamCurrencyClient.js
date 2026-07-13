const { ExternalApiError } = require('../errors/ExternalApiError')

const MONEDAS_SOPORTADAS = {
  EUR: { nombre: 'Euro',           urlCode: 'eur' },
  BRL: { nombre: 'Real Brasileno', urlCode: 'brl' },
  CLP: { nombre: 'Peso Chileno',   urlCode: 'clp' },
  UYU: { nombre: 'Peso Uruguayo',  urlCode: 'uyu' },
}

const TTL_MS = Number(process.env.EXCHANGE_CACHE_TTL_MS) || 45_000

const cache = {}  // { [CODE]: { resultado, timestamp } }

async function fetchLatamRate(currencyCode) {
  const code = currencyCode.toUpperCase()
  const moneda = MONEDAS_SOPORTADAS[code]
  if (!moneda) throw new Error(`Moneda no soportada: ${code}. Monedas disponibles: ${Object.keys(MONEDAS_SOPORTADAS).join(', ')}`)

  if (cache[code] && Date.now() - cache[code].timestamp < TTL_MS) {
    return cache[code].resultado
  }

  let datos
  try {
    const url = `https://dolarapi.com/v1/cotizaciones/${moneda.urlCode}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`dolarapi respondio ${res.status} al consultar ${code}`)
    datos = await res.json()
  } catch {
    throw new ExternalApiError()
  }

  const resultado = { datos, fuente: 'dolarapi.com', timestamp: new Date().toISOString() }
  cache[code] = { resultado, timestamp: Date.now() }
  return resultado
}

function _resetCache(code) {
  if (code) delete cache[code.toUpperCase()]
  else Object.keys(cache).forEach(k => delete cache[k])
}

module.exports = { fetchLatamRate, MONEDAS_SOPORTADAS, _resetCache }
