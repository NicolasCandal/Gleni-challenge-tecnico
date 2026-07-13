jest.mock('../backend/infrastructure/euroApiClient')

const { fetchEuroRate } = require('../backend/infrastructure/euroApiClient')
const { manejador } = require('../backend/tools/getEuroRate')

const datosValidos = {
  moneda: 'EUR',
  casa: 'oficial',
  nombre: 'Euro',
  compra: 1670,
  venta: 1684,
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  fetchEuroRate.mockResolvedValue({
    datos: datosValidos,
    fuente: 'dolarapi.com',
    timestamp: '2026-01-01T17:00:00.000Z',
  })
})

describe('manejador — estructura de respuesta', () => {
  test('devuelve cotizacion con spread calculado', async () => {
    const resultado = await manejador({})
    const { cotizacion } = resultado
    expect(cotizacion.moneda).toBe('EUR')
    expect(cotizacion.compra).toBe(1670)
    expect(cotizacion.venta).toBe(1684)
    // spread = (1684 - 1670) / 1670 * 100 = 0.84
    expect(cotizacion.spread).toBeCloseTo(0.84, 1)
  })

  test('conversion es null cuando no se pasa amount', async () => {
    const resultado = await manejador({})
    expect(resultado.conversion).toBeNull()
  })

  test('incluye fuente y timestamp', async () => {
    const resultado = await manejador({})
    expect(resultado.fuente).toBe('dolarapi.com')
    expect(resultado.timestamp).toBeDefined()
  })
})

describe('manejador — conversion EUR_A_ARS', () => {
  test('referencia usa venta y operacion usa compra', async () => {
    const resultado = await manejador({ amount: 100, direction: 'EUR_A_ARS' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.monto).toBe(100)
    expect(conv.direccion).toBe('EUR_A_ARS')
    expect(conv.referencia.tipoCambio).toBe(1684)
    expect(conv.referencia.resultado).toBe(168400)   // 100 * 1684
    expect(conv.operacion.lado).toBe('compra')
    expect(conv.operacion.tipoCambio).toBe(1670)
    expect(conv.operacion.resultado).toBe(167000)    // 100 * 1670
  })

  test('EUR_A_ARS es el default cuando no se pasa direction', async () => {
    const resultado = await manejador({ amount: 100 })
    expect(resultado.conversion.direccion).toBe('EUR_A_ARS')
  })
})

describe('manejador — conversion ARS_A_EUR', () => {
  test('referencia y operacion coinciden (ambas usan venta)', async () => {
    const resultado = await manejador({ amount: 168400, direction: 'ARS_A_EUR' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.direccion).toBe('ARS_A_EUR')
    expect(conv.operacion.lado).toBe('venta')
    expect(conv.referencia.tipoCambio).toBe(conv.operacion.tipoCambio)
    expect(conv.referencia.resultado).toBe(100)       // 168400 / 1684
    expect(conv.operacion.resultado).toBe(100)
  })
})

describe('manejador — propagacion de errores', () => {
  test('propaga el error si la API falla', async () => {
    fetchEuroRate.mockRejectedValue(new Error('API caida'))
    await expect(manejador({})).rejects.toThrow('API caida')
  })
})
