// Las rutas son relativas: en produccion frontend y backend comparten dominio en Vercel;
// en desarrollo el proxy de vite.config.ts reenvia /api -> http://localhost:3000.

export interface EjecucionHerramienta {
  id: string
  herramienta: string
  input: unknown
  output: unknown
  latenciaMs: number
  tokensUsados: number | null
  error: string | null
  creadoEn: string
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
  creadoEn: string
  feedback?: 'up' | 'down' | null
}

export async function fetchMensajes(conversationId: string): Promise<MensajeDTO[]> {
  const respuesta = await fetch(`/api/sessions/${conversationId}/messages`)
  if (!respuesta.ok) return []
  const { mensajes } = await respuesta.json()
  return mensajes ?? []
}

export interface ConversacionDTO {
  id: string
  titulo: string | null
  creadoEn: string
}

export async function fetchConversaciones(ids: string[]): Promise<ConversacionDTO[]> {
  if (ids.length === 0) return []
  const respuesta = await fetch(`/api/conversations?ids=${ids.join(',')}`)
  if (!respuesta.ok) return []
  const { conversaciones } = await respuesta.json()
  return conversaciones ?? []
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export type EventoSSE =
  | { tipo: 'chunk'; texto: string }
  | { tipo: 'fin'; conversationId: string; assistantMessageId?: string; titulo?: string | null }
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
  onEvento: (evento: EventoSSE) => void,
  signal?: AbortSignal
): Promise<void> {
  const respuesta = await fetch(`/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), mensaje }),
    signal,
  })

  if (!respuesta.ok) {
    const mensajesPorCodigo: Record<number, string> = {
      429: 'Limite de consultas alcanzado. Espera un momento antes de volver a intentar.',
      503: 'La API de cotizaciones no esta disponible en este momento.',
      500: 'Error interno del servidor. Intenta de nuevo en unos segundos.',
    }
    const textoError = mensajesPorCodigo[respuesta.status] ?? `Error inesperado (${respuesta.status})`
    throw new HttpError(respuesta.status, textoError)
  }

  if (!respuesta.body) throw new Error('El servidor no devolvio un stream')

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
        // ignorar lineas malformadas
      }
    }
  }
}
