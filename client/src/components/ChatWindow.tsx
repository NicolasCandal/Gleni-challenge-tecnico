import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { MessageBubble } from './MessageBubble'
import type { Mensaje, FeedbackValor } from '../hooks/useChat'

interface Props {
  mensajes: Mensaje[]
  onFeedback: (messageId: string, feedback: FeedbackValor) => Promise<void>
}

export function ChatWindow({ mensajes, onFeedback }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  return (
    <Box
      component="section"
      sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      role="region"
      aria-label="Historial de chat"
      aria-live="polite"
      aria-relevant="additions"
    >
      {mensajes.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 8 }}
          role="status"
        >
          Preguntale al Asesor sobre cotizaciones del dólar
        </Typography>
      )}
      {mensajes.map((m, i) => (
        <MessageBubble key={m.id ?? i} mensaje={m} onFeedback={onFeedback} />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </Box>
  )
}
