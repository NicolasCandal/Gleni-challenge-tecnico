jest.mock('../backend/repositories/messageRepository', () => ({
  listarPorConversacion: jest.fn(),
  crear: jest.fn()
}))

jest.mock('../backend/repositories/toolExecutionRepository', () => ({
  listarPorConversacion: jest.fn(),
  crear: jest.fn()
}))

const { manejador } = require('../backend/tools/generateReport')
const repositorioMensaje = require('../backend/repositories/messageRepository')
const repositorioEjecucion = require('../backend/repositories/toolExecutionRepository')

const ID_CONVERSACION = 'conv-test-123'

const mensajesBase = [
  { id: '1', role: 'user',      content: 'Primera consulta' },
  { id: '2', role: 'assistant', content: 'Primera respuesta' },
  { id: '3', role: 'user',      content: 'Segunda consulta' },
  { id: '4', role: 'assistant', content: 'Segunda respuesta' },
]

const ejecucionesBase = [
  { tool_name: 'get_exchange_rates', latency_ms: 200, error: null, input: { rate_types: ['blue', 'oficial'] } },
  { tool_name: 'get_exchange_rates', latency_ms: 400, error: null, input: { rate_types: ['blue'] } },
  { tool_name: 'generate_session_report', latency_ms: 100, error: null, input: {} },
]

beforeEach(() => {
  repositorioMensaje.listarPorConversacion.mockResolvedValue(mensajesBase)
  repositorioEjecucion.listarPorConversacion.mockResolvedValue(ejecucionesBase)
})

describe('manejador generateReport — totalConsultas', () => {
  test('cuenta solo los mensajes con role user', async () => {
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.totalConsultas).toBe(2)
  })

  test('es 0 si no hay mensajes', async () => {
    repositorioMensaje.listarPorConversacion.mockResolvedValue([])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.totalConsultas).toBe(0)
  })
})

describe('manejador generateReport — usoHerramientas', () => {
  test('cuenta las ejecuciones agrupadas por nombre de herramienta', async () => {
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.usoHerramientas['get_exchange_rates']).toBe(2)
    expect(resultado.usoHerramientas['generate_session_report']).toBe(1)
  })

  test('es un objeto vacío si no hay ejecuciones', async () => {
    repositorioEjecucion.listarPorConversacion.mockResolvedValue([])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.usoHerramientas).toEqual({})
  })
})

describe('manejador generateReport — latenciaPromedioMs', () => {
  test('calcula el promedio correctamente', async () => {
    // (200 + 400 + 100) / 3 = 233
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.latenciaPromedioMs).toBe(233)
  })

  test('es null si no hay ejecuciones', async () => {
    repositorioEjecucion.listarPorConversacion.mockResolvedValue([])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.latenciaPromedioMs).toBeNull()
  })

  test('ignora ejecuciones con latency_ms null', async () => {
    repositorioEjecucion.listarPorConversacion.mockResolvedValue([
      { tool_name: 'get_exchange_rates', latency_ms: null, error: null, input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 300, error: null, input: {} },
    ])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.latenciaPromedioMs).toBe(300)
  })
})

describe('manejador generateReport — tiposConsultados', () => {
  test('deduplica los rate_types de todos los inputs', async () => {
    // blue aparece en dos ejecuciones, oficial solo en una
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.tiposConsultados).toContain('blue')
    expect(resultado.tiposConsultados).toContain('oficial')
    expect(resultado.tiposConsultados.filter(t => t === 'blue')).toHaveLength(1)
  })

  test('es array vacío si ninguna ejecución tiene rate_types', async () => {
    repositorioEjecucion.listarPorConversacion.mockResolvedValue([
      { tool_name: 'generate_session_report', latency_ms: 100, error: null, input: {} }
    ])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.tiposConsultados).toEqual([])
  })
})

describe('manejador generateReport — errores', () => {
  test('incluye solo las ejecuciones con error', async () => {
    repositorioEjecucion.listarPorConversacion.mockResolvedValue([
      { tool_name: 'get_exchange_rates', latency_ms: 200, error: null,              input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 150, error: 'API caída',       input: {} },
      { tool_name: 'get_exchange_rates', latency_ms: 180, error: 'Timeout',         input: {} },
    ])
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.errores).toHaveLength(2)
    expect(resultado.errores[0]).toEqual({ herramienta: 'get_exchange_rates', error: 'API caída' })
  })

  test('es array vacío si no hubo errores', async () => {
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.errores).toEqual([])
  })
})

describe('manejador generateReport — totalEjecuciones y estructura', () => {
  test('totalEjecuciones coincide con la cantidad de ejecuciones', async () => {
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.totalEjecuciones).toBe(3)
  })

  test('incluye el idConversacion en la respuesta', async () => {
    const resultado = await manejador({}, { idConversacion: ID_CONVERSACION })
    expect(resultado.idConversacion).toBe(ID_CONVERSACION)
  })

  test('lanza error si el repositorio falla', async () => {
    repositorioMensaje.listarPorConversacion.mockRejectedValue(new Error('DB no disponible'))
    await expect(manejador({}, { idConversacion: ID_CONVERSACION })).rejects.toThrow('DB no disponible')
  })
})
