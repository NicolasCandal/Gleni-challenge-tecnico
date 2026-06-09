const { z } = require('zod')

const EsquemaCotizacion = z.object({
  casa: z.string(),
  nombre: z.string(),
  compra: z.number(),
  venta: z.number(),
  fechaActualizacion: z.string()
})

const EsquemaSalidaCotizaciones = z.object({
  cotizaciones: z.array(EsquemaCotizacion),
  fuente: z.string(),
  timestamp: z.string()
})

module.exports = { EsquemaCotizacion, EsquemaSalidaCotizaciones }
