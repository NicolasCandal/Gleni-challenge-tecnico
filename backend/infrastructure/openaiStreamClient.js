const openaiClient = require('./openaiClient')
const { chunkEvent, usageEvent } = require('../dtos/ChatDTO')

const MAX_RETRIES = 2
const BASE_DELAY_MS = 1000
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 30_000

async function completeWithStream(messages, toolDefinitions, onEvent, tokensBase = 0, attempt = 0) {
  let stream
  try {
    stream = await openaiClient.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true }
      },
      { timeout: OPENAI_TIMEOUT_MS }
    )
  } catch (err) {
    if (err.status === 429 && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await new Promise(res => setTimeout(res, delay))
      return completeWithStream(messages, toolDefinitions, onEvent, tokensBase, attempt + 1)
    }
    throw err
  }

  let textContent = ''
  const toolCallMap = {}
  let tokensUsed = null
  let estimatedTokens = tokensBase

  for await (const chunk of stream) {
    if (chunk.usage) {
      tokensUsed = chunk.usage.total_tokens
      onEvent?.(usageEvent(tokensBase + tokensUsed))
      continue
    }

    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.content) {
      textContent += delta.content
      onEvent?.(chunkEvent(delta.content))
      try {
        const chars = delta.content.length || 0
        const increment = Math.max(1, Math.ceil(chars / 4))
        estimatedTokens += increment
        onEvent?.(usageEvent(estimatedTokens))
      } catch (e) {
        // Token estimates must not interrupt streaming.
      }
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (!toolCallMap[tc.index]) {
          toolCallMap[tc.index] = {
            id: tc.id,
            type: 'function',
            function: { name: tc.function?.name ?? '', arguments: '' }
          }
        }
        if (tc.function?.arguments) {
          toolCallMap[tc.index].function.arguments += tc.function.arguments
        }
      }
    }
  }

  const toolCalls = Object.values(toolCallMap)

  const assistantMessage = {
    role: 'assistant',
    content: textContent || null,
    ...(toolCalls.length ? { tool_calls: toolCalls } : {})
  }

  return { assistantMessage, toolCalls, tokensUsed }
}

module.exports = { completeWithStream }
