const THRESHOLDS = require('../config/thresholds')

function calculateSpreads(quotes) {
  return quotes.map(c => ({
    ...c,
    spread: Number(((c.sell - c.buy) / c.buy * 100).toFixed(2))
  }))
}

function calculateGap(quotes) {
  const official = quotes.find(c => c.rateType === 'official')
  if (!official) return quotes.map(c => ({ ...c, gap: null }))

  return quotes.map(c => ({
    ...c,
    gap: Number(((c.sell - official.sell) / official.sell * 100).toFixed(2))
  }))
}

function sortBySellPrice(quotes) {
  return [...quotes].sort((a, b) => a.sell - b.sell)
}

// Signals use each rate type’s spread and gap against the official rate.
// Quotes must already include spread and gap values.
function getSignal(quote) {
  if (quote.spread > THRESHOLDS.HIGH_SPREAD || (quote.gap !== null && quote.gap > THRESHOLDS.HIGH_GAP)) {
    return 'wait'
  }
  if (quote.spread < THRESHOLDS.LOW_SPREAD && quote.gap !== null && quote.gap < THRESHOLDS.LOW_GAP) {
    return 'buy'
  }
  return 'neutral'
}

function getSignals(quotes) {
  return quotes.map(quote => ({ rateType: quote.rateType, name: quote.name, signal: getSignal(quote) }))
}

// Attach the signal to each quote.
// Quotes must already include spread and gap values.
function addSignals(quotes) {
  return quotes.map(quote => ({ ...quote, signal: getSignal(quote) }))
}

// An empty or omitted types array returns all quotes.
function filterByTypes(quotes, types) {
  if (!types || types.length === 0) return quotes
  return quotes.filter(c => types.includes(c.rateType))
}

module.exports = { calculateSpreads, calculateGap, sortBySellPrice, getSignals, addSignals, filterByTypes }
