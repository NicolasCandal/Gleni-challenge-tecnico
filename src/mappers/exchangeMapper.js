function mapearCotizacion(item) {
  return {
    casa: item.casa,
    nombre: item.nombre,
    compra: item.compra,
    venta: item.venta,
    fechaActualizacion: item.fechaActualizacion
  }
}

function rawACotizaciones(datos, fuente, esFallback = false) {
  const cotizaciones = datos
    .filter(item => item.compra !== null && item.venta !== null)
    .map(mapearCotizacion)

  const omitidos = datos
    .filter(item => item.compra === null || item.venta === null)
    .map(item => item.nombre)

  const advertencia = esFallback
    ? 'Datos parciales: solo oficial y blue disponibles porque la fuente principal no responde'
    : null

  return {
    cotizaciones,
    omitidos,
    advertencia,
    fuente,
    timestamp: new Date().toISOString()
  }
}

module.exports = { rawACotizaciones }
