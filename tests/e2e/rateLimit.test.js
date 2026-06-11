jest.mock('../../src/services/agentService', () => ({
  chat: jest.fn().mockResolvedValue({ conversationId: 'test-id', respuesta: 'ok' })
}))

const request = require('supertest')
const app = require('../../src/app')

describe('Rate limiting en POST /api/chat', () => {
  test('permite hasta 10 requests por minuto y bloquea el 11vo con 429', async () => {
    const enviarRequest = () =>
      request(app)
        .post('/api/chat')
        .send({ mensaje: 'test' })

    for (let i = 0; i < 10; i++) {
      const res = await enviarRequest()
      expect(res.status).toBe(200)
    }

    const resLimitada = await enviarRequest()
    expect(resLimitada.status).toBe(429)
    expect(resLimitada.body.error).toMatch(/Demasiadas consultas/)
  })
})
