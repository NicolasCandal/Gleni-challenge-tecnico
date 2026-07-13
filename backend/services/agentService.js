const { completarConStream } = require('../infrastructure/openaiStreamClient')
const clienteOpenAI = require('../infrastructure/openaiClient')
const servicioSesion = require('./sessionService')
const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const repositorioConversacion = require('../repositories/conversationRepository')
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
    if (!manejador) throw new Error('herramienta desconocida: ' + nombreHerramienta)

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
    console.error('Error al persistir ejecucion de herramienta:', errPersistencia.message)
  }

  return {
    tool_call_id: llamada.id,
    role: 'tool',
    content: errorMsg
      ? JSON.stringify({ error: errorMsg })
      : JSON.stringify(salida)
  }
}

async function generarTitulo(mensajeUsuario) {
  try {
    const completion = await clienteOpenAI.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Genera un titulo muy corto (maximo 5 palabras, en espanol) que describa esta consulta sobre cambio de divisas. Solo devuelve el titulo, sin comillas ni puntuacion final.\n\nConsulta: "' + mensajeUsuario + '"'
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
    })
    return completion.choices[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('Error al generar titulo:', err.message)
    return null
  }
}

async function chat(idConversacion, mensajeUsuario, onEvento) {
  if (!idConversacion) {
    const conversacion = await servicioSesion.crearConversacion()
    idConversacion = conversacion.id
  }

  const mensajeUsuarioGuardado = await servicioSesion.agregarMensaje({ idConversacion, rol: 'user', contenido: mensajeUsuario })

  const historial = await servicioSesion.obtenerHistorial(idConversacion)
  const esFirstExchange = historial.length === 1
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

  let titulo = null
  if (esFirstExchange) {
    titulo = await generarTitulo(mensajeUsuario)
    if (titulo) {
      try {
        await repositorioConversacion.actualizarTitulo(idConversacion, titulo)
      } catch (err) {
        console.error('Error al guardar titulo:', err.message)
        titulo = null
      }
    }
  }

  return {
    conversationId: idConversacion,
    respuesta: respuestaFinal,
    assistantMessageId: mensajeAsistenteGuardado.id,
    userMessageId: mensajeUsuarioGuardado.id,
    titulo,
  }
}

module.exports = { chat }
