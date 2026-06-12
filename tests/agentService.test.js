jest.mock('../backend/infrastructure/openaiClient', () => ({
  chat: { completions: { create: jest.fn() } }
}))

jest.mock('../backend/services/sessionService', () => ({
  crearConversacion: jest.fn(),
  agregarMensaje: jest.fn(),
  obtenerHistorial: jest.fn()
}))

jest.mock('../backend/repositories/toolExecutionRepository', () => ({
  crear: jest.fn()
}))

jest.mock('../backend/tools/getExchangeRates', () => ({
  definicion: {
    name: 'get_exchange_rates',
    description: 'mock',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  manejador: jest.fn()
}))

jest.mock('../backend/tools/generateReport', () => ({
  definicion: {
    name: 'generate_session_report',
    description: 'mock',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  manejador: jest.fn()
}))

jest.mock('../backend/prompts/agentPrompt', () => ({
  promptSistema: 'Eres un asistente de prueba.'
}))

const { chat } = require('../backend/services/agentService')
const clienteOpenAI = require('../backend/infrastructure/openaiClient')
const servicioSesion = require('../backend/services/sessionService')
const repositorioEjecucion = require('../backend/repositories/toolExecutionRepository')
const herramientaGetExchangeRates = require('../backend/tools/getExchangeRates')

const ID_CONV = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const TEXTO_RESPUESTA = 'El dólar blue cotiza a $1200.'
const RESULTADO_TOOL = { cotizaciones: [{ casa: 'blue', compra: 1190, venta: 1200 }] }

async function* crearStream(chunks) {
  for (const chunk of chunks) yield chunk
}

// Stream 1: modelo decide usar get_exchange_rates
const chunksConTool = [
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

// Stream 2: modelo genera la respuesta final con el resultado de la tool
const chunksConTexto = [
  { choices: [{ delta: { content: TEXTO_RESPUESTA } }] },
  { usage: { total_tokens: 320 }, choices: [] }
]

beforeEach(() => {
  jest.resetAllMocks()

  servicioSesion.crearConversacion.mockResolvedValue({ id: ID_CONV })
  servicioSesion.agregarMensaje.mockImplementation(({ rol }) =>
    Promise.resolve({ id: `msg-${rol}` })
  )
  servicioSesion.obtenerHistorial.mockResolvedValue([])

  repositorioEjecucion.crear.mockResolvedValue({})
  herramientaGetExchangeRates.manejador.mockResolvedValue(RESULTADO_TOOL)

  clienteOpenAI.chat.completions.create
    .mockResolvedValueOnce(crearStream(chunksConTool))
    .mockResolvedValueOnce(crearStream(chunksConTexto))
})

describe('agentService.chat — flujo con tool call', () => {
  test('realiza dos llamadas a OpenAI cuando la primera devuelve tool_calls', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(clienteOpenAI.chat.completions.create).toHaveBeenCalledTimes(2)
  })

  test('ejecuta el manejador de la herramienta con los argumentos del stream', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(herramientaGetExchangeRates.manejador).toHaveBeenCalledWith(
      { rate_types: ['blue'] },
      { idConversacion: ID_CONV }
    )
  })

  test('emite tool_start por onChunk antes de ejecutar la herramienta', async () => {
    const onChunk = jest.fn()
    await chat(ID_CONV, '¿cómo está el blue?', onChunk)

    expect(onChunk).toHaveBeenCalledWith({
      tipo: 'tool_start',
      herramienta: 'get_exchange_rates'
    })
  })

  test('la segunda llamada incluye el mensaje asistente con tool_calls y el resultado de la tool', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    const { messages } = clienteOpenAI.chat.completions.create.mock.calls[1][0]
    const roles = messages.map(m => m.role)

    expect(roles).toContain('assistant') // mensaje que decidió usar la tool
    expect(roles).toContain('tool')      // resultado devuelto por el manejador
  })

  test('el mensaje tool en la segunda llamada contiene la salida del manejador', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    const { messages } = clienteOpenAI.chat.completions.create.mock.calls[1][0]
    const mensajeTool = messages.find(m => m.role === 'tool')

    expect(mensajeTool.tool_call_id).toBe('call_test_001')
    expect(JSON.parse(mensajeTool.content)).toEqual(RESULTADO_TOOL)
  })

  test('devuelve la respuesta de texto de la segunda llamada como respuesta final', async () => {
    const resultado = await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(resultado.respuesta).toBe(TEXTO_RESPUESTA)
  })
})

describe('agentService.chat — persistencia', () => {
  test('persiste la ejecución de la herramienta con nombre, entrada y salida', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(repositorioEjecucion.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        idConversacion: ID_CONV,
        nombreHerramienta: 'get_exchange_rates',
        entrada: { rate_types: ['blue'] },
        salida: RESULTADO_TOOL,
        errorMsg: null
      })
    )
  })

  test('persiste _turno con los tokens del turno que usó tools (150)', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(repositorioEjecucion.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        idConversacion: ID_CONV,
        nombreHerramienta: '_turno',
        tokensUsados: 150
      })
    )
  })

  test('persiste _turno con los tokens del turno final de texto (320)', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(repositorioEjecucion.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        idConversacion: ID_CONV,
        nombreHerramienta: '_turno',
        tokensUsados: 320
      })
    )
  })

  test('persiste el mensaje del asistente con la respuesta final de texto', async () => {
    await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(servicioSesion.agregarMensaje).toHaveBeenCalledWith(
      expect.objectContaining({
        idConversacion: ID_CONV,
        rol: 'assistant',
        contenido: TEXTO_RESPUESTA
      })
    )
  })

  test('un fallo en la persistencia de la herramienta no interrumpe la respuesta', async () => {
    repositorioEjecucion.crear.mockRejectedValueOnce(new Error('DB caída'))

    const resultado = await chat(ID_CONV, '¿cómo está el blue?', jest.fn())

    expect(resultado.respuesta).toBe(TEXTO_RESPUESTA)
  })
})
