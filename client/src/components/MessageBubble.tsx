import ReactMarkdown from 'react-markdown'
import type { Mensaje, FeedbackValor } from '../hooks/useChat'

interface Props {
  mensaje: Mensaje
  onFeedback: (messageId: string, feedback: FeedbackValor) => Promise<void>
}

export function MessageBubble({ mensaje, onFeedback }: Props) {
  const esUsuario = mensaje.rol === 'user'
  const puedeDarFeedback = !esUsuario && !mensaje.parcial && mensaje.id

  const manejarFeedback = async (feedback: FeedbackValor) => {
    if (!mensaje.id) return
    await onFeedback(mensaje.id, feedback)
  }

  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words
          ${esUsuario
            ? 'bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
          }
          ${mensaje.parcial ? 'opacity-80' : ''}
        `}
      >
        {esUsuario ? (
          mensaje.contenido
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {mensaje.contenido}
          </ReactMarkdown>
        )}
        {mensaje.parcial && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current align-middle animate-pulse rounded-sm" />
        )}
        {puedeDarFeedback && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <button
              type="button"
              onClick={() => manejarFeedback('up')}
              disabled={mensaje.feedback === 'up'}
              className={`rounded-full border px-2 py-1 transition-colors ${mensaje.feedback === 'up'
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'border-gray-200 hover:border-green-400 hover:text-green-600 dark:border-gray-700 dark:hover:border-green-500'
              }`}
              aria-label="Marcar respuesta como útil"
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => manejarFeedback('down')}
              disabled={mensaje.feedback === 'down'}
              className={`rounded-full border px-2 py-1 transition-colors ${mensaje.feedback === 'down'
                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'border-gray-200 hover:border-red-400 hover:text-red-600 dark:border-gray-700 dark:hover:border-red-500'
              }`}
              aria-label="Marcar respuesta como no útil"
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
