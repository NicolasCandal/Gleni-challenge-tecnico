import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchStream, fetchMensajes, HttpError, enviarFeedbackMensaje } from '../services/api'

export type Rol = 'user' | 'assistant' | 'tool_call'
export type FeedbackValor = 'up' | 'down'

export interface Mensaje {
  id?: string
  rol: Rol
  contenido: string
  parcial?: boolean
  feedback?: FeedbackValor | null
}

export interface EstadoChat {
  mensajes: Mensaje[]
  cargando: boolean
  cargandoConversation: boolean
  tokensLive: number | null
  error: string | null
  errorStatus: number | null
  rateLimited: boolean
  conversationId: string | null
  refreshKey: number
  enviar: (texto: string) => Promise<void>
  enviarFeedback: (messageId: string, feedback: FeedbackValor) => Promise<void>
  resetear: () => void
}

const CLAVE_CONVERSATION_ID = 'asesor_conversation_id'
const CLAVE_RATE_LIMIT = 'asesor_rate_limited_at'

export function useChat(): EstadoChat {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoConversation, setCargandoConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    () => localStorage.getItem(CLAVE_CONVERSATION_ID)
  )
  const [tokensLive, setTokensLive] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [rateLimitedAt, setRateLimitedAt] = useState<number | null>(() => {
    const guardado = localStorage.getItem(CLAVE_RATE_LIMIT)
    if (!guardado) return null
    const ts = Number(guardado)
    return Date.now() - ts < 60_000 ? ts : null
  })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!rateLimitedAt) {
      localStorage.removeItem(CLAVE_RATE_LIMIT)
      return
    }
    localStorage.setItem(CLAVE_RATE_LIMIT, String(rateLimitedAt))
    const ms = 60_000 - (Date.now() - rateLimitedAt)
    if (ms <= 0) { setRateLimitedAt(null); return }
    const t = setTimeout(() => setRateLimitedAt(null), ms)
    return () => clearTimeout(t)
  }, [rateLimitedAt])

  // Al montar, si hay una conversación guardada, recuperar su historial
  useEffect(() => {
    if (!conversationId) return

    setCargandoConversation(true)
    fetchMensajes(conversationId).then(filas => {
      if (filas.length === 0) return
      setMensajes(filas.map(f => ({ id: f.id, rol: f.role, contenido: f.content, feedback: f.feedback ?? null })))
      setRefreshKey(k => k + 1)
    }).finally(() => setCargandoConversation(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardarConversationId = (id: string) => {
    setConversationId(id)
    localStorage.setItem(CLAVE_CONVERSATION_ID, id)
  }

  const enviar = useCallback(async (texto: string) => {
    if (!texto.trim() || cargando) return

    setError(null)
    setErrorStatus(null)
    setCargando(true)

    setMensajes(prev => [...prev, { rol: 'user', contenido: texto }])
    setMensajes(prev => [...prev, { rol: 'assistant', contenido: '', parcial: true, feedback: null }])
    // Inicializar contador de tokens en cuanto se envía la consulta
    setTokensLive(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await fetchStream(conversationId, texto, (evento) => {
        if (evento.tipo === 'chunk') {
          setMensajes(prev => {
            const copia = [...prev]
            let idx = copia.length - 1
            while (idx >= 0 && copia[idx].rol !== 'assistant') idx--
            if (idx === -1) return copia
            copia[idx] = { ...copia[idx], contenido: copia[idx].contenido + evento.texto }
            return copia
          })
        } else if (evento.tipo === 'usage') {
          setTokensLive(evento.tokens)
        } else if (evento.tipo === 'tool_start') {
          setMensajes(prev => [...prev, { rol: 'tool_call', contenido: evento.herramienta, parcial: true }])
        } else if (evento.tipo === 'fin') {
          guardarConversationId(evento.conversationId)
          setRefreshKey(k => k + 1)
          setMensajes(prev => {
            const sinToolCalls = prev.filter(m => m.rol !== 'tool_call')
            const copia = [...sinToolCalls]
            copia[copia.length - 1] = { ...copia[copia.length - 1], parcial: false, id: evento.assistantMessageId ?? copia[copia.length - 1].id }
            return copia
          })
        } else if (evento.tipo === 'error') {
          setError(evento.mensaje)
          setErrorStatus(evento.status ?? null)
          if (evento.status === 429) setRateLimitedAt(Date.now())
          setMensajes(prev => prev.filter(m => m.rol !== 'tool_call').slice(0, -1))
        }
      }, controller.signal)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const mensaje = err instanceof Error ? err.message : 'Error de conexión'
      const status = err instanceof HttpError ? err.status : null
      setError(mensaje)
      setErrorStatus(status)
      if (status === 429) setRateLimitedAt(Date.now())
      setMensajes(prev => prev.filter(m => m.rol !== 'tool_call').slice(0, -1))
      // Al fallar la petición, limpiar el contador en vivo
      setTokensLive(null)
    } finally {
      abortRef.current = null
      setCargando(false)
    }
  }, [conversationId, cargando])

  const resetear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setCargandoConversation(true)
    localStorage.removeItem(CLAVE_CONVERSATION_ID)
    setConversationId(null)
    setMensajes([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
    // Mantener el loader visible un breve momento para la transición
    setTimeout(() => setCargandoConversation(false), 300)
  }, [])

  const enviarFeedback = useCallback(async (messageId: string, feedback: FeedbackValor) => {
    const mensajeAnterior = mensajes.find(m => m.id === messageId)
    if (!mensajeAnterior) return

    setMensajes(prev => prev.map(m => (m.id === messageId ? { ...m, feedback } : m)))

    try {
      await enviarFeedbackMensaje(messageId, feedback)
    } catch (err) {
      setMensajes(prev => prev.map(m => (m.id === messageId ? { ...m, feedback: mensajeAnterior.feedback ?? null } : m)))
      throw err
    }
  }, [mensajes])

  return { mensajes, cargando, cargandoConversation, tokensLive, error, errorStatus, rateLimited: rateLimitedAt !== null, conversationId, refreshKey, enviar, enviarFeedback, resetear }
}
