const { calculateGap, sortBySellPrice, getSignals } = require('../backend/services/exchangeService')

// Default thresholds: HIGH_SPREAD=2.5, LOW_SPREAD=1.5, HIGH_GAP=8, LOW_GAP=3

const baseQuotes = [
  { rateType: 'official', name: 'Official', buy: 1000, sell: 1010, updatedAt: '2026-01-01' },
  { rateType: 'blue',    name: 'Blue',    buy: 1150, sell: 1200, updatedAt: '2026-01-01' },
  { rateType: 'mep',   name: 'MEP',   buy: 1080, sell: 1100, updatedAt: '2026-01-01' },
]

describe('calculateGap', () => {
  test('calculates the percentage gap against the official sell rate', () => {
    const result = calculateGap(baseQuotes)
    const blue = result.find(c => c.rateType === 'blue')
    // (1200 - 1010) / 1010 * 100 ≈ 18.81
    expect(blue.gap).toBeCloseTo(18.81, 1)
  })

  test('returns a zero gap for the official rate', () => {
    const result = calculateGap(baseQuotes)
    const official = result.find(c => c.rateType === 'official')
    expect(official.gap).toBe(0)
  })

  test('returns null gaps when the official rate is unavailable', () => {
    const withoutOfficial = baseQuotes.filter(c => c.rateType !== 'official')
    const result = calculateGap(withoutOfficial)
    expect(result.every(c => c.gap === null)).toBe(true)
  })
})

describe('sortBySellPrice', () => {
  test('sorts by sell price in ascending order', () => {
    const result = sortBySellPrice(baseQuotes)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].sell).toBeLessThanOrEqual(result[i + 1].sell)
    }
  })

  test('does not mutate the original array', () => {
    const originalOrder = baseQuotes.map(c => c.rateType)
    sortBySellPrice(baseQuotes)
    expect(baseQuotes.map(c => c.rateType)).toEqual(originalOrder)
  })
})

describe('getSignals', () => {
  test('returns "buy" when spread and gap are below their lower thresholds', () => {
    const quotes = [{ rateType: 'official', name: 'Official', spread: 1.0, gap: 1.0 }]
    const [result] = getSignals(quotes)
    expect(result.signal).toBe('buy')
  })

  test('returns "wait" when the spread exceeds the upper threshold', () => {
    const quotes = [{ rateType: 'blue', name: 'Blue', spread: 3.0, gap: 2.0 }]
    const [result] = getSignals(quotes)
    expect(result.signal).toBe('wait')
  })

  test('returns "wait" when the gap exceeds the upper threshold', () => {
    const quotes = [{ rateType: 'blue', name: 'Blue', spread: 1.0, gap: 10.0 }]
    const [result] = getSignals(quotes)
    expect(result.signal).toBe('wait')
  })

  test('returns "neutral" for values between the thresholds', () => {
    const quotes = [{ rateType: 'mep', name: 'MEP', spread: 2.0, gap: 5.0 }]
    const [result] = getSignals(quotes)
    expect(result.signal).toBe('neutral')
  })

  test('calculates signals for multiple rate types', () => {
    const quotes = [
      { rateType: 'official', name: 'Official', spread: 1.0, gap: 1.0 },
      { rateType: 'blue',    name: 'Blue',    spread: 3.5, gap: 9.0 },
    ]
    const result = getSignals(quotes)
    expect(result[0].signal).toBe('buy')
    expect(result[1].signal).toBe('wait')
  })

  // Without an official quote, calculateGap assigns null to every gap.
  // JavaScript coerces null to zero, so `null < LOW_GAP` is true.
  // The explicit `gap !== null` check prevents a false buy signal
  // when the reference rate is missing.
  describe('null gap — no official reference rate', () => {
    test('never returns "buy" without a reference, even with a low spread', () => {
      const quotes = [{ rateType: 'blue', name: 'Blue', spread: 1.0, gap: null }]
      const [result] = getSignals(quotes)
      expect(result.signal).not.toBe('buy')
    })

    test('returns "neutral" with a low spread and a null gap', () => {
      const quotes = [{ rateType: 'blue', name: 'Blue', spread: 1.0, gap: null }]
      const [result] = getSignals(quotes)
      expect(result.signal).toBe('neutral')
    })

    test('never returns "buy" when all gaps are null', () => {
      const quotes = [
        { rateType: 'blue',  name: 'Blue',  spread: 1.0, gap: null },
        { rateType: 'mep', name: 'MEP', spread: 1.2, gap: null },
      ]
      const result = getSignals(quotes)
      expect(result.every(r => r.signal !== 'buy')).toBe(true)
    })

    test('still returns "wait" for a high spread when the gap is null', () => {
      const quotes = [{ rateType: 'blue', name: 'Blue', spread: 3.0, gap: null }]
      const [result] = getSignals(quotes)
      expect(result.signal).toBe('wait')
    })
  })
})
