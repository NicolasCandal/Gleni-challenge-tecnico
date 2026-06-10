function calcularSpreads(cotizaciones) {
  return cotizaciones.map(c => ({
    ...c,
    spread: Number(((c.venta - c.compra) / c.compra * 100).toFixed(2))
  }))
}

function calcularBrecha(cotizaciones) {
  const oficial = cotizaciones.find(c => c.casa === 'oficial')
  if (!oficial) return cotizaciones.map(c => ({ ...c, brecha: null }))

  return cotizaciones.map(c => ({
    ...c,
    brecha: Number(((c.venta - oficial.venta) / oficial.venta * 100).toFixed(2))
  }))
}

function ordenarParaComprar(cotizaciones) {
  return [...cotizaciones].sort((a, b) => a.venta - b.venta)
}

const UMBRALES = require('../config/umbrales')

// Señal por tipo basada en spread (compra-venta del propio tipo) y brecha (vs. oficial).
// Requiere que cotizaciones ya tenga spread y brecha calculados.
function obtenerSenial(cotizaciones) {
  return cotizaciones.map(c => {
    let senial

    if (c.spread > UMBRALES.SPREAD_ALTO || c.brecha > UMBRALES.BRECHA_ALTA) {
      senial = 'esperar'
    } else if (c.spread < UMBRALES.SPREAD_BAJO && c.brecha < UMBRALES.BRECHA_BAJA) {
      senial = 'comprar'
    } else {
      senial = 'neutral'
    }

    return { casa: c.casa, nombre: c.nombre, senial }
  })
}

// Si tipos es un array vacío o undefined, devuelve todas las cotizaciones sin filtrar
function filtrarPorTipos(cotizaciones, tipos) {
  if (!tipos || tipos.length === 0) return cotizaciones
  return cotizaciones.filter(c => tipos.includes(c.casa))
}

module.exports = { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenial, filtrarPorTipos }
