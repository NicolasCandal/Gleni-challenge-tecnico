const clienteOpenAI = require('./openaiClient')
const { eventoChunk, eventoUsage } = require('../dtos/ChatDTO')

const MAX_REINTENTOS = 2
const DEMORA_BASE_MS = 1000
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 30_000

async function completarConStream(mensajes, definicionesHerramientas, onEvento, tokensBase = 0, intento = 0) {
  let flujo
  try {
    flujo = await clienteOpenAI.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: mensajes,
        tools: definicionesHerramientas,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true }
      },
      { timeout: OPENAI_TIMEOUT_MS }
    )
  } catch (err) {
    if (err.status === 429 && intento < MAX_REINTENTOS) {
      const demora = DEMORA_BASE_MS * Math.pow(2, intento)
      await new Promise(res => setTimeout(res, demora))
      return completarConStream(mensajes, definicionesHerramientas, onEvento, tokensBase, intento + 1)
    }
    throw err
  }

  let contenidoTexto = ''
  const mapaToolCalls = {}
  let tokensUsados = null
  let tokensEstimados = tokensBase

  for await (const chunk of flujo) {
    if (chunk.usage) {
      tokensUsados = chunk.usage.total_tokens
      onEvento?.(eventoUsage(tokensBase + tokensUsados))
      continue
    }

    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.content) {
      contenidoTexto += delta.content
      onEvento?.(eventoChunk(delta.content))
      try {
        const chars = delta.content.length || 0
        const incremento = Math.max(1, Math.ceil(chars / 4))
        tokensEstimados += incremento
        onEvento?.(eventoUsage(tokensEstimados))
      } catch (e) {
        // no bloquear por errores de estimación
      }
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (!mapaToolCalls[tc.index]) {
          mapaToolCalls[tc.index] = {
            id: tc.id,
            type: 'function',
            function: { name: tc.function?.name ?? '', arguments: '' }
          }
        }
        if (tc.function?.arguments) {
          mapaToolCalls[tc.index].function.arguments += tc.function.arguments
        }
      }
    }
  }

  const toolCalls = Object.values(mapaToolCalls)

  const mensajeAsistente = {
    role: 'assistant',
    content: contenidoTexto || null,
    ...(toolCalls.length ? { tool_calls: toolCalls } : {})
  }

  return { mensajeAsistente, toolCalls, tokensUsados }
}

module.exports = { completarConStream }
