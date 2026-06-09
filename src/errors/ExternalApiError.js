class ExternalApiError extends Error {
  constructor(message = 'Servicio de cotizaciones no disponible') {
    super(message)
    this.name = 'ExternalApiError'
    this.status = 503
  }
}

module.exports = { ExternalApiError }
