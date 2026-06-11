import { useState, useCallback, useEffect } from 'react'
import { fetchStream, fetchMensajes, HttpError, enviarFeedbackMensaje } from '../services/api'

export type Rol = 'user' | 'assistant'
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
  error: string | null
  errorStatus: number | null
  conversationId: string | null
  refreshKey: number
  enviar: (texto: string) => Promise<void>
  enviarFeedback: (messageId: string, feedback: FeedbackValor) => Promise<void>
  resetear: () => void
}

const CLAVE_CONVERSATION_ID = 'asesor_conversation_id'

export function useChat(): EstadoChat {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    () => localStorage.getItem(CLAVE_CONVERSATION_ID)
  )
  const [refreshKey, setRefreshKey] = useState(0)

  // Al montar, si hay una conversación guardada, recuperar su historial
  useEffect(() => {
    if (!conversationId) return

    fetchMensajes(conversationId).then(filas => {
      if (filas.length === 0) return
      setMensajes(filas.map(f => ({ id: f.id, rol: f.role, contenido: f.content, feedback: f.feedback ?? null })))
      setRefreshKey(k => k + 1)
    })
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

    try {
      await fetchStream(conversationId, texto, (evento) => {
        if (evento.tipo === 'chunk') {
          setMensajes(prev => {
            const copia = [...prev]
            const ultimo = copia[copia.length - 1]
            copia[copia.length - 1] = { ...ultimo, contenido: ultimo.contenido + evento.texto }
            return copia
          })
        } else if (evento.tipo === 'fin') {
          guardarConversationId(evento.conversationId)
          setRefreshKey(k => k + 1)
          setMensajes(prev => {
            const copia = [...prev]
            copia[copia.length - 1] = { ...copia[copia.length - 1], parcial: false, id: evento.assistantMessageId ?? copia[copia.length - 1].id }
            return copia
          })
        } else if (evento.tipo === 'error') {
          setError(evento.mensaje)
          setMensajes(prev => prev.slice(0, -1))
        }
      })
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error de conexión'
      setError(mensaje)
      setErrorStatus(err instanceof HttpError ? err.status : null)
      setMensajes(prev => prev.slice(0, -1))
    } finally {
      setCargando(false)
    }
  }, [conversationId, cargando])

  const resetear = useCallback(() => {
    localStorage.removeItem(CLAVE_CONVERSATION_ID)
    setConversationId(null)
    setMensajes([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
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

  return { mensajes, cargando, error, errorStatus, conversationId, refreshKey, enviar, enviarFeedback, resetear }
}
