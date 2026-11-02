jest.mock('../backend/infrastructure/openaiClient', () => ({
  chat: { completions: { create: jest.fn() } }
}))

jest.mock('../backend/services/sessionService', () => ({
  createConversation: jest.fn(),
  addMessage: jest.fn(),
  getHistory: jest.fn()
}))

jest.mock('../backend/repositories/toolExecutionRepository', () => ({
  create: jest.fn()
}))

jest.mock('../backend/repositories/conversationRepository', () => ({
  updateTitle: jest.fn()
}))

jest.mock('../backend/tools/getExchangeRates', () => ({
  definition: {
    name: 'get_exchange_rates',
    description: 'mock',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  handler: jest.fn()
}))

jest.mock('../backend/tools/generateReport', () => ({
  definition: {
    name: 'generate_session_report',
    description: 'mock',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  handler: jest.fn()
}))

jest.mock('../backend/prompts/agentPrompt', () => ({
  systemPrompt: 'You are a test assistant.'
}))

const { chat } = require('../backend/services/agentService')
const openaiClient = require('../backend/infrastructure/openaiClient')
const sessionService = require('../backend/services/sessionService')
const toolExecutionRepository = require('../backend/repositories/toolExecutionRepository')
const exchangeRatesTool = require('../backend/tools/getExchangeRates')

const ID_CONV = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const RESPONSE_TEXT = 'The blue dollar sell rate is ARS 1,200.'
const TOOL_RESULT = { quotes: [{ rateType: 'blue', buy: 1190, sell: 1200 }] }

async function* createStream(chunks) {
  for (const chunk of chunks) yield chunk
}

const chunksWithTool = [
  {
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          id: 'call_test_001',
          type: 'function',
          function: { name: 'get_exchange_rates', arguments: '{"rate_types":["blue"]}' }
        }]
      }
    }]
  },
  { usage: { total_tokens: 150 }, choices: [] }
]

const chunksWithText = [
  { choices: [{ delta: { content: RESPONSE_TEXT } }] },
  { usage: { total_tokens: 320 }, choices: [] }
]

beforeEach(() => {
  jest.resetAllMocks()

  sessionService.createConversation.mockResolvedValue({ id: ID_CONV })
  sessionService.addMessage.mockImplementation(({ role }) =>
    Promise.resolve({ id: 'msg-' + role })
  )
  sessionService.getHistory.mockResolvedValue([])

  toolExecutionRepository.create.mockResolvedValue({})
  exchangeRatesTool.handler.mockResolvedValue(TOOL_RESULT)

  openaiClient.chat.completions.create
    .mockResolvedValueOnce(createStream(chunksWithTool))
    .mockResolvedValueOnce(createStream(chunksWithText))
})

describe('agentService.chat — tool call flow', () => {
  test('calls OpenAI twice when the first response contains tool calls', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(2)
  })

  test('passes streamed arguments and conversation context to the tool handler', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(exchangeRatesTool.handler).toHaveBeenCalledWith(
      { rate_types: ['blue'] },
      { conversationId: ID_CONV }
    )
  })

  test('emits tool_start before executing the tool', async () => {
    const onChunk = jest.fn()
    await chat(ID_CONV, 'What is the blue dollar rate?', onChunk)
    expect(onChunk).toHaveBeenCalledWith({
      type: 'tool_start',
      tool: 'get_exchange_rates'
    })
  })

  test('includes the assistant tool call and tool result in the second request', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    const { messages } = openaiClient.chat.completions.create.mock.calls[1][0]
    const roles = messages.map(m => m.role)
    expect(roles).toContain('assistant')
    expect(roles).toContain('tool')
  })

  test('sends the handler output as the tool message in the second request', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    const { messages } = openaiClient.chat.completions.create.mock.calls[1][0]
    const toolMessage = messages.find(m => m.role === 'tool')
    expect(toolMessage.tool_call_id).toBe('call_test_001')
    expect(JSON.parse(toolMessage.content)).toEqual(TOOL_RESULT)
  })

  test('returns the second completion as the final response', async () => {
    const result = await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(result.response).toBe(RESPONSE_TEXT)
  })
})

describe('agentService.chat — persistence', () => {
  test('saves the tool execution with its name, input, and output', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(toolExecutionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: ID_CONV,
        toolName: 'get_exchange_rates',
        input: { rate_types: ['blue'] },
        output: TOOL_RESULT,
        errorMessage: null
      })
    )
  })

  test('saves token usage for the completion that requested tools (150)', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(toolExecutionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: ID_CONV,
        toolName: '_turn',
        tokensUsed: 150
      })
    )
  })

  test('saves token usage for the final text completion (320)', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(toolExecutionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: ID_CONV,
        toolName: '_turn',
        tokensUsed: 320
      })
    )
  })

  test('saves the final assistant message', async () => {
    await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(sessionService.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: ID_CONV,
        role: 'assistant',
        content: RESPONSE_TEXT
      })
    )
  })

  test('still returns a response if saving the tool execution fails', async () => {
    toolExecutionRepository.create.mockRejectedValueOnce(new Error('Database unavailable'))
    const result = await chat(ID_CONV, 'What is the blue dollar rate?', jest.fn())
    expect(result.response).toBe(RESPONSE_TEXT)
  })
})
