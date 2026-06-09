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

// Señal basada en brecha blue vs oficial:
// brecha < 20% → mercado estable, sin urgencia → 'neutral'
// brecha 20-60% → oportunidad para dolarizarse → 'buy'
// brecha > 60% → mercado muy distorsionado, posible corrección → 'wait'
function obtenerSenal(cotizaciones) {
  const blue = cotizaciones.find(c => c.casa === 'blue')
  const oficial = cotizaciones.find(c => c.casa === 'oficial')

  if (!blue || !oficial) return 'neutral'

  const brecha = (blue.venta - oficial.venta) / oficial.venta * 100

  if (brecha > 60) return 'esperar'
  if (brecha >= 20) return 'comprar'
  return 'neutral'
}

module.exports = { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenal }
