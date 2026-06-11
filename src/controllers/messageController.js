const { z } = require('zod')
const repositorioFeedback = require('../repositories/messageFeedbackRepository')

const EsquemaIdMensaje = z.string().uuid()

async function registrarFeedback(req, res, next) {
  try {
    const resultadoId = EsquemaIdMensaje.safeParse(req.params.id)
    if (!resultadoId.success) {
      return res.status(400).json({ error: 'El id del mensaje no es válido' })
    }

    const { feedback } = req.body
    const feedbackGuardado = await repositorioFeedback.crearOActualizar({
      idMensaje: resultadoId.data,
      feedback
    })

    res.status(201).json({ feedback: feedbackGuardado })
  } catch (err) {
    next(err)
  }
}

module.exports = { registrarFeedback }