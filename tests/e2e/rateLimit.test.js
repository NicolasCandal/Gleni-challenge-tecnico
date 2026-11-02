jest.mock('../../backend/services/agentService', () => ({
  chat: jest.fn().mockResolvedValue({ conversationId: 'test-id', response: 'ok' })
}))

const request = require('supertest')
const app = require('../../backend/app')

describe('POST /api/chat — rate limiting', () => {
  test('allows ten requests per minute and rejects the eleventh with 429', async () => {
    const sendRequest = () =>
      request(app)
        .post('/api/chat')
        .send({ message: 'test' })

    for (let i = 0; i < 10; i++) {
      const res = await sendRequest()
      expect(res.status).toBe(200)
    }

    const limitedResponse = await sendRequest()
    expect(limitedResponse.status).toBe(429)
    expect(limitedResponse.body.error).toMatch(/Too many requests/)
  })
})
