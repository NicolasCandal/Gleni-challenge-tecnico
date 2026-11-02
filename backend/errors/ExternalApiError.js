class ExternalApiError extends Error {
  constructor(message = 'The exchange rate service is unavailable') {
    super(message)
    this.name = 'ExternalApiError'
    this.status = 503
  }
}

module.exports = { ExternalApiError }
