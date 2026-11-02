// Relative URLs share the same domain on Vercel in production.
// In development, the Vite proxy forwards /api to http://localhost:3000.

export interface ToolExecution {
  id: string
  tool: string
  input: unknown
  output: unknown
  latencyMs: number
  tokensUsed: number | null
  error: string | null
  createdAt: string
}

export async function fetchExecutions(conversationId: string): Promise<ToolExecution[]> {
  const response = await fetch(`/api/sessions/${conversationId}/executions`)
  if (!response.ok) return []
  const { executions } = await response.json()
  return executions ?? []
}

export interface MessageDTO {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  feedback?: 'up' | 'down' | null
}

export async function fetchMessages(conversationId: string): Promise<MessageDTO[]> {
  const response = await fetch(`/api/sessions/${conversationId}/messages`)
  if (!response.ok) return []
  const { messages } = await response.json()
  return messages ?? []
}

export interface ConversationDTO {
  id: string
  title: string | null
  createdAt: string
}

export async function fetchConversations(ids: string[]): Promise<ConversationDTO[]> {
  if (ids.length === 0) return []
  const response = await fetch(`/api/conversations?ids=${ids.join(',')}`)
  if (!response.ok) return []
  const { conversations } = await response.json()
  return conversations ?? []
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export type SSEEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; conversationId: string; assistantMessageId?: string; title?: string | null }
  | { type: 'usage'; tokens: number }
  | { type: 'error'; message: string; status?: number }
  | { type: 'tool_start'; tool: string }

export type FeedbackValue = 'up' | 'down'

export async function sendMessageFeedback(messageId: string, feedback: FeedbackValue): Promise<void> {
  const response = await fetch(`/api/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new HttpError(response.status, text || `Unexpected error (${response.status})`)
  }
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) {
    throw new HttpError(response.status, `Could not update title (${response.status})`)
  }
}

export async function fetchStream(
  conversationId: string | null,
  message: string,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), message }),
    signal,
  })

  if (!response.ok) {
    const messagesByStatus: Record<number, string> = {
      429: 'Request limit reached. Please wait a moment and try again.',
      503: 'The exchange rate service is currently unavailable.',
      500: 'Something went wrong on the server. Please try again in a few seconds.',
    }
    const errorText = messagesByStatus[response.status] ?? `Unexpected error (${response.status})`
    throw new HttpError(response.status, errorText)
  }

  if (!response.body) throw new Error('The server did not return a stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      if (!frame.startsWith('data: ')) continue
      try {
        const event = JSON.parse(frame.slice(6)) as SSEEvent
        onEvent(event)
      } catch {
        // Ignore malformed frames.
      }
    }
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new HttpError(response.status, `Could not delete conversation (${response.status})`)
  }
}
