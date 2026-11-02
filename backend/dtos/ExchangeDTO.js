function createBaseQuoteDTO({ rateType, name, buy, sell, updatedAt }) {
  return { rateType, name, buy, sell, updatedAt }
}

function createReferenceDTO({ exchangeRate, result }) {
  return { exchangeRate, result }
}

function createTransactionDTO({ side, exchangeRate, result }) {
  return { side, exchangeRate, result }
}

function createConversionDTO({ amount, direction, rateUsed, reference, transaction }) {
  return {
    amount,
    direction,
    rateUsed,
    reference: createReferenceDTO(reference),
    transaction: createTransactionDTO(transaction)
  }
}

function createExchangeOutputDTO({ quotes, conversion, omitted, warning, source, timestamp }) {
  return { quotes, conversion, omitted, warning, source, timestamp }
}

module.exports = { createBaseQuoteDTO, createReferenceDTO, createTransactionDTO, createConversionDTO, createExchangeOutputDTO }
