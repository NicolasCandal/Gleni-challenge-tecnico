jest.mock('../backend/repositories/messageRepository', () => ({
  listByConversation: jest.fn(),
  create: jest.fn()
}))

jest.mock('../backend/repositories/toolExecutionRepository', () => ({
  listByConversation: jest.fn(),
  create: jest.fn()
}))

const { handler } = require('../backend/tools/generateReport')
const messageRepository = require('../backend/repositories/messageRepository')
const toolExecutionRepository = require('../backend/repositories/toolExecutionRepository')

const CONVERSATION_ID = 'conv-test-123'

const baseMessages = [
  { id: '1', role: 'user',      content: 'First question' },
  { id: '2', role: 'assistant', content: 'First response' },
  { id: '3', role: 'user',      content: 'Second question' },
  { id: '4', role: 'assistant', content: 'Second response' },
]

const baseExecutions = [
  { tool_name: 'get_exchange_rates', latency_ms: 200, error: null, input: { rate_types: ['blue', 'official'] } },
  { tool_name: 'get_exchange_rates', latency_ms: 400, error: null, input: { rate_types: ['blue'] } },
  { tool_name: 'generate_session_report', latency_ms: 100, error: null, input: {} },
]

beforeEach(() => {
  messageRepository.listByConversation.mockResolvedValue(baseMessages)
  toolExecutionRepository.listByConversation.mockResolvedValue(baseExecutions)
})

describe('generateReport — totalQueries', () => {
  test('counts only user messages', async () => {
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.totalQueries).toBe(2)
  })

  test('returns zero when there are no messages', async () => {
    messageRepository.listByConversation.mockResolvedValue([])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.totalQueries).toBe(0)
  })
})

describe('generateReport — toolUsage', () => {
  test('counts executions grouped by tool name', async () => {
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.toolUsage['get_exchange_rates']).toBe(2)
    expect(result.toolUsage['generate_session_report']).toBe(1)
  })

  test('returns an empty object when there are no executions', async () => {
    toolExecutionRepository.listByConversation.mockResolvedValue([])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.toolUsage).toEqual({})
  })
})

describe('generateReport — averageLatencyMs', () => {
  test('calculates the rounded average latency', async () => {
    // (200 + 400 + 100) / 3 = 233
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.averageLatencyMs).toBe(233)
  })

  test('returns null when there are no executions', async () => {
    toolExecutionRepository.listByConversation.mockResolvedValue([])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.averageLatencyMs).toBeNull()
  })

  test('ignores executions with null latency', async () => {
    toolExecutionRepository.listByConversation.mockResolvedValue([
      { tool_name: 'get_exchange_rates', latency_ms: null, error: null, input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 300, error: null, input: {} },
    ])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.averageLatencyMs).toBe(300)
  })
})

describe('generateReport — queriedTypes', () => {
  test('deduplicates rate types across inputs', async () => {
    // Blue appears twice; official appears once.
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.queriedTypes).toContain('blue')
    expect(result.queriedTypes).toContain('official')
    expect(result.queriedTypes.filter(t => t === 'blue')).toHaveLength(1)
  })

  test('returns an empty array when no execution has rate types', async () => {
    toolExecutionRepository.listByConversation.mockResolvedValue([
      { tool_name: 'generate_session_report', latency_ms: 100, error: null, input: {} }
    ])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.queriedTypes).toEqual([])
  })
})

describe('generateReport — errors', () => {
  test('includes only failed executions', async () => {
    toolExecutionRepository.listByConversation.mockResolvedValue([
      { tool_name: 'get_exchange_rates', latency_ms: 200, error: null,              input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 150, error: 'API unavailable',       input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 180, error: 'Timeout',         input: {} },
    ])
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toEqual({ tool: 'get_exchange_rates', error: 'API unavailable' })
  })

  test('returns an empty array when there are no errors', async () => {
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.errors).toEqual([])
  })
})

describe('generateReport — totalExecutions and response shape', () => {
  test('returns the total number of executions', async () => {
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.totalExecutions).toBe(3)
  })

  test('includes the conversation ID', async () => {
    const result = await handler({}, { conversationId: CONVERSATION_ID })
    expect(result.conversationId).toBe(CONVERSATION_ID)
  })

  test('propagates repository errors', async () => {
    messageRepository.listByConversation.mockRejectedValue(new Error('Database unavailable'))
    await expect(handler({}, { conversationId: CONVERSATION_ID })).rejects.toThrow('Database unavailable')
  })
})
