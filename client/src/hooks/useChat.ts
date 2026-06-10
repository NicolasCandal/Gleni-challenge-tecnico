import { useState, useCallback } from 'react'
import { fetchStream, HttpError } from '../services/api'

export type Rol = 'user' | 'assistant'

export interface Mensaje {
  rol: Rol
  contenido: string
  parcial?: boolean
}

export interface EstadoChat {
  mensajes: Mensaje[]
  cargando: boolean
  error: string | null
  errorStatus: number | null
  conversationId: string | null
  refreshKey: number
  enviar: (texto: string) => Promise<void>
}

export function useChat(): EstadoChat {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const enviar = useCallback(async (texto: string) => {
    if (!texto.trim() || cargando) return

    setError(null)
    setErrorStatus(null)
    setCargando(true)

    setMensajes(prev => [...prev, { rol: 'user', contenido: texto }])
    setMensajes(prev => [...prev, { rol: 'assistant', contenido: '', parcial: true }])

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
          setConversationId(evento.conversationId)
          setRefreshKey(k => k + 1)
          setMensajes(prev => {
            const copia = [...prev]
            copia[copia.length - 1] = { ...copia[copia.length - 1], parcial: false }
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

  return { mensajes, cargando, error, errorStatus, conversationId, refreshKey, enviar }
}
