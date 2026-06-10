const { z } = require('zod')

const TIPOS_VALIDOS = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']

const EsquemaRateTypes = z
  .array(z.enum(TIPOS_VALIDOS))
  .optional()

const EsquemaCotizacion = z.object({
  casa: z.string(),
  nombre: z.string(),
  compra: z.number(),
  venta: z.number(),
  fechaActualizacion: z.string(),
  spread: z.number(),
  brecha: z.number().nullable(),
  senial: z.enum(['comprar', 'esperar', 'neutral'])
})

const EsquemaConversion = z.object({
  monto: z.number(),
  direccion: z.enum(['USD_A_ARS', 'ARS_A_USD']),
  tipoUsado: z.string(),
  tipoCambio: z.number(),
  resultado: z.number()
})

const EsquemaSalidaCotizaciones = z.object({
  cotizaciones: z.array(EsquemaCotizacion),
  conversion: EsquemaConversion.nullable(),
  omitidos: z.array(z.string()),
  advertencia: z.string().nullable(),
  fuente: z.string(),
  timestamp: z.string()
})

module.exports = { EsquemaRateTypes, EsquemaCotizacion, EsquemaConversion, EsquemaSalidaCotizaciones }
