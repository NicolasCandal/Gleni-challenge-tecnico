import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchStream, fetchMensajes, fetchConversaciones, deleteConversacion, HttpError, enviarFeedbackMensaje } from '../services/api'

export type Rol = 'user' | 'assistant' | 'tool_call'
export type FeedbackValor = 'up' | 'down'

export interface Mensaje {
  id?: string
  rol: Rol
  contenido: string
  parcial?: boolean
  feedback?: FeedbackValor | null
}

export interface ConversacionLocal {
  id: string
  titulo: string | null
  creadoEn: string
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
  conversaciones: ConversacionLocal[]
  refreshKey: number
  enviar: (texto: string) => Promise<void>
  enviarFeedback: (messageId: string, feedback: FeedbackValor) => Promise<void>
  resetear: () => void
  seleccionarConversacion: (id: string) => Promise<void>
  eliminarConversacion: (id: string) => Promise<void>
}

const CLAVE_CONVERSACIONES = 'asesor_conversaciones'
const CLAVE_RATE_LIMIT = 'asesor_rate_limited_at'

function cargarConversaciones(): ConversacionLocal[] {
  try {
    const raw = localStorage.getItem(CLAVE_CONVERSACIONES)
    if (raw) return JSON.parse(raw) as ConversacionLocal[]
    // Migracion desde clave antigua
    const oldId = localStorage.getItem('asesor_conversation_id')
    if (oldId) {
      const migradas: ConversacionLocal[] = [{ id: oldId, titulo: null, creadoEn: new Date().toISOString() }]
      localStorage.setItem(CLAVE_CONVERSACIONES, JSON.stringify(migradas))
      localStorage.removeItem('asesor_conversation_id')
      return migradas
    }
    return []
  } catch {
    return []
  }
}

function guardarConversacionesEnStorage(conversaciones: ConversacionLocal[]) {
  localStorage.setItem(CLAVE_CONVERSACIONES, JSON.stringify(conversaciones))
}

export function useChat(): EstadoChat {
  const conversacionesIniciales = useRef(cargarConversaciones())

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoConversation, setCargandoConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [conversaciones, setConversaciones] = useState<ConversacionLocal[]>(conversacionesIniciales.current)
  const [conversationId, setConversationId] = useState<string | null>(
    () => conversacionesIniciales.current.at(-1)?.id ?? null
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

  // Al montar: sincronizar titulos y cargar historial de la conversacion activa
  useEffect(() => {
    const convs = conversacionesIniciales.current
    if (convs.length === 0) return

    // Sincronizar titulos desde el backend
    fetchConversaciones(convs.map(c => c.id)).then(remotas => {
      if (remotas.length === 0) return
      const mapaRemoto = Object.fromEntries(remotas.map(r => [r.id, r]))
      setConversaciones(prev => {
        const actualizadas = prev.map(c => ({
          ...c,
          titulo: mapaRemoto[c.id]?.titulo ?? c.titulo,
        }))
        guardarConversacionesEnStorage(actualizadas)
        return actualizadas
      })
    }).catch(() => { /* silencioso */ })

    // Cargar historial de la conversacion activa (la ultima)
    const idActivo = convs.at(-1)?.id
    if (!idActivo) return

    setCargandoConversation(true)
    fetchMensajes(idActivo).then(filas => {
      if (filas.length === 0) return
      setMensajes(filas.map(f => ({ id: f.id, rol: f.role, contenido: f.content, feedback: f.feedback ?? null })))
      setRefreshKey(k => k + 1)
    }).finally(() => setCargandoConversation(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agregarOActualizarConversacion = useCallback((id: string, titulo: string | null) => {
    setConversaciones(prev => {
      const existe = prev.find(c => c.id === id)
      let actualizadas: ConversacionLocal[]
      if (existe) {
        actualizadas = prev.map(c => c.id === id ? { ...c, titulo: titulo ?? c.titulo } : c)
      } else {
        actualizadas = [...prev, { id, titulo, creadoEn: new Date().toISOString() }]
      }
      guardarConversacionesEnStorage(actualizadas)
      return actualizadas
    })
  }, [])

  const seleccionarConversacion = useCallback(async (id: string) => {
    if (id === conversationId) return
    abortRef.current?.abort()
    abortRef.current = null
    setConversationId(id)
    setMensajes([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
    setTokensLive(null)

    setCargandoConversation(true)
    try {
      const filas = await fetchMensajes(id)
      if (filas.length > 0) {
        setMensajes(filas.map(f => ({ id: f.id, rol: f.role, contenido: f.content, feedback: f.feedback ?? null })))
        setRefreshKey(k => k + 1)
      }
    } catch {
      // silencioso
    } finally {
      setCargandoConversation(false)
    }
  }, [conversationId])

  const enviar = useCallback(async (texto: string) => {
    if (!texto.trim() || cargando) return

    setError(null)
    setErrorStatus(null)
    setCargando(true)

    setMensajes(prev => [...prev, { rol: 'user', contenido: texto }])
    setMensajes(prev => [...prev, { rol: 'assistant', contenido: '', parcial: true, feedback: null }])
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
          const nuevoId = evento.conversationId
          setConversationId(nuevoId)
          agregarOActualizarConversacion(nuevoId, evento.titulo ?? null)
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
      const mensaje = err instanceof Error ? err.message : 'Error de conexion'
      const status = err instanceof HttpError ? err.status : null
      setError(mensaje)
      setErrorStatus(status)
      if (status === 429) setRateLimitedAt(Date.now())
      setMensajes(prev => prev.filter(m => m.rol !== 'tool_call').slice(0, -1))
      setTokensLive(null)
    } finally {
      abortRef.current = null
      setCargando(false)
    }
  }, [conversationId, cargando, agregarOActualizarConversacion])

  const resetear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setConversationId(null)
    setMensajes([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
    setTokensLive(null)
  }, [])

  const eliminarConversacion = useCallback(async (id: string) => {
    // Optimistic: remove from local state first
    setConversaciones(prev => {
      const actualizadas = prev.filter(c => c.id !== id)
      guardarConversacionesEnStorage(actualizadas)
      return actualizadas
    })

    // If it was active, switch to the most recent remaining or reset
    if (id === conversationId) {
      setConversaciones(prev => {
        const restantes = prev // already filtered above
        const siguiente = restantes.at(-1)
        if (siguiente) {
          setConversationId(siguiente.id)
          setMensajes([])
          setRefreshKey(0)
          setCargandoConversation(true)
          fetchMensajes(siguiente.id).then(filas => {
            if (filas.length > 0) {
              setMensajes(filas.map(f => ({ id: f.id, rol: f.role, contenido: f.content, feedback: f.feedback ?? null })))
              setRefreshKey(k => k + 1)
            }
          }).finally(() => setCargandoConversation(false))
        } else {
          setConversationId(null)
          setMensajes([])
          setRefreshKey(0)
        }
        return prev
      })
    }

    // Fire and forget: delete from backend
    deleteConversacion(id).catch(err => {
      console.error('Error al eliminar conversacion en backend:', err.message)
    })
  }, [conversationId])


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

  return {
    mensajes,
    cargando,
    cargandoConversation,
    tokensLive,
    error,
    errorStatus,
    rateLimited: rateLimitedAt !== null,
    conversationId,
    conversaciones,
    refreshKey,
    enviar,
    enviarFeedback,
    resetear,
    seleccionarConversacion,
    eliminarConversacion,
  }
}
