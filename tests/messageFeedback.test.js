const request = require('supertest')
const app = require('../src/app')
const repositorioFeedback = require('../src/repositories/messageFeedbackRepository')

jest.mock('../src/repositories/messageFeedbackRepository', () => ({
  crearOActualizar: jest.fn(async ({ idMensaje, feedback }) => ({ id: 'feedback-id', message_id: idMensaje, feedback }))
}))

describe('POST /api/messages/:id/feedback', () => {
  test('rechaza feedback inválido', async () => {
    const res = await request(app)
      .post('/api/messages/123/feedback')
      .send({ feedback: 'meh' })

    expect(res.status).toBe(400)
  })

  test('persiste feedback válido', async () => {
    const messageId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const res = await request(app)
      .post(`/api/messages/${messageId}/feedback`)
      .send({ feedback: 'up' })

    expect(res.status).toBe(201)
    expect(repositorioFeedback.crearOActualizar).toHaveBeenCalledWith({
      idMensaje: messageId,
      feedback: 'up'
    })
    expect(res.body.feedback).toMatchObject({
      id: 'feedback-id',
      message_id: messageId,
      feedback: 'up'
    })
  })
})