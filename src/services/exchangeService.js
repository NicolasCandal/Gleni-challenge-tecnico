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

// Señal por tipo basada en spread y brecha:
// spread > 5% o brecha > 30% → operar es caro → 'esperar'
// spread < 3% y brecha < 20%  → condiciones favorables → 'comprar'
// resto                        → 'neutral'
// Requiere que cotizaciones ya tenga spread y brecha calculados
function obtenerSenal(cotizaciones) {
  return cotizaciones.map(c => {
    let senal

    if (c.spread > 5 || c.brecha > 30) {
      senal = 'esperar'
    } else if (c.spread < 3 && c.brecha < 20) {
      senal = 'comprar'
    } else {
      senal = 'neutral'
    }

    return { casa: c.casa, nombre: c.nombre, senal }
  })
}

module.exports = { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenal }
