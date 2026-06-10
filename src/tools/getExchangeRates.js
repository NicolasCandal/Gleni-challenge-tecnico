const definicion = {
  name: 'get_exchange_rates',
  description: 'Obtiene las cotizaciones actuales del dólar en Argentina...',
  parameters: {
    type: 'object',
    properties: {
      rate_types: {
        type: 'array',
        items: { type: 'string', enum: ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta'] },
        description: 'Tipos de dólar a consultar. Si se omite, devuelve todos.'
      }
    },
    required: []
  }
}