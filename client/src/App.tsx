import { useEffect, useState } from 'react'
import { useChat } from './hooks/useChat'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToolPanel } from './components/ToolPanel'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('dark_mode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark_mode', String(dark))
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

export default function App() {
  const { mensajes, cargando, cargandoConversation, error, errorStatus, conversationId, refreshKey, enviar, enviarFeedback, resetear } = useChat()
  const { dark, toggle } = useDarkMode()

  const bannerError = error ? (() => {
    if (errorStatus === 429) return { clase: 'bg-yellow-50 border-yellow-300 text-yellow-800', icono: '⏱' }
    if (errorStatus === 503) return { clase: 'bg-orange-50 border-orange-300 text-orange-800', icono: '⚠️' }
    return { clase: 'bg-red-50 border-red-200 text-red-600', icono: '✕' }
  })() : null

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col flex-1 min-w-0">
        <header className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Asesor de Cambio de Divisas</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Cotizaciones en tiempo real · dolarapi.com</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label="Alternar modo oscuro"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 focus:outline-none
                ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                  transform transition-transform duration-200
                  ${dark ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
            <button
              onClick={resetear}
              disabled={cargando}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200
                border border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400
                rounded-md px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Nueva conversación
            </button>
          </div>
        </header>

        <ChatWindow mensajes={mensajes} onFeedback={enviarFeedback} />

        {error && bannerError && (
          <div className={`mx-4 mb-2 px-3 py-2 border rounded-lg text-xs flex items-center gap-2 ${bannerError.clase}`}>
            <span>{bannerError.icono}</span>
            <span>{error}</span>
          </div>
        )}

        <MessageInput onEnviar={enviar} deshabilitado={cargando} />
      </div>

      <ToolPanel conversationId={conversationId} refreshKey={refreshKey} />

      {cargandoConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded shadow flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-200">Cargando conversación…</span>
          </div>
        </div>
      )}
    </div>
  )
}
