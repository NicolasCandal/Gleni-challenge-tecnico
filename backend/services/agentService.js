const { completarConStream } = require('../infrastructure/openaiStreamClient')
const servicioSesion = require('./sessionService')
const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const { promptSistema } = require('../prompts/agentPrompt')
const herramientas = require('../tools')
const { eventoToolStart } = require('../dtos/ChatDTO')

const HERRAMIENTAS = Object.fromEntries(herramientas.map(t => [t.definicion.name, t.manejador]))
const DEFINICIONES_HERRAMIENTAS = herramientas.map(t => ({ type: 'function', function: t.definicion }))

const MAX_ITERACIONES_TOOLS = 4

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
    salida = await manejador(entrada, { idConversacion })
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

async function chat(idConversacion, mensajeUsuario, onEvento) {
  if (!idConversacion) {
    const conversacion = await servicioSesion.crearConversacion()
    idConversacion = conversacion.id
  }

  const mensajeUsuarioGuardado = await servicioSesion.agregarMensaje({ idConversacion, rol: 'user', contenido: mensajeUsuario })

  const historial = await servicioSesion.obtenerHistorial(idConversacion)
  let mensajes = [{ role: 'system', content: promptSistema }, ...historial]

  let respuestaFinal = null
  let iteracion = 0
  let tokensAcumulados = 0

  while (iteracion < MAX_ITERACIONES_TOOLS) {
    const { mensajeAsistente, toolCalls, tokensUsados } = await completarConStream(mensajes, DEFINICIONES_HERRAMIENTAS, onEvento, tokensAcumulados)
    iteracion++

    if (!toolCalls.length) {
      respuestaFinal = mensajeAsistente.content
      if (tokensUsados) {
        try {
          await repositorioEjecucion.crear({
            idConversacion,
            nombreHerramienta: '_turno',
            entrada: {},
            salida: null,
            latenciaMs: 0,
            tokensUsados,
            errorMsg: null
          })
        } catch (err) {
          console.error('Error al persistir tokens del turno:', err.message)
        }
      }
      break
    }

    toolCalls.forEach(llamada => {
      onEvento?.(eventoToolStart(llamada.function.name))
    })

    const resultadosHerramientas = await Promise.all(
      toolCalls.map(llamada => ejecutarHerramienta(llamada, idConversacion))
    )

    if (tokensUsados) {
      tokensAcumulados += tokensUsados
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
  const mensajeAsistenteGuardado = await servicioSesion.agregarMensaje({ idConversacion, rol: 'assistant', contenido: respuestaFinal })
  return { conversationId: idConversacion, respuesta: respuestaFinal, assistantMessageId: mensajeAsistenteGuardado.id, userMessageId: mensajeUsuarioGuardado.id }
}

module.exports = { chat }
