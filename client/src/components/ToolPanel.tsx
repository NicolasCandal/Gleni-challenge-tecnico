import { useState } from 'react'

interface Props {
  conversationId: string | null
}

export function ToolPanel({ conversationId }: Props) {
  const [abierto, setAbierto] = useState(true)

  return (
    <div className={`flex flex-col border-l border-gray-200 bg-gray-50 transition-all duration-300 ${abierto ? 'w-72' : 'w-10'}`}>
      <button
        onClick={() => setAbierto(p => !p)}
        className="flex items-center justify-center h-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        title={abierto ? 'Cerrar panel' : 'Abrir panel'}
      >
        {abierto ? '›' : '‹'}
      </button>

      {abierto && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Sesión
          </p>
          {conversationId ? (
            <p className="text-xs text-gray-400 break-all font-mono">{conversationId}</p>
          ) : (
            <p className="text-xs text-gray-400 italic">Sin conversación activa</p>
          )}
        </div>
      )}
    </div>
  )
}
