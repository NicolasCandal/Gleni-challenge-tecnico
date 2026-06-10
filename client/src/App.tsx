import { useChat } from './hooks/useChat'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToolPanel } from './components/ToolPanel'

export default function App() {
  const { mensajes, cargando, error, conversationId, enviar } = useChat()

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 min-w-0">
        <header className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <h1 className="text-base font-semibold text-gray-800">Asesor de Cambio de Divisas</h1>
          <p className="text-xs text-gray-400">Cotizaciones en tiempo real · dolarapi.com</p>
        </header>

        <ChatWindow mensajes={mensajes} />

        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        <MessageInput onEnviar={enviar} deshabilitado={cargando} />
      </div>

      <ToolPanel conversationId={conversationId} />
    </div>
  )
}
