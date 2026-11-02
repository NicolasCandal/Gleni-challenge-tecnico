const request = require('supertest')
const app = require('../backend/app')
const feedbackRepository = require('../backend/repositories/messageFeedbackRepository')

jest.mock('../backend/repositories/messageFeedbackRepository', () => ({
  upsert: jest.fn(async ({ messageId, feedback }) => ({ id: 'feedback-id', message_id: messageId, feedback }))
}))

describe('POST /api/messages/:id/feedback', () => {
  test('rejects invalid feedback', async () => {
    const res = await request(app)
      .post('/api/messages/123/feedback')
      .send({ feedback: 'meh' })

    expect(res.status).toBe(400)
  })

  test('persists valid feedback without exposing database columns', async () => {
    const messageId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const res = await request(app)
      .post(`/api/messages/${messageId}/feedback`)
      .send({ feedback: 'up' })

    expect(res.status).toBe(201)
    expect(feedbackRepository.upsert).toHaveBeenCalledWith({
      messageId: messageId,
      feedback: 'up'
    })
    expect(res.body.feedback).toEqual({
      messageId: messageId,
      feedback: 'up'
    })
    // Internal feedback columns must not leak into the response.
    expect(res.body.feedback).not.toHaveProperty('id')
    expect(res.body.feedback).not.toHaveProperty('message_id')
  })
})
