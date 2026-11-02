import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchStream, fetchMessages, fetchConversations, deleteConversation as deleteConversationRequest, updateConversationTitle, HttpError, sendMessageFeedback } from '../services/api'
import { loadConversations, saveConversationsToStorage, loadRateLimit, RATE_LIMIT_KEY } from '../services/conversationStorage'

export type Role = 'user' | 'assistant' | 'tool_call'
export type FeedbackValue = 'up' | 'down'

export interface Message {
  id?: string
  role: Role
  content: string
  partial?: boolean
  feedback?: FeedbackValue | null
}

export interface LocalConversation {
  id: string
  title: string | null
  createdAt: string
}

export interface ChatState {
  messages: Message[]
  loading: boolean
  loadingConversation: boolean
  tokensLive: number | null
  error: string | null
  errorStatus: number | null
  rateLimited: boolean
  conversationId: string | null
  conversations: LocalConversation[]
  refreshKey: number
  send: (text: string) => Promise<void>
  sendFeedback: (messageId: string, feedback: FeedbackValue) => Promise<void>
  reset: () => void
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
}

export function useChat(): ChatState {
  const [initialConversations] = useState(loadConversations)

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [conversations, setConversations] = useState<LocalConversation[]>(initialConversations)
  const [conversationId, setConversationId] = useState<string | null>(
    () => initialConversations.at(-1)?.id ?? null
  )
  const [tokensLive, setTokensLive] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [rateLimitedAt, setRateLimitedAt] = useState<number | null>(loadRateLimit)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!rateLimitedAt) {
      localStorage.removeItem(RATE_LIMIT_KEY)
      return
    }
    localStorage.setItem(RATE_LIMIT_KEY, String(rateLimitedAt))
    const ms = 60_000 - (Date.now() - rateLimitedAt)
    if (ms <= 0) { setRateLimitedAt(null); return }
    const t = setTimeout(() => setRateLimitedAt(null), ms)
    return () => clearTimeout(t)
  }, [rateLimitedAt])

  // Sync titles and load the active conversation on mount.
  useEffect(() => {
    const convs = initialConversations
    if (convs.length === 0) return

    // Sync titles from the backend.
    fetchConversations(convs.map(c => c.id)).then(remote => {
      if (remote.length === 0) return
      const remoteMap = Object.fromEntries(remote.map(r => [r.id, r]))
      setConversations(prev => {
        const updated = prev.map(c => ({
          ...c,
          title: remoteMap[c.id]?.title ?? c.title,
        }))
        saveConversationsToStorage(updated)
        return updated
      })
    }).catch(() => { /* Ignore background sync failures. */ })

    // Load the most recent conversation.
    const activeId = convs.at(-1)?.id
    if (!activeId) return

    setLoadingConversation(true)
    fetchMessages(activeId).then(rows => {
      if (rows.length === 0) return
      setMessages(rows.map(f => ({ id: f.id, role: f.role, content: f.content, feedback: f.feedback ?? null })))
      setRefreshKey(k => k + 1)
    }).finally(() => setLoadingConversation(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addOrUpdateConversation = useCallback((id: string, title: string | null) => {
    setConversations(prev => {
      const existing = prev.find(c => c.id === id)
      let updated: LocalConversation[]
      if (existing) {
        updated = prev.map(c => c.id === id ? { ...c, title: title ?? c.title } : c)
      } else {
        updated = [...prev, { id, title, createdAt: new Date().toISOString() }]
      }
      saveConversationsToStorage(updated)
      return updated
    })
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    if (id === conversationId) return
    abortRef.current?.abort()
    abortRef.current = null
    setConversationId(id)
    setMessages([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
    setTokensLive(null)

    setLoadingConversation(true)
    try {
      const rows = await fetchMessages(id)
      if (rows.length > 0) {
        setMessages(rows.map(f => ({ id: f.id, role: f.role, content: f.content, feedback: f.feedback ?? null })))
        setRefreshKey(k => k + 1)
      }
    } catch {
      // Ignore background sync failures.
    } finally {
      setLoadingConversation(false)
    }
  }, [conversationId])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    setError(null)
    setErrorStatus(null)
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setMessages(prev => [...prev, { role: 'assistant', content: '', partial: true, feedback: null }])
    setTokensLive(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await fetchStream(conversationId, text, (event) => {
        if (event.type === 'chunk') {
          setMessages(prev => {
            const copy = [...prev]
            let idx = copy.length - 1
            while (idx >= 0 && copy[idx].role !== 'assistant') idx--
            if (idx === -1) return copy
            copy[idx] = { ...copy[idx], content: copy[idx].content + event.text }
            return copy
          })
        } else if (event.type === 'usage') {
          setTokensLive(event.tokens)
        } else if (event.type === 'tool_start') {
          setMessages(prev => [...prev, { role: 'tool_call', content: event.tool, partial: true }])
        } else if (event.type === 'done') {
          const newId = event.conversationId
          setConversationId(newId)
          addOrUpdateConversation(newId, event.title ?? null)
          setRefreshKey(k => k + 1)
          setMessages(prev => {
            const withoutToolCalls = prev.filter(m => m.role !== 'tool_call')
            const copy = [...withoutToolCalls]
            copy[copy.length - 1] = { ...copy[copy.length - 1], partial: false, id: event.assistantMessageId ?? copy[copy.length - 1].id }
            return copy
          })
        } else if (event.type === 'error') {
          setError(event.message)
          setErrorStatus(event.status ?? null)
          if (event.status === 429) setRateLimitedAt(Date.now())
          setMessages(prev => prev.filter(m => m.role !== 'tool_call').slice(0, -1))
        }
      }, controller.signal)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Connection error'
      const status = err instanceof HttpError ? err.status : null
      setError(message)
      setErrorStatus(status)
      if (status === 429) setRateLimitedAt(Date.now())
      setMessages(prev => prev.filter(m => m.role !== 'tool_call').slice(0, -1))
      setTokensLive(null)
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }, [conversationId, loading, addOrUpdateConversation])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setConversationId(null)
    setMessages([])
    setError(null)
    setErrorStatus(null)
    setRefreshKey(0)
    setTokensLive(null)
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    // Optimistic: remove from local state first
    const remaining = conversations.filter(c => c.id !== id)
    setConversations(remaining)
    saveConversationsToStorage(remaining)

    // If it was active, switch to the most recent remaining or reset
    if (id === conversationId) {
      reset()
      const next = remaining.at(-1)
      if (next) void selectConversation(next.id)
    }

    // Fire and forget: delete from backend
    deleteConversationRequest(id).catch(err => {
      console.error('Could not delete conversation on the server:', err.message)
    })
  }, [conversationId, conversations, reset, selectConversation])


  const renameConversation = useCallback(async (id: string, title: string) => {
    const normalizedTitle = title.trim().slice(0, 100)
    if (!normalizedTitle) return
    const previousTitle = conversations.find(c => c.id === id)?.title ?? null

    // Optimistic update
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, title: normalizedTitle } : c)
      saveConversationsToStorage(updated)
      return updated
    })

    try {
      await updateConversationTitle(id, normalizedTitle)
    } catch (err) {
      console.error('Could not rename conversation:', err instanceof Error ? err.message : err)
      // revert on error
      setConversations(prev => {
        const reverted = prev.map(c =>
          c.id === id && c.title === normalizedTitle ? { ...c, title: previousTitle } : c
        )
        saveConversationsToStorage(reverted)
        return reverted
      })
    }
  }, [conversations])

  const sendFeedback = useCallback(async (messageId: string, feedback: FeedbackValue) => {
    const previousMessage = messages.find(m => m.id === messageId)
    if (!previousMessage) return

    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, feedback } : m)))

    try {
      await sendMessageFeedback(messageId, feedback)
    } catch (err) {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, feedback: previousMessage.feedback ?? null } : m)))
      throw err
    }
  }, [messages])

  return {
    messages,
    loading,
    loadingConversation,
    tokensLive,
    error,
    errorStatus,
    rateLimited: rateLimitedAt !== null,
    conversationId,
    conversations,
    refreshKey,
    send,
    sendFeedback,
    reset,
    selectConversation,
    deleteConversation,
    renameConversation,
  }
}
