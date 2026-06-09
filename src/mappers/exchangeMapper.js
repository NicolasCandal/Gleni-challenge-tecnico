function mapearCotizacion(item) {
  return {
    casa: item.casa,
    nombre: item.nombre,
    compra: item.compra,
    venta: item.venta,
    fechaActualizacion: item.fechaActualizacion
  }
}

function rawACotizaciones(datos, fuente) {
  const cotizaciones = datos
    .filter(item => item.compra !== null && item.venta !== null)
    .map(mapearCotizacion)

  const omitidos = datos
    .filter(item => item.compra === null || item.venta === null)
    .map(item => item.nombre)

  return {
    cotizaciones,
    omitidos,
    fuente,
    timestamp: new Date().toISOString()
  }
}

module.exports = { rawACotizaciones }
