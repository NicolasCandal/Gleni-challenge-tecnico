// Las rutas son relativas: en producción frontend y backend comparten dominio en Vercel;
// en desarrollo el proxy de vite.config.ts reenvía /api → http://localhost:3000.

export interface EjecucionHerramienta {
  id: string
  tool_name: string
  input: unknown
  output: unknown
  latency_ms: number
  tokens_used: number | null
  error: string | null
  created_at: string
}

export async function fetchEjecuciones(conversationId: string): Promise<EjecucionHerramienta[]> {
  const respuesta = await fetch(`/api/sessions/${conversationId}/executions`)
  if (!respuesta.ok) return []
  const { ejecuciones } = await respuesta.json()
  return ejecuciones ?? []
}

export interface MensajeDTO {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  feedback?: 'up' | 'down' | null
}

export async function fetchMensajes(conversationId: string): Promise<MensajeDTO[]> {
  const respuesta = await fetch(`/api/sessions/${conversationId}/messages`)
  if (!respuesta.ok) return []
  const { mensajes } = await respuesta.json()
  return mensajes ?? []
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export type EventoSSE =
  | { tipo: 'chunk'; texto: string }
  | { tipo: 'fin'; conversationId: string; assistantMessageId?: string }
  | { tipo: 'usage'; tokens: number }
  | { tipo: 'error'; mensaje: string; status?: number }
  | { tipo: 'tool_start'; herramienta: string }

export type FeedbackValor = 'up' | 'down'

export async function enviarFeedbackMensaje(messageId: string, feedback: FeedbackValor): Promise<void> {
  const respuesta = await fetch(`/api/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback })
  })

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '')
    throw new HttpError(respuesta.status, texto || `Error inesperado (${respuesta.status})`)
  }
}

export async function fetchStream(
  conversationId: string | null,
  mensaje: string,
  onEvento: (evento: EventoSSE) => void
): Promise<void> {
  const respuesta = await fetch(`/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), mensaje })
  })

  if (!respuesta.ok) {
    const mensajesPorCodigo: Record<number, string> = {
      429: 'Límite de consultas alcanzado. Esperá un momento antes de volver a intentar.',
      503: 'La API de cotizaciones no está disponible en este momento.',
      500: 'Error interno del servidor. Intentá de nuevo en unos segundos.',
    }
    const textoError = mensajesPorCodigo[respuesta.status] ?? `Error inesperado (${respuesta.status})`
    throw new HttpError(respuesta.status, textoError)
  }

  if (!respuesta.body) throw new Error('El servidor no devolvió un stream')

  const lector = respuesta.body.getReader()
  const decodificador = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await lector.read()
    if (done) break

    buffer += decodificador.decode(value, { stream: true })
    const lineas = buffer.split('\n\n')
    buffer = lineas.pop() ?? ''

    for (const linea of lineas) {
      if (!linea.startsWith('data: ')) continue
      try {
        const evento = JSON.parse(linea.slice(6)) as EventoSSE
        onEvento(evento)
      } catch {
        // ignorar líneas malformadas
      }
    }
  }
}
