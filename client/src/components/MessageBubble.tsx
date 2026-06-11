import ReactMarkdown from 'react-markdown'
import type { Mensaje } from '../hooks/useChat'

interface Props {
  mensaje: Mensaje
}

export function MessageBubble({ mensaje }: Props) {
  const esUsuario = mensaje.rol === 'user'

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
      </div>
    </div>
  )
}
