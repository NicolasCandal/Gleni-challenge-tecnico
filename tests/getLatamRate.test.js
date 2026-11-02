jest.mock('../backend/infrastructure/latamCurrencyClient')

const { fetchLatamRate, SUPPORTED_CURRENCIES } = require('../backend/infrastructure/latamCurrencyClient')
const { handler } = require('../backend/tools/getLatamRate')

function mockDolarapi(currency, name, buy, sell) {
  fetchLatamRate.mockResolvedValue({
    data: { currency, name, buy, sell, updatedAt: '2026-01-01T00:00:00.000Z' },
    source: 'dolarapi.com',
    timestamp: '2026-01-01T17:00:00.000Z',
    isReferenceRate: false,
  })
}

function mockFawaz(currency, name, rate) {
  fetchLatamRate.mockResolvedValue({
    data: { currency, name, buy: rate, sell: rate, updatedAt: '2026-01-01T12:00:00.000Z' },
    source: 'fawazahmed0/exchange-api',
    timestamp: '2026-01-01T17:00:00.000Z',
    isReferenceRate: true,
  })
}

describe('inputs', () => {
  test('requires a currency code', async () => {
    await expect(handler({})).rejects.toThrow('currency')
  })

  test('propagates API errors', async () => {
    fetchLatamRate.mockRejectedValue(new Error('API unavailable'))
    await expect(handler({ currency: 'EUR' })).rejects.toThrow('API unavailable')
  })
})

describe('dolarapi currencies (EUR) — buy/sell quotes', () => {
  beforeEach(() => mockDolarapi('EUR', 'Euro', 1670, 1684))

  test('calculates the spread', async () => {
    const r = await handler({ currency: 'EUR' })
    expect(r.quote.spread).toBeGreaterThan(0)
    expect(r.note).toBeNull()
  })

  test('TO_ARS: uses sell for reference and buy for the transaction', async () => {
    const r = await handler({ currency: 'EUR', amount: 100, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.direction).toBe('TO_ARS')
    expect(c.reference.exchangeRate).toBe(1684)
    expect(c.reference.result).toBe(168400)
    expect(c.transaction.side).toBe('buy')
    expect(c.transaction.result).toBe(167000)
  })

  test('FROM_ARS: reference and transaction use sell', async () => {
    const r = await handler({ currency: 'EUR', amount: 168400, direction: 'FROM_ARS' })
    expect(r.conversion.transaction.side).toBe('sell')
    expect(r.conversion.reference.result).toBe(r.conversion.transaction.result)
  })

  test('defaults to TO_ARS', async () => {
    const r = await handler({ currency: 'EUR', amount: 100 })
    expect(r.conversion.direction).toBe('TO_ARS')
  })
})

describe('fawazahmed0 currencies (MXN) — reference rates', () => {
  beforeEach(() => mockFawaz('MXN', 'Mexican peso', 85.13))

  test('returns zero spread when buy equals sell', async () => {
    const r = await handler({ currency: 'MXN' })
    expect(r.quote.spread).toBe(0)
    expect(r.quote.buy).toBe(r.quote.sell)
  })

  test('explains that the quote is an interbank reference rate', async () => {
    const r = await handler({ currency: 'MXN' })
    expect(r.note).not.toBeNull()
    expect(r.note).toMatch(/reference/)
  })

  test('TO_ARS: reference equals transaction when buy equals sell', async () => {
    const r = await handler({ currency: 'MXN', amount: 1000, direction: 'TO_ARS' })
    const c = r.conversion
    expect(c.reference.result).toBe(c.transaction.result)
    expect(c.reference.result).toBe(85130)
  })

  test('FROM_ARS: converts pesos to foreign currency', async () => {
    const r = await handler({ currency: 'MXN', amount: 85130, direction: 'FROM_ARS' })
    expect(r.conversion.transaction.result).toBeCloseTo(1000, 0)
  })
})

describe('fawazahmed0 — other currencies', () => {
  test('COP: handles a fractional peso rate', async () => {
    mockFawaz('COP', 'Colombian peso', 0.4167)
    const r = await handler({ currency: 'COP' })
    expect(r.quote.currency).toBe('COP')
    expect(r.quote.sell).toBeCloseTo(0.4167, 4)
  })

  test('PEN: preserves the reference rate', async () => {
    mockFawaz('PEN', 'Peruvian sol', 437.86)
    const r = await handler({ currency: 'PEN' })
    expect(r.quote.currency).toBe('PEN')
    expect(r.quote.sell).toBeCloseTo(437.86, 1)
  })

  test('PYG: converts amounts at a fractional peso rate', async () => {
    mockFawaz('PYG', 'Paraguayan guarani', 0.21)
    const r = await handler({ currency: 'PYG', amount: 10000, direction: 'TO_ARS' })
    expect(r.conversion.reference.result).toBeCloseTo(2100, 0)
  })
})

describe('SUPPORTED_CURRENCIES', () => {
  test('includes currencies from both providers', () => {
    const codes = Object.keys(SUPPORTED_CURRENCIES)
    expect(codes).toContain('EUR')
    expect(codes).toContain('BRL')
    expect(codes).toContain('MXN')
    expect(codes).toContain('COP')
    expect(codes).toContain('PEN')
  })
})
