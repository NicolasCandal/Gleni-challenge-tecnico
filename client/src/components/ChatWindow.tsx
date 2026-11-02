import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { MessageBubble } from './MessageBubble'
import type { Message, FeedbackValue } from '../hooks/useChat'

interface Props {
  messages: Message[]
  onFeedback: (messageId: string, feedback: FeedbackValue) => Promise<void>
}

export function ChatWindow({ messages, onFeedback }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Box
      component="section"
      sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      role="region"
      aria-label="Chat history"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 8 }}
          role="status"
        >
          Ask about exchange rates or convert a currency to Argentine pesos.
        </Typography>
      )}
      {messages.map((m, i) => (
        <MessageBubble key={m.id ?? i} message={m} onFeedback={onFeedback} />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </Box>
  )
}
