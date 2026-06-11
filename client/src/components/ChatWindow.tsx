import { useEffect, useRef } from 'react'
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
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {mensajes.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
          Preguntale al Asesor sobre cotizaciones del dólar
        </p>
      )}
      {mensajes.map((m, i) => (
        <MessageBubble key={m.id ?? i} mensaje={m} onFeedback={onFeedback} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
