jest.mock('../backend/infrastructure/latamCurrencyClient')

const { fetchLatamRate, MONEDAS_SOPORTADAS } = require('../backend/infrastructure/latamCurrencyClient')
const { manejador } = require('../backend/tools/getLatamRate')

function mockDolarapi(moneda, nombre, compra, venta) {
  fetchLatamRate.mockResolvedValue({
    datos: { moneda, nombre, compra, venta, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
    fuente: 'dolarapi.com',
    timestamp: '2026-01-01T17:00:00.000Z',
    esTasaReferencia: false,
  })
}

function mockFawaz(moneda, nombre, tasa) {
  fetchLatamRate.mockResolvedValue({
    datos: { moneda, nombre, compra: tasa, venta: tasa, fechaActualizacion: '2026-01-01T12:00:00.000Z' },
    fuente: 'fawazahmed0/exchange-api',
    timestamp: '2026-01-01T17:00:00.000Z',
    esTasaReferencia: true,
  })
}

describe('inputs', () => {
  test('lanza error si falta currency', async () => {
    await expect(manejador({})).rejects.toThrow('currency')
  })

  test('propaga error de la API', async () => {
    fetchLatamRate.mockRejectedValue(new Error('API caida'))
    await expect(manejador({ currency: 'EUR' })).rejects.toThrow('API caida')
  })
})

describe('monedas dolarapi (EUR) — con compra/venta', () => {
  beforeEach(() => mockDolarapi('EUR', 'Euro', 1670, 1684))

  test('spread calculado correctamente', async () => {
    const r = await manejador({ currency: 'EUR' })
    expect(r.cotizacion.spread).toBeGreaterThan(0)
    expect(r.nota).toBeNull()
  })

  test('TO_ARS: referencia usa venta, operacion usa compra', async () => {
    const r = await manejador({ currency: 'EUR', amount: 100, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.direccion).toBe('TO_ARS')
    expect(c.referencia.tipoCambio).toBe(1684)
    expect(c.referencia.resultado).toBe(168400)
    expect(c.operacion.lado).toBe('compra')
    expect(c.operacion.resultado).toBe(167000)
  })

  test('FROM_ARS: referencia y operacion usan venta', async () => {
    const r = await manejador({ currency: 'EUR', amount: 168400, direction: 'FROM_ARS' })
    expect(r.conversion.operacion.lado).toBe('venta')
    expect(r.conversion.referencia.resultado).toBe(r.conversion.operacion.resultado)
  })

  test('TO_ARS es el default', async () => {
    const r = await manejador({ currency: 'EUR', amount: 100 })
    expect(r.conversion.direccion).toBe('TO_ARS')
  })
})

describe('monedas fawazahmed0 (MXN) — tasa de referencia', () => {
  beforeEach(() => mockFawaz('MXN', 'Peso Mexicano', 85.13))

  test('spread es 0 (compra == venta)', async () => {
    const r = await manejador({ currency: 'MXN' })
    expect(r.cotizacion.spread).toBe(0)
    expect(r.cotizacion.compra).toBe(r.cotizacion.venta)
  })

  test('nota informa que es tasa de referencia', async () => {
    const r = await manejador({ currency: 'MXN' })
    expect(r.nota).not.toBeNull()
    expect(r.nota).toMatch(/referencia/)
  })

  test('conversion TO_ARS: referencia == operacion cuando compra == venta', async () => {
    const r = await manejador({ currency: 'MXN', amount: 1000, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.referencia.resultado).toBe(c.operacion.resultado)
    expect(c.referencia.resultado).toBe(85130)
  })

  test('FROM_ARS: calcula correctamente', async () => {
    const r = await manejador({ currency: 'MXN', amount: 85130, direction: 'FROM_ARS' })
    expect(r.conversion.operacion.resultado).toBeCloseTo(1000, 0)
  })
})

describe('monedas fawazahmed0 — variedad', () => {
  test('COP: tasa pequeña (centavos por peso colombiano)', async () => {
    mockFawaz('COP', 'Peso Colombiano', 0.4167)
    const r = await manejador({ currency: 'COP' })
    expect(r.cotizacion.moneda).toBe('COP')
    expect(r.cotizacion.venta).toBeCloseTo(0.4167, 4)
  })

  test('PEN: tasa significativa', async () => {
    mockFawaz('PEN', 'Sol Peruano', 437.86)
    const r = await manejador({ currency: 'PEN' })
    expect(r.cotizacion.moneda).toBe('PEN')
    expect(r.cotizacion.venta).toBeCloseTo(437.86, 1)
  })

  test('PYG: tasa pequeña (guaranies)', async () => {
    mockFawaz('PYG', 'Guarani Paraguayo', 0.21)
    const r = await manejador({ currency: 'PYG', amount: 10000, direction: 'TO_ARS' })
    expect(r.conversion.referencia.resultado).toBeCloseTo(2100, 0)
  })
})

describe('MONEDAS_SOPORTADAS exportado', () => {
  test('incluye tanto monedas dolarapi como fawaz', () => {
    const codigos = Object.keys(MONEDAS_SOPORTADAS)
    expect(codigos).toContain('EUR')
    expect(codigos).toContain('BRL')
    expect(codigos).toContain('MXN')
    expect(codigos).toContain('COP')
    expect(codigos).toContain('PEN')
  })
})
