import { useChat } from './hooks/useChat'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToolPanel } from './components/ToolPanel'

export default function App() {
  const { mensajes, cargando, error, errorStatus, conversationId, refreshKey, enviar } = useChat()

  const bannerError = error ? (() => {
    if (errorStatus === 429) return { clase: 'bg-yellow-50 border-yellow-300 text-yellow-800', icono: '⏱' }
    if (errorStatus === 503) return { clase: 'bg-orange-50 border-orange-300 text-orange-800', icono: '⚠️' }
    return { clase: 'bg-red-50 border-red-200 text-red-600', icono: '✕' }
  })() : null

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 min-w-0">
        <header className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <h1 className="text-base font-semibold text-gray-800">Asesor de Cambio de Divisas</h1>
          <p className="text-xs text-gray-400">Cotizaciones en tiempo real · dolarapi.com</p>
        </header>

        <ChatWindow mensajes={mensajes} />

        {error && bannerError && (
          <div className={`mx-4 mb-2 px-3 py-2 border rounded-lg text-xs flex items-center gap-2 ${bannerError.clase}`}>
            <span>{bannerError.icono}</span>
            <span>{error}</span>
          </div>
        )}

        <MessageInput onEnviar={enviar} deshabilitado={cargando} />
      </div>

      <ToolPanel conversationId={conversationId} refreshKey={refreshKey} />
    </div>
  )
}
