import { z } from "zod"

export const GetDolarApi = z.object({
    
    moneda: z.string(),
    casa: z.enum(['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']),
    nombre: z.string(),
    compra: z.number().nullable(),
    venta: z.number().nullable(),
    fechaActualizacion: z.string().datetime(),
     variacion: z.number().optional()
})
    
const GetDolarApiResponse = z.array(GetDolarApi)

module.exports = { GetDolarApi, GetDolarApiResponse }