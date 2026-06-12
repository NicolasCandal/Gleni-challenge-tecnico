function crearCotizacionBaseDTO({ casa, nombre, compra, venta, fechaActualizacion }) {
  return { casa, nombre, compra, venta, fechaActualizacion }
}

function crearReferenciaDTO({ tipoCambio, resultado }) {
  return { tipoCambio, resultado }
}

function crearOperacionDTO({ lado, tipoCambio, resultado }) {
  return { lado, tipoCambio, resultado }
}

function crearConversionDTO({ monto, direccion, tipoUsado, referencia, operacion }) {
  return {
    monto,
    direccion,
    tipoUsado,
    referencia: crearReferenciaDTO(referencia),
    operacion: crearOperacionDTO(operacion)
  }
}

function crearSalidaCotizacionesDTO({ cotizaciones, conversion, omitidos, advertencia, fuente, timestamp }) {
  return { cotizaciones, conversion, omitidos, advertencia, fuente, timestamp }
}

module.exports = { crearCotizacionBaseDTO, crearReferenciaDTO, crearOperacionDTO, crearConversionDTO, crearSalidaCotizacionesDTO }
