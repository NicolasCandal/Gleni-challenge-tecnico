const originalFetch = global.fetch
const UPDATED_AT = '2026-01-01T00:00:00.000Z'

beforeEach(() => {
  jest.resetModules()
  global.fetch = jest.fn()
})
afterAll(() => { global.fetch = originalFetch })

const providerQuote = (casa, nombre = 'Provider name') => ({
  moneda: 'USD', casa, nombre, compra: 1000, venta: 1010, fechaActualizacion: UPDATED_AT,
})

describe('dollar provider boundary', () => {
  test('translates all provider rate identifiers and names without changing prices', async () => {
    const { fetchExchangeRates } = require('../backend/infrastructure/dolarapiClient')
    global.fetch.mockResolvedValue({ ok: true, json: async () => [
      'oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta',
    ].map(type => providerQuote(type)) })
    const result = await fetchExchangeRates()
    expect(global.fetch.mock.calls[0][0]).toBe('https://dolarapi.com/v1/dolares')
    expect(result.data.map(quote => quote.rateType)).toEqual(['official', 'blue', 'mep', 'ccl', 'wholesale', 'crypto', 'card'])
    expect(result.data.map(quote => quote.name)).toEqual(['Official', 'Blue', 'MEP', 'CCL', 'Wholesale', 'Crypto', 'Card'])
    expect(result.data[0]).toEqual({ currency: 'USD', rateType: 'official', name: 'Official', buy: 1000, sell: 1010, updatedAt: UPDATED_AT })
    await fetchExchangeRates()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test('preserves the Bluelytics contract and returns normalized partial data', async () => {
    const { fetchExchangeRates } = require('../backend/infrastructure/dolarapiClient')
    global.fetch.mockRejectedValueOnce(new Error('Primary source unavailable'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        oficial: { value_buy: 1000, value_sell: 1010 }, blue: { value_buy: 1150, value_sell: 1200 },
      }) })
    const result = await fetchExchangeRates()
    expect(result.isFallback).toBe(true)
    expect(result.source).toBe('bluelytics.com.ar')
    expect(result.data).toEqual([
      expect.objectContaining({ rateType: 'official', buy: 1000, sell: 1010 }),
      expect.objectContaining({ rateType: 'blue', buy: 1150, sell: 1200 }),
    ])
  })

  test('returns a service-unavailable error if both sources fail', async () => {
    const { fetchExchangeRates } = require('../backend/infrastructure/dolarapiClient')
    global.fetch.mockRejectedValue(new Error('Offline'))
    await expect(fetchExchangeRates()).rejects.toMatchObject({ status: 503, message: 'The exchange rate service is unavailable' })
  })
})

describe('regional currency provider boundary', () => {
  test.each([['EUR', 'eur', 'Euro'], ['BRL', 'brl', 'Brazilian real'], ['CLP', 'clp', 'Chilean peso'], ['UYU', 'uyu', 'Uruguayan peso']])(
    'keeps the provider endpoint and translates the %s quote', async (currency, urlCode, name) => {
      const { fetchLatamRate } = require('../backend/infrastructure/latamCurrencyClient')
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({
        moneda: currency, nombre: 'Provider name', compra: 10, venta: 12, fechaActualizacion: UPDATED_AT,
      }) })
      expect(await fetchLatamRate(currency)).toEqual(expect.objectContaining({
        data: { currency, name, buy: 10, sell: 12, updatedAt: UPDATED_AT }, isReferenceRate: false,
      }))
      expect(global.fetch.mock.calls[0][0]).toBe(`https://dolarapi.com/v1/cotizaciones/${urlCode}`)
    }
  )

  test('returns an English name and equal buy/sell prices for an interbank rate', async () => {
    const { fetchLatamRate } = require('../backend/infrastructure/latamCurrencyClient')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ date: '2026-01-01', mxn: { ars: 85.13 } }) })
    const result = await fetchLatamRate('mxn')
    expect(result.data).toEqual({ currency: 'MXN', name: 'Mexican peso', buy: 85.13, sell: 85.13, updatedAt: '2026-01-01T12:00:00.000Z' })
    expect(result.isReferenceRate).toBe(true)
  })
})
