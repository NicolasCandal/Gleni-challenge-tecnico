const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export type EventoSSE =
  | { tipo: 'chunk'; texto: string }
  | { tipo: 'fin'; conversationId: string }
  | { tipo: 'error'; mensaje: string }

export async function fetchStream(
  conversationId: string | null,
  mensaje: string,
  onEvento: (evento: EventoSSE) => void
): Promise<void> {
  const respuesta = await fetch(`${URL_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), mensaje })
  })

  if (!respuesta.ok) {
    const mensajesError: Record<number, string> = {
      429: 'Límite de consultas alcanzado. Esperá un momento antes de volver a intentar.',
      503: 'La API de cotizaciones no está disponible en este momento.',
      500: 'Error interno del servidor. Intentá de nuevo en unos segundos.',
    }
    const mensaje = mensajesError[respuesta.status] ?? `Error inesperado (${respuesta.status})`
    throw new HttpError(respuesta.status, mensaje)
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
