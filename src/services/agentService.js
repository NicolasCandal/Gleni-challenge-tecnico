const clienteOpenAI = require('../infrastructure/openaiClient')
const servicioSesion = require('./sessionService')
const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const { promptSistema } = require('../prompts/agentPrompt')
const herramientaGetExchangeRates = require('../tools/getExchangeRates')
const herramientaGenerateReport = require('../tools/generateReport')

const HERRAMIENTAS = {
  [herramientaGetExchangeRates.definicion.name]: herramientaGetExchangeRates.manejador,
  [herramientaGenerateReport.definicion.name]: herramientaGenerateReport.manejador
}

const DEFINICIONES_HERRAMIENTAS = [
  { type: 'function', function: herramientaGetExchangeRates.definicion },
  { type: 'function', function: herramientaGenerateReport.definicion }
]

const MAX_REINTENTOS = 2
const MAX_ITERACIONES_TOOLS = 4
const DEMORA_BASE_MS = 1000

// Llama a OpenAI con stream:true. Acumula tool_calls de los deltas y llama onChunk
// con cada delta de texto. OpenAI no emite texto cuando decide usar tools, así que
// onChunk solo dispara en la iteración final que devuelve respuesta de texto.
async function llamarOpenAI(mensajes, onChunk, intento = 0) {
  let flujo
  try {
    flujo = await clienteOpenAI.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: mensajes,
      tools: DEFINICIONES_HERRAMIENTAS,
      tool_choice: 'auto',
      stream: true,
      stream_options: { include_usage: true }
    })
  } catch (err) {
    if (err.status === 429 && intento < MAX_REINTENTOS) {
      const demora = DEMORA_BASE_MS * Math.pow(2, intento)
      await new Promise(res => setTimeout(res, demora))
      return llamarOpenAI(mensajes, onChunk, intento + 1)
    }
    throw err
  }

  let contenidoTexto = ''
  const mapaToolCalls = {}
  let tokensUsados = null

  for await (const chunk of flujo) {
    if (chunk.usage) {
      tokensUsados = chunk.usage.total_tokens
      continue
    }

    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.content) {
      contenidoTexto += delta.content
      onChunk?.(delta.content)
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

async function ejecutarHerramienta(llamada, idConversacion) {
  const nombreHerramienta = llamada.function.name
  const inicio = Date.now()
  let entrada = null
  let salida = null
  let errorMsg = null

  try {
    const manejador = HERRAMIENTAS[nombreHerramienta]
    if (!manejador) throw new Error(`herramienta desconocida: ${nombreHerramienta}`)

    entrada = JSON.parse(llamada.function.arguments)
    if (nombreHerramienta === 'generate_session_report') {
      entrada.conversation_id = idConversacion
    }
    salida = await manejador(entrada)
  } catch (err) {
    errorMsg = err.message
  }

  const latenciaMs = Date.now() - inicio

  try {
    await repositorioEjecucion.crear({
      idConversacion,
      nombreHerramienta,
      entrada,
      salida,
      latenciaMs,
      tokensUsados: null,
      errorMsg
    })
  } catch (errPersistencia) {
    console.error('Error al persistir ejecución de herramienta:', errPersistencia.message)
  }

  return {
    tool_call_id: llamada.id,
    role: 'tool',
    content: errorMsg
      ? JSON.stringify({ error: errorMsg })
      : JSON.stringify(salida)
  }
}

async function chat(idConversacion, mensajeUsuario, onChunk) {
  if (!idConversacion) {
    const conversacion = await servicioSesion.crearConversacion()
    idConversacion = conversacion.id
  }

  await servicioSesion.agregarMensaje({ idConversacion, rol: 'user', contenido: mensajeUsuario })

  const historial = await servicioSesion.obtenerHistorial(idConversacion)
  let mensajes = [{ role: 'system', content: promptSistema }, ...historial]

  let respuestaFinal = null
  let iteracion = 0

  while (iteracion < MAX_ITERACIONES_TOOLS) {
    const { mensajeAsistente, toolCalls, tokensUsados } = await llamarOpenAI(mensajes, onChunk)
    iteracion++

    if (!toolCalls.length) {
      respuestaFinal = mensajeAsistente.content
      break
    }

    const resultadosHerramientas = await Promise.all(
      toolCalls.map(llamada => ejecutarHerramienta(llamada, idConversacion))
    )

    if (tokensUsados) {
      try {
        await repositorioEjecucion.crear({
          idConversacion,
          nombreHerramienta: '_turno',
          entrada: null,
          salida: null,
          latenciaMs: 0,
          tokensUsados,
          errorMsg: null
        })
      } catch (err) {
        console.error('Error al persistir tokens del turno:', err.message)
      }
    }

    mensajes = [...mensajes, mensajeAsistente, ...resultadosHerramientas]
  }

  respuestaFinal = respuestaFinal ?? 'No pude generar una respuesta.'
  await servicioSesion.agregarMensaje({ idConversacion, rol: 'assistant', contenido: respuestaFinal })
  return { conversationId: idConversacion, respuesta: respuestaFinal }
}

module.exports = { chat }
