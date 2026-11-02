jest.mock('../backend/infrastructure/dolarapiClient')

const { fetchExchangeRates } = require('../backend/infrastructure/dolarapiClient')
const { handler } = require('../backend/tools/getExchangeRates')

const validData = [
  { rateType: 'official', name: 'Official', buy: 1000, sell: 1010, updatedAt: '2026-01-01T00:00:00.000Z' },
  { rateType: 'blue',    name: 'Blue',    buy: 1150, sell: 1200, updatedAt: '2026-01-01T00:00:00.000Z' },
]

beforeEach(() => {
  fetchExchangeRates.mockResolvedValue({ data: validData, source: 'dolarapi.com', isFallback: false })
})

describe('handler — input validation', () => {
  test('accepts a call without parameters', async () => {
    await expect(handler({})).resolves.toBeDefined()
  })

  test('rejects unknown rate types', async () => {
    await expect(handler({ rate_types: ['invalid'] })).rejects.toThrow()
  })

  test('accepts valid rate types', async () => {
    await expect(handler({ rate_types: ['blue', 'official'] })).resolves.toBeDefined()
  })
})

describe('handler — quote processing', () => {
  test('returns quotes with calculated spreads, gaps, and signals', async () => {
    const result = await handler({})
    expect(result.quotes.length).toBeGreaterThan(0)
    expect(result.quotes[0]).toHaveProperty('spread')
    expect(result.quotes[0]).toHaveProperty('gap')
    expect(result.quotes[0]).toHaveProperty('signal')
  })

  test('filters by rate_types when provided', async () => {
    const result = await handler({ rate_types: ['blue'] })
    expect(result.quotes).toHaveLength(1)
    expect(result.quotes[0].rateType).toBe('blue')
  })

  test('returns a null conversion when amount is omitted', async () => {
    const result = await handler({})
    expect(result.conversion).toBeNull()
  })

  // With these fixtures, sortBySellPrice places the official quote first:
  // its sell price is 1010.
  test('USD_TO_ARS: uses the cheapest sell quote for reference and its buy rate for the transaction', async () => {
    const result = await handler({ amount: 100, direction: 'USD_TO_ARS' })
    const conv = result.conversion
    expect(conv).not.toBeNull()
    expect(conv.amount).toBe(100)
    expect(conv.direction).toBe('USD_TO_ARS')
    expect(conv.reference.exchangeRate).toBe(1010)     // official sell rate
    expect(conv.reference.result).toBe(101000)    // 100 * 1010
    expect(conv.transaction.side).toBe('buy')
    expect(conv.transaction.exchangeRate).toBe(1000)      // official buy rate
    expect(conv.transaction.result).toBe(100000)     // 100 * 1000
  })

  test('ARS_TO_USD: reference and transaction both use the sell rate', async () => {
    const result = await handler({ amount: 101000, direction: 'ARS_TO_USD' })
    const conv = result.conversion
    expect(conv).not.toBeNull()
    expect(conv.direction).toBe('ARS_TO_USD')
    expect(conv.transaction.side).toBe('sell')
    expect(conv.reference.exchangeRate).toBe(conv.transaction.exchangeRate)
    expect(conv.reference.result).toBe(100)       // 101000 / 1010
    expect(conv.transaction.result).toBe(100)        // 101000 / 1010
  })

  test('includes the source and timestamp', async () => {
    const result = await handler({})
    expect(result.source).toBe('dolarapi.com')
    expect(result.timestamp).toBeDefined()
  })
})

describe('handler — wholesale conversions', () => {
  const dataWithWholesale = [
    { rateType: 'wholesale', name: 'Wholesale', buy: 900,  sell: 950,  updatedAt: '2026-01-01T00:00:00.000Z' },
    { rateType: 'official',   name: 'Official',   buy: 1000, sell: 1010, updatedAt: '2026-01-01T00:00:00.000Z' },
    { rateType: 'blue',      name: 'Blue',      buy: 1150, sell: 1200, updatedAt: '2026-01-01T00:00:00.000Z' },
  ]

  beforeEach(() => {
    fetchExchangeRates.mockResolvedValue({ data: dataWithWholesale, source: 'dolarapi.com', isFallback: false })
  })

  test('excludes wholesale from automatic rate selection', async () => {
    const result = await handler({ amount: 100 })
    expect(result.conversion.rateUsed).not.toBe('Wholesale')
    expect(result.conversion.rateUsed).toBe('Official')
  })

  test('honors an explicit wholesale selection', async () => {
    const result = await handler({ amount: 100, rate_types: ['wholesale'] })
    expect(result.conversion.rateUsed).toBe('Wholesale')
  })

  test('includes wholesale in the returned quotes when no filter is provided', async () => {
    const result = await handler({ amount: 100 })
    const rateTypes = result.quotes.map(c => c.rateType)
    expect(rateTypes).toContain('wholesale')
  })

  test('includes wholesale when explicitly requested', async () => {
    const result = await handler({ amount: 100, rate_types: ['wholesale'] })
    const rateTypes = result.quotes.map(c => c.rateType)
    expect(rateTypes).toContain('wholesale')
  })
})

describe('handler — malformed API responses', () => {
  test('omits quotes with missing buy or sell prices', async () => {
    fetchExchangeRates.mockResolvedValue({
      data: [{ rateType: 'official', name: 'Official', buy: null, sell: null, updatedAt: '2026-01-01T00:00:00.000Z' }],
      source: 'dolarapi.com',
      isFallback: false
    })
    const result = await handler({})
    expect(result.quotes).toHaveLength(0)
    expect(result.omitted).toContain('Official')
  })

  test('propagates API errors', async () => {
    fetchExchangeRates.mockRejectedValue(new Error('API unavailable'))
    await expect(handler({})).rejects.toThrow('API unavailable')
  })
})
