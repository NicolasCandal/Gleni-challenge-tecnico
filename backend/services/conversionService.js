function calculateConversionValues(quote, amount, isToArs) {
  const round = value => Math.round(value * 100) / 100
  const convert = rate => round(isToArs ? amount * rate : amount / rate)
  const transactionRate = isToArs ? quote.buy : quote.sell

  // Rates use the bureau's perspective: it buys currency when the user sells.
  return {
    reference: { exchangeRate: quote.sell, result: convert(quote.sell) },
    transaction: {
      side: isToArs ? 'buy' : 'sell',
      exchangeRate: transactionRate,
      result: convert(transactionRate),
    },
  }
}

module.exports = { calculateConversionValues }
