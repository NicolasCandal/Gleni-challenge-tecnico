const { completeWithStream } = require('../infrastructure/openaiStreamClient')
const openaiClient = require('../infrastructure/openaiClient')
const sessionService = require('./sessionService')
const toolExecutionRepository = require('../repositories/toolExecutionRepository')
const conversationRepository = require('../repositories/conversationRepository')
const { systemPrompt } = require('../prompts/agentPrompt')
const tools = require('../tools')
const { toolStartEvent } = require('../dtos/ChatDTO')

const TOOL_HANDLERS = Object.fromEntries(tools.map(t => [t.definition.name, t.handler]))
const TOOL_DEFINITIONS = tools.map(t => ({ type: 'function', function: t.definition }))

const MAX_TOOL_ITERATIONS = 4

async function executeTool(call, conversationId) {
  const toolName = call.function.name
  const start = Date.now()
  let input = null
  let output = null
  let errorMessage = null

  try {
    const handler = TOOL_HANDLERS[toolName]
    if (!handler) throw new Error('Unknown tool: ' + toolName)

    input = JSON.parse(call.function.arguments)
    output = await handler(input, { conversationId })
  } catch (err) {
    errorMessage = err.message
  }

  const latencyMs = Date.now() - start

  try {
    await toolExecutionRepository.create({
      conversationId,
      toolName,
      input,
      output,
      latencyMs,
      tokensUsed: null,
      errorMessage
    })
  } catch (persistenceError) {
    console.error('Could not save tool execution:', persistenceError.message)
  }

  return {
    tool_call_id: call.id,
    role: 'tool',
    content: errorMessage
      ? JSON.stringify({ error: errorMessage })
      : JSON.stringify(output)
  }
}

async function generateTitle(userMessage) {
  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Write a short English title (at most 5 words) for this currency exchange question. Return only the title, without quotation marks or a final period.\n\nQuestion: "' + userMessage + '"'
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
    })
    return completion.choices[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('Could not generate title:', err.message)
    return null
  }
}

async function chat(conversationId, userMessage, onEvent) {
  if (!conversationId) {
    const conversation = await sessionService.createConversation()
    conversationId = conversation.id
  }

  const savedUserMessage = await sessionService.addMessage({ conversationId, role: 'user', content: userMessage })

  const history = await sessionService.getHistory(conversationId)
  const isFirstExchange = history.length === 1
  let messages = [{ role: 'system', content: systemPrompt }, ...history]

  let finalResponse = null
  let iteration = 0
  let accumulatedTokens = 0

  while (iteration < MAX_TOOL_ITERATIONS) {
    const { assistantMessage, toolCalls, tokensUsed } = await completeWithStream(messages, TOOL_DEFINITIONS, onEvent, accumulatedTokens)
    iteration++

    if (!toolCalls.length) {
      finalResponse = assistantMessage.content
      if (tokensUsed) {
        try {
          await toolExecutionRepository.create({
            conversationId,
            toolName: '_turn',
            input: {},
            output: null,
            latencyMs: 0,
            tokensUsed,
            errorMessage: null
          })
        } catch (err) {
          console.error('Could not save turn token usage:', err.message)
        }
      }
      break
    }

    toolCalls.forEach(call => {
      onEvent?.(toolStartEvent(call.function.name))
    })

    const toolResults = await Promise.all(
      toolCalls.map(call => executeTool(call, conversationId))
    )

    if (tokensUsed) {
      accumulatedTokens += tokensUsed
      try {
        await toolExecutionRepository.create({
          conversationId,
          toolName: '_turn',
          input: null,
          output: null,
          latencyMs: 0,
          tokensUsed,
          errorMessage: null
        })
      } catch (err) {
        console.error('Could not save turn token usage:', err.message)
      }
    }

    messages = [...messages, assistantMessage, ...toolResults]
  }

  finalResponse = finalResponse ?? 'I could not generate a response.'
  const savedAssistantMessage = await sessionService.addMessage({ conversationId, role: 'assistant', content: finalResponse })

  let title = null
  if (isFirstExchange) {
    title = await generateTitle(userMessage)
    if (title) {
      try {
        await conversationRepository.updateTitle(conversationId, title)
      } catch (err) {
        console.error('Could not save title:', err.message)
        title = null
      }
    }
  }

  return {
    conversationId: conversationId,
    response: finalResponse,
    assistantMessageId: savedAssistantMessage.id,
    userMessageId: savedUserMessage.id,
    title,
  }
}

module.exports = { chat }
