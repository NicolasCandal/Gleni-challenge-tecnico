jest.mock('../backend/infrastructure/brlApiClient')

const { fetchBrlRate } = require('../backend/infrastructure/brlApiClient')
const { manejador } = require('../backend/tools/getBrlRate')

const datosValidos = {
  moneda: 'BRL',
  casa: 'oficial',
  nombre: 'Real Brasileno',
  compra: 281.29,
  venta: 281.46,
  fechaActualizacion: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  fetchBrlRate.mockResolvedValue({
    datos: datosValidos,
    fuente: 'dolarapi.com',
    timestamp: '2026-01-01T17:00:00.000Z',
  })
})

describe('manejador — estructura de respuesta', () => {
  test('devuelve cotizacion con spread calculado', async () => {
    const resultado = await manejador({})
    const { cotizacion } = resultado
    expect(cotizacion.moneda).toBe('BRL')
    expect(cotizacion.compra).toBe(281.29)
    expect(cotizacion.venta).toBe(281.46)
    expect(cotizacion.spread).toBeGreaterThanOrEqual(0)
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

describe('manejador — conversion BRL_A_ARS', () => {
  test('referencia usa venta y operacion usa compra', async () => {
    const resultado = await manejador({ amount: 100, direction: 'BRL_A_ARS' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.monto).toBe(100)
    expect(conv.direccion).toBe('BRL_A_ARS')
    expect(conv.referencia.tipoCambio).toBe(281.46)
    expect(conv.referencia.resultado).toBeCloseTo(28146, 0)
    expect(conv.operacion.lado).toBe('compra')
    expect(conv.operacion.tipoCambio).toBe(281.29)
    expect(conv.operacion.resultado).toBeCloseTo(28129, 0)
  })

  test('BRL_A_ARS es el default cuando no se pasa direction', async () => {
    const resultado = await manejador({ amount: 100 })
    expect(resultado.conversion.direccion).toBe('BRL_A_ARS')
  })
})

describe('manejador — conversion ARS_A_BRL', () => {
  test('referencia y operacion coinciden (ambas usan venta)', async () => {
    const resultado = await manejador({ amount: 28146, direction: 'ARS_A_BRL' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.direccion).toBe('ARS_A_BRL')
    expect(conv.operacion.lado).toBe('venta')
    expect(conv.referencia.tipoCambio).toBe(conv.operacion.tipoCambio)
    expect(conv.referencia.resultado).toBeCloseTo(100, 0)
    expect(conv.operacion.resultado).toBeCloseTo(100, 0)
  })
})

describe('manejador — propagacion de errores', () => {
  test('propaga el error si la API falla', async () => {
    fetchBrlRate.mockRejectedValue(new Error('API caida'))
    await expect(manejador({})).rejects.toThrow('API caida')
  })
})
