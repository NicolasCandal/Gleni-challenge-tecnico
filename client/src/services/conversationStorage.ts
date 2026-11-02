import type { LocalConversation } from '../hooks/useChat'

const CONVERSATIONS_KEY = 'exchange_advisor_conversations'
export const RATE_LIMIT_KEY = 'exchange_advisor_rate_limited_at'

export function saveConversationsToStorage(conversations: LocalConversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
}

export function loadConversations(): LocalConversation[] {
  try {
    const current = localStorage.getItem(CONVERSATIONS_KEY)
    if (current) return JSON.parse(current) as LocalConversation[]

    // Translate stored field names without changing existing conversation IDs or text.
    const legacy = localStorage.getItem('asesor_conversaciones')
    if (legacy) {
      const conversations = JSON.parse(legacy).map((row: {
        id: string; titulo?: string | null; creadoEn?: string
      }) => ({ id: row.id, title: row.titulo ?? null, createdAt: row.creadoEn ?? new Date().toISOString() }))
      saveConversationsToStorage(conversations)
      localStorage.removeItem('asesor_conversaciones')
      return conversations
    }

    const oldId = localStorage.getItem('asesor_conversation_id')
    if (!oldId) return []
    const conversations = [{ id: oldId, title: null, createdAt: new Date().toISOString() }]
    saveConversationsToStorage(conversations)
    localStorage.removeItem('asesor_conversation_id')
    return conversations
  } catch {
    return []
  }
}

export function loadRateLimit(): number | null {
  const saved = localStorage.getItem(RATE_LIMIT_KEY) ?? localStorage.getItem('asesor_rate_limited_at')
  if (saved) localStorage.setItem(RATE_LIMIT_KEY, saved)
  localStorage.removeItem('asesor_rate_limited_at')
  const timestamp = Number(saved)
  return saved && Date.now() - timestamp < 60_000 ? timestamp : null
}
