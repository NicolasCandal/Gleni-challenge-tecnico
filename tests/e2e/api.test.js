// Cargar env vars antes que cualquier módulo los lea
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') })

jest.mock('../../backend/infrastructure/openaiClient', () => ({
  chat: { completions: { create: jest.fn() } }
}))
jest.mock('../../backend/infrastructure/dolarapiClient')

jest.setTimeout(20000)

const request = require('supertest')
const app = require('../../backend/app')
const clienteOpenAI = require('../../backend/infrastructure/openaiClient')
const { fetchExchangeRates } = require('../../backend/infrastructure/dolarapiClient')
const supabase = require('../../backend/infrastructure/supabaseClient')

// UUID válido pero inexistente en la DB
const UUID_INEXISTENTE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
let conversationIdPrueba = null
let supabaseDisponible = false

function parsearEventosSSE(texto) {
  return texto.split('\n')
    .filter(linea => linea.startsWith('data: '))
    .map(linea => JSON.parse(linea.slice(6)))
}

function mockStreamOpenAI(texto = 'Respuesta de prueba.') {
  clienteOpenAI.chat.completions.create.mockImplementation(async () =>
    (async function* () {
      yield { choices: [{ delta: { content: texto } }] }
      yield { choices: [{ delta: {} }], usage: { total_tokens: 50 } }
    })()
  )
}

beforeAll(async () => {
  // Calentamos Supabase y creamos datos de prueba para los tests de sesiones
  try {
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single()

    if (error) {
      console.warn('beforeAll: Supabase no disponible:', error.message)
      return
    }

    conversationIdPrueba = conv.id
    supabaseDisponible = true

    await supabase.from('messages').insert([
      { conversation_id: conv.id, role: 'user',      content: 'Consulta de prueba' },
      { conversation_id: conv.id, role: 'assistant', content: 'Respuesta de prueba' }
    ])
  } catch (e) {
    console.warn('beforeAll: error inesperado:', e.message)
  }
})

afterAll(async () => {
  if (conversationIdPrueba) {
    try {
      await supabase.from('messages').delete().eq('conversation_id', conversationIdPrueba)
      await supabase.from('tool_executions').delete().eq('conversation_id', conversationIdPrueba)
      await supabase.from('conversations').delete().eq('id', conversationIdPrueba)
    } catch { /* best-effort */ }
  }
  await supabase.removeAllChannels()
})

beforeEach(() => {
  fetchExchangeRates.mockResolvedValue({
    datos: [
      { casa: 'oficial', nombre: 'Oficial', compra: 1000, venta: 1010, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
      { casa: 'blue',    nombre: 'Blue',    compra: 1150, venta: 1200, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
    ],
    fuente: 'dolarapi.com',
    esFallback: false
  })
})

// ─── Health ───────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('devuelve 200 con status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

// ─── Chat ─────────────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {
  test('devuelve 400 si el body no tiene el campo mensaje', async () => {
    const res = await request(app).post('/api/chat').send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  test('devuelve 400 si mensaje es una cadena vacía', async () => {
    const res = await request(app).post('/api/chat').send({ mensaje: '' })
    expect(res.status).toBe(400)
  })

  test('responde con stream SSE que contiene chunks y evento fin', async () => {
    if (!supabaseDisponible) {
      console.warn('Supabase no disponible, omitiendo test')
      return
    }

    mockStreamOpenAI('Hola, esta es mi respuesta.')

    const res = await request(app)
      .post('/api/chat')
      .send({ mensaje: '¿Cuál es el dólar blue hoy?' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch('text/event-stream')

    const eventos = parsearEventosSSE(res.text)
    const chunks = eventos.filter(e => e.tipo === 'chunk')
    const fin = eventos.find(e => e.tipo === 'fin')

    expect(chunks.length).toBeGreaterThan(0)
    expect(fin).toBeDefined()
    expect(fin.conversationId).toBeDefined()
  })

  test('emite evento de error en el stream si OpenAI falla', async () => {
    clienteOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI no disponible'))

    const res = await request(app)
      .post('/api/chat')
      .send({ mensaje: '¿Cotización del dólar?' })

    expect(res.status).toBe(200)
    const eventos = parsearEventosSSE(res.text)
    const eventoError = eventos.find(e => e.tipo === 'error')
    expect(eventoError).toBeDefined()
    expect(eventoError.mensaje).toBeTruthy()
  })
})

// ─── Sesiones: ejecuciones ────────────────────────────────────────────────────

describe('GET /api/sessions/:id/executions', () => {
  test('devuelve 200 con array para una conversación existente', async () => {
    if (!conversationIdPrueba) {
      console.warn('Supabase no disponible, omitiendo test')
      return
    }
    const res = await request(app)
      .get(`/api/sessions/${conversationIdPrueba}/executions`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.ejecuciones)).toBe(true)
  })

  test('devuelve 200 con array vacío para un id inexistente', async () => {
    if (!conversationIdPrueba) {
      console.warn('Supabase no disponible, omitiendo test')
      return
    }
    const res = await request(app)
      .get(`/api/sessions/${UUID_INEXISTENTE}/executions`)
    expect(res.status).toBe(200)
    expect(res.body.ejecuciones).toEqual([])
  })
})

// ─── Sesiones: mensajes ───────────────────────────────────────────────────────

describe('GET /api/sessions/:id/messages', () => {
  test('devuelve 200 con mensajes de la conversación existente', async () => {
    if (!conversationIdPrueba) {
      console.warn('Supabase no disponible, omitiendo test')
      return
    }
    const res = await request(app)
      .get(`/api/sessions/${conversationIdPrueba}/messages`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.mensajes)).toBe(true)
    expect(res.body.mensajes.length).toBeGreaterThan(0)
  })

  test('devuelve 200 con array vacío para un id inexistente', async () => {
    if (!conversationIdPrueba) {
      console.warn('Supabase no disponible, omitiendo test')
      return
    }
    const res = await request(app)
      .get(`/api/sessions/${UUID_INEXISTENTE}/messages`)
    expect(res.status).toBe(200)
    expect(res.body.mensajes).toEqual([])
  })
})
