import { useState, useRef, useEffect } from 'react'

interface Props {
  onEnviar: (texto: string) => void
  deshabilitado: boolean
}

export function MessageInput({ onEnviar, deshabilitado }: Props) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!deshabilitado) textareaRef.current?.focus()
  }, [deshabilitado])

  const enviar = () => {
    if (!texto.trim() || deshabilitado) return
    onEnviar(texto.trim())
    setTexto('')
  }

  const manejarTecla = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <div className="flex gap-2 items-end p-4 border-t border-gray-200 bg-white">
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={manejarTecla}
        disabled={deshabilitado}
        placeholder="Escribí tu consulta... (Enter para enviar)"
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50
          disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        style={{ height: 'auto' }}
        onInput={e => {
          const t = e.currentTarget
          t.style.height = 'auto'
          t.style.height = `${t.scrollHeight}px`
        }}
      />
      <button
        onClick={enviar}
        disabled={deshabilitado || !texto.trim()}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white
          hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Enviar
      </button>
    </div>
  )
}
