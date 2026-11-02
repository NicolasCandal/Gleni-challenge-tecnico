jest.mock('../../backend/infrastructure/openaiClient', () => ({
  chat: { completions: { create: jest.fn() } }
}))
jest.mock('../../backend/repositories/conversationRepository', () => ({
  create: jest.fn(), list: jest.fn(), updateTitle: jest.fn(), remove: jest.fn(),
}))
jest.mock('../../backend/repositories/messageRepository', () => ({
  create: jest.fn(), listByConversation: jest.fn(),
}))
jest.mock('../../backend/repositories/toolExecutionRepository', () => ({
  create: jest.fn(), listByConversation: jest.fn(),
}))

const request = require('supertest')
const app = require('../../backend/app')
const openaiClient = require('../../backend/infrastructure/openaiClient')
const conversationRepository = require('../../backend/repositories/conversationRepository')
const messageRepository = require('../../backend/repositories/messageRepository')
const toolExecutionRepository = require('../../backend/repositories/toolExecutionRepository')

const CONVERSATION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const MISSING_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const CREATED_AT = '2026-01-01T00:00:00.000Z'

function parseSSEEvents(text) {
  return text.split('\n').filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)))
}

beforeEach(() => {
  jest.resetAllMocks()
  conversationRepository.create.mockResolvedValue({ id: CONVERSATION_ID })
  conversationRepository.list.mockResolvedValue([{ id: CONVERSATION_ID, title: 'Dollar rates', created_at: CREATED_AT }])
  messageRepository.create.mockImplementation(async ({ role }) => ({ id: `message-${role}` }))
  messageRepository.listByConversation.mockImplementation(async id => id === CONVERSATION_ID ? [
    { id: 'user-id', role: 'user', content: 'Compare dollar rates.', created_at: CREATED_AT },
    { id: 'assistant-id', role: 'assistant', content: 'Here are the rates.', created_at: CREATED_AT, feedback: 'up' },
  ] : [])
  toolExecutionRepository.create.mockResolvedValue({})
  toolExecutionRepository.listByConversation.mockImplementation(async id => id === CONVERSATION_ID ? [{
    id: 'execution-id', conversation_id: CONVERSATION_ID, tool_name: 'get_exchange_rates',
    input: {}, output: {}, latency_ms: 42, tokens_used: null, error: null, created_at: CREATED_AT,
  }] : [])
  openaiClient.chat.completions.create.mockImplementation(async () => (async function* () {
    yield { choices: [{ delta: { content: 'Here are the current exchange rates.' } }] }
    yield { choices: [], usage: { total_tokens: 50 } }
  })())
})

describe('GET /api/health', () => {
  test('returns a healthy status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('POST /api/chat', () => {
  test.each([{}, { message: '' }])('rejects a missing or empty message: %j', async body => {
    const res = await request(app).post('/api/chat').send(body)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(messageRepository.create).not.toHaveBeenCalled()
  })

  test('streams English application events and persists the answer', async () => {
    const res = await request(app).post('/api/chat')
      .send({ conversationId: CONVERSATION_ID, message: 'Compare dollar rates.' })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch('text/event-stream')
    const events = parseSSEEvents(res.text)
    expect(events).toContainEqual({ type: 'chunk', text: 'Here are the current exchange rates.' })
    expect(events).toContainEqual({ type: 'usage', tokens: 50 })
    expect(events).toContainEqual({ type: 'done', conversationId: CONVERSATION_ID, assistantMessageId: 'message-assistant', title: null })
    expect(messageRepository.create).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID, role: 'assistant', content: 'Here are the current exchange rates.',
    })
  })

  test('creates a conversation and generates an English title for the first exchange', async () => {
    messageRepository.listByConversation.mockResolvedValue([{ role: 'user', content: 'Compare dollar rates.' }])
    openaiClient.chat.completions.create.mockResolvedValueOnce((async function* () {
      yield { choices: [{ delta: { content: 'Here are the rates.' } }] }
    })()).mockResolvedValueOnce({ choices: [{ message: { content: 'Dollar Rate Comparison' } }] })
    const res = await request(app).post('/api/chat').send({ message: 'Compare dollar rates.' })
    expect(conversationRepository.create).toHaveBeenCalledTimes(1)
    expect(conversationRepository.updateTitle).toHaveBeenCalledWith(CONVERSATION_ID, 'Dollar Rate Comparison')
    expect(openaiClient.chat.completions.create.mock.calls[1][0].messages[0].content).toContain('English title')
    expect(parseSSEEvents(res.text)).toContainEqual(expect.objectContaining({ type: 'done', title: 'Dollar Rate Comparison' }))
  })

  test('streams an error if OpenAI fails', async () => {
    openaiClient.chat.completions.create.mockRejectedValue(new Error('OpenAI unavailable'))
    const res = await request(app).post('/api/chat')
      .send({ conversationId: CONVERSATION_ID, message: 'What is the dollar rate?' })
    expect(res.status).toBe(200)
    expect(parseSSEEvents(res.text)).toContainEqual({ type: 'error', message: 'OpenAI unavailable', status: 500 })
    expect(messageRepository.create).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant' }))
  })
})

describe('GET /api/sessions/:id/executions', () => {
  test('returns public execution fields without leaking the conversation column', async () => {
    const res = await request(app).get(`/api/sessions/${CONVERSATION_ID}/executions`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ executions: [{
      id: 'execution-id', tool: 'get_exchange_rates', input: {}, output: {}, latencyMs: 42,
      tokensUsed: null, error: null, createdAt: CREATED_AT,
    }] })
  })
  test('returns an empty array for an unknown conversation', async () => {
    const res = await request(app).get(`/api/sessions/${MISSING_ID}/executions`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ executions: [] })
  })
})

describe('GET /api/sessions/:id/messages', () => {
  test('returns English message fields and hydrated feedback', async () => {
    const res = await request(app).get(`/api/sessions/${CONVERSATION_ID}/messages`)
    expect(res.status).toBe(200)
    expect(res.body.messages).toHaveLength(2)
    expect(res.body.messages[1]).toEqual({
      id: 'assistant-id', role: 'assistant', content: 'Here are the rates.', createdAt: CREATED_AT, feedback: 'up',
    })
  })
  test('returns an empty array for an unknown conversation', async () => {
    const res = await request(app).get(`/api/sessions/${MISSING_ID}/messages`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ messages: [] })
  })
})

describe('conversation management', () => {
  test('returns English conversation metadata', async () => {
    const res = await request(app).get(`/api/conversations?ids=${CONVERSATION_ID}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ conversations: [{ id: CONVERSATION_ID, title: 'Dollar rates', createdAt: CREATED_AT }] })
  })
  test('renames a conversation using a trimmed title', async () => {
    const res = await request(app).patch(`/api/conversations/${CONVERSATION_ID}`).send({ title: '  Euro conversion  ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: CONVERSATION_ID, title: 'Euro conversion' })
    expect(conversationRepository.updateTitle).toHaveBeenCalledWith(CONVERSATION_ID, 'Euro conversion')
  })
  test('rejects an empty title', async () => {
    const res = await request(app).patch(`/api/conversations/${CONVERSATION_ID}`).send({ title: ' ' })
    expect(res.status).toBe(400)
    expect(conversationRepository.updateTitle).not.toHaveBeenCalled()
  })
  test('deletes the requested conversation', async () => {
    const res = await request(app).delete(`/api/conversations/${CONVERSATION_ID}`)
    expect(res.status).toBe(204)
    expect(conversationRepository.remove).toHaveBeenCalledWith(CONVERSATION_ID)
  })
  test.each([['patch', '/api/conversations/invalid'], ['get', '/api/sessions/invalid/messages']])('rejects malformed UUIDs: %s %s', async (method, path) => {
    const res = await request(app)[method](path)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/valid UUID/)
  })
})
