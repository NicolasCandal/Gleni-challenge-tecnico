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

async function llamarOpenAI(mensajes, intento = 0) {
  try {
    return await clienteOpenAI.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: mensajes,
      tools: DEFINICIONES_HERRAMIENTAS,
      tool_choice: 'auto'
    })
  } catch (err) {
    if (err.status === 429 && intento < MAX_REINTENTOS) {
      const demora = DEMORA_BASE_MS * Math.pow(2, intento)
      await new Promise(res => setTimeout(res, demora))
      return llamarOpenAI(mensajes, intento + 1)
    }
    throw err
  }
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

async function chat(idConversacion, mensajeUsuario) {
  await servicioSesion.agregarMensaje({ idConversacion, rol: 'user', contenido: mensajeUsuario })

  const historial = await servicioSesion.obtenerHistorial(idConversacion)
  let mensajes = [{ role: 'system', content: promptSistema }, ...historial]

  let respuestaFinal = null
  let iteracion = 0

  while (iteracion < MAX_ITERACIONES_TOOLS) {
    const respuesta = await llamarOpenAI(mensajes)
    const mensajeAsistente = respuesta.choices[0].message
    iteracion++

    if (!mensajeAsistente.tool_calls?.length) {
      respuestaFinal = mensajeAsistente.content
      break
    }

    const resultadosHerramientas = await Promise.all(
      mensajeAsistente.tool_calls.map(llamada => ejecutarHerramienta(llamada, idConversacion))
    )

    mensajes = [...mensajes, mensajeAsistente, ...resultadosHerramientas]
  }

  respuestaFinal = respuestaFinal ?? 'No pude generar una respuesta.'
  await servicioSesion.agregarMensaje({ idConversacion, rol: 'assistant', contenido: respuestaFinal })
  return respuestaFinal
}

module.exports = { chat }
