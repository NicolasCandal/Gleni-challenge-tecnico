jest.mock('../src/infrastructure/dolarapiClient')

const { fetchExchangeRates } = require('../src/infrastructure/dolarapiClient')
const { manejador } = require('../src/tools/getExchangeRates')

const datosValidos = [
  { casa: 'oficial', nombre: 'Oficial', compra: 1000, venta: 1010, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
  { casa: 'blue',    nombre: 'Blue',    compra: 1150, venta: 1200, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
]

beforeEach(() => {
  fetchExchangeRates.mockResolvedValue({ datos: datosValidos, fuente: 'dolarapi.com', esFallback: false })
})

describe('manejador — validación de inputs', () => {
  test('acepta llamada sin parámetros', async () => {
    await expect(manejador({})).resolves.toBeDefined()
  })

  test('rechaza rate_types con valores fuera del enum', async () => {
    await expect(manejador({ rate_types: ['invalido'] })).rejects.toThrow()
  })

  test('acepta rate_types con valores válidos', async () => {
    await expect(manejador({ rate_types: ['blue', 'oficial'] })).resolves.toBeDefined()
  })
})

describe('manejador — transformación correcta', () => {
  test('devuelve cotizaciones con spread, brecha y señal calculados', async () => {
    const resultado = await manejador({})
    expect(resultado.cotizaciones.length).toBeGreaterThan(0)
    expect(resultado.cotizaciones[0]).toHaveProperty('spread')
    expect(resultado.cotizaciones[0]).toHaveProperty('brecha')
    expect(resultado.cotizaciones[0]).toHaveProperty('senial')
  })

  test('filtra por rate_types cuando se especifica', async () => {
    const resultado = await manejador({ rate_types: ['blue'] })
    expect(resultado.cotizaciones).toHaveLength(1)
    expect(resultado.cotizaciones[0].casa).toBe('blue')
  })

  test('calcula conversión cuando se pasa amount', async () => {
    const resultado = await manejador({ amount: 100, direction: 'USD_A_ARS' })
    expect(resultado.conversion).not.toBeNull()
    expect(resultado.conversion.monto).toBe(100)
    expect(resultado.conversion.resultado).toBeGreaterThan(0)
  })

  test('conversion es null cuando no se pasa amount', async () => {
    const resultado = await manejador({})
    expect(resultado.conversion).toBeNull()
  })

  test('incluye fuente y timestamp en la respuesta', async () => {
    const resultado = await manejador({})
    expect(resultado.fuente).toBe('dolarapi.com')
    expect(resultado.timestamp).toBeDefined()
  })
})

describe('manejador — respuestas malformadas de la API', () => {
  test('filtra cotizaciones sin compra o venta en lugar de romper', async () => {
    fetchExchangeRates.mockResolvedValue({
      datos: [{ casa: 'oficial', nombre: 'Oficial', compra: null, venta: null, fechaActualizacion: '2026-01-01T00:00:00.000Z' }],
      fuente: 'dolarapi.com',
      esFallback: false
    })
    const resultado = await manejador({})
    expect(resultado.cotizaciones).toHaveLength(0)
    expect(resultado.omitidos).toContain('Oficial')
  })

  test('lanza error cuando la API falla', async () => {
    fetchExchangeRates.mockRejectedValue(new Error('API no disponible'))
    await expect(manejador({})).rejects.toThrow('API no disponible')
  })
})
