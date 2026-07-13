jest.mock('../backend/infrastructure/latamCurrencyClient')

const { fetchLatamRate } = require('../backend/infrastructure/latamCurrencyClient')
const { manejador } = require('../backend/tools/getLatamRate')

function mockDatos(moneda, nombre, compra, venta) {
  fetchLatamRate.mockResolvedValue({
    datos: { moneda, nombre, compra, venta, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
    fuente: 'dolarapi.com',
    timestamp: '2026-01-01T17:00:00.000Z',
  })
}

describe('get_latam_rate — validacion de inputs', () => {
  test('lanza error si falta currency', async () => {
    await expect(manejador({})).rejects.toThrow('currency')
  })

  test('propaga error de la API', async () => {
    fetchLatamRate.mockRejectedValue(new Error('API caida'))
    await expect(manejador({ currency: 'EUR' })).rejects.toThrow('API caida')
  })
})

describe('get_latam_rate — EUR', () => {
  beforeEach(() => mockDatos('EUR', 'Euro', 1670, 1684))

  test('devuelve cotizacion con spread', async () => {
    const r = await manejador({ currency: 'EUR' })
    expect(r.cotizacion.moneda).toBe('EUR')
    expect(r.cotizacion.spread).toBeGreaterThan(0)
    expect(r.conversion).toBeNull()
  })

  test('TO_ARS: referencia usa venta, operacion usa compra', async () => {
    const r = await manejador({ currency: 'EUR', amount: 100, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.direccion).toBe('TO_ARS')
    expect(c.referencia.tipoCambio).toBe(1684)
    expect(c.referencia.resultado).toBe(168400)
    expect(c.operacion.lado).toBe('compra')
    expect(c.operacion.tipoCambio).toBe(1670)
    expect(c.operacion.resultado).toBe(167000)
  })

  test('FROM_ARS: referencia y operacion usan venta', async () => {
    const r = await manejador({ currency: 'EUR', amount: 168400, direction: 'FROM_ARS' })
    const c = r.conversion
    expect(c.direccion).toBe('FROM_ARS')
    expect(c.operacion.lado).toBe('venta')
    expect(c.referencia.tipoCambio).toBe(c.operacion.tipoCambio)
    expect(c.referencia.resultado).toBe(100)
    expect(c.operacion.resultado).toBe(100)
  })

  test('TO_ARS es el default cuando no se pasa direction', async () => {
    const r = await manejador({ currency: 'EUR', amount: 100 })
    expect(r.conversion.direccion).toBe('TO_ARS')
  })
})

describe('get_latam_rate — BRL', () => {
  beforeEach(() => mockDatos('BRL', 'Real Brasileno', 281.29, 281.46))

  test('devuelve moneda BRL con spread calculado', async () => {
    const r = await manejador({ currency: 'BRL' })
    expect(r.cotizacion.moneda).toBe('BRL')
    expect(r.cotizacion.compra).toBe(281.29)
    expect(r.cotizacion.venta).toBe(281.46)
  })
})

describe('get_latam_rate — CLP (spread casi cero)', () => {
  beforeEach(() => mockDatos('CLP', 'Peso Chileno', 1.5911, 1.5911))

  test('spread es cero cuando compra == venta', async () => {
    const r = await manejador({ currency: 'CLP' })
    expect(r.cotizacion.spread).toBe(0)
  })

  test('TO_ARS: referencia y operacion dan el mismo resultado cuando compra == venta', async () => {
    const r = await manejador({ currency: 'CLP', amount: 10000, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.referencia.resultado).toBe(c.operacion.resultado)
  })
})

describe('get_latam_rate — UYU', () => {
  beforeEach(() => mockDatos('UYU', 'Peso Uruguayo', 36.834, 36.8342))

  test('devuelve moneda UYU', async () => {
    const r = await manejador({ currency: 'UYU' })
    expect(r.cotizacion.moneda).toBe('UYU')
  })
})
