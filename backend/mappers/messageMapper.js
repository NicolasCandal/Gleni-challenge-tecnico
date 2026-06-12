const { crearMensajeDTO } = require('../dtos/MessageDTO')

function filaDBADto(fila) {
  return crearMensajeDTO(fila)
}

module.exports = { filaDBADto }
