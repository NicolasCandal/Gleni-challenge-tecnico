import { useState, useEffect } from 'react'
import { fetchEjecuciones, EjecucionHerramienta } from '../services/api'

interface Props {
  conversationId: string | null
  refreshKey: number
}

function PayloadColapsable({ label, datos }: { label: string; datos: unknown }) {
  const [expandido, setExpandido] = useState(false)
  const texto = JSON.stringify(datos, null, 2)
  const truncado = texto.length > 500 && !expandido

  return (
    <div className="mt-1">
      <span className="text-gray-400 text-xs">{label}: </span>
      <pre className="text-xs text-gray-600 bg-white rounded p-1 mt-0.5 overflow-x-auto whitespace-pre-wrap break-all">
        {truncado ? texto.slice(0, 500) + '…' : texto}
      </pre>
      {texto.length > 500 && (
        <button
          onClick={() => setExpandido(p => !p)}
          className="text-xs text-blue-500 hover:underline mt-0.5"
        >
          {expandido ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}

function TarjetaEjecucion({ ejec }: { ejec: EjecucionHerramienta }) {
  const [abierta, setAbierta] = useState(false)

  return (
    <div className="mb-2 border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setAbierta(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-medium text-gray-700 truncate">{ejec.tool_name}</span>
        <span className="text-gray-400 text-xs ml-2 shrink-0">{abierta ? '▲' : '▼'}</span>
      </button>

      <div className="px-3 pb-2 flex gap-3 text-xs text-gray-500">
        <span title="Latencia">{ejec.latency_ms} ms</span>
        {ejec.tokens_used != null && (
          <span title="Tokens usados">{ejec.tokens_used} tokens</span>
        )}
        {ejec.error && (
          <span className="text-red-500 truncate" title={ejec.error}>Error</span>
        )}
      </div>

      {abierta && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          {ejec.error && (
            <p className="text-xs text-red-500 mb-1">{ejec.error}</p>
          )}
          {ejec.input != null && <PayloadColapsable label="Entrada" datos={ejec.input} />}
          {ejec.output != null && <PayloadColapsable label="Salida" datos={ejec.output} />}
        </div>
      )}
    </div>
  )
}

export function ToolPanel({ conversationId, refreshKey }: Props) {
  const [abierto, setAbierto] = useState(true)
  const [ejecuciones, setEjecuciones] = useState<EjecucionHerramienta[]>([])

  useEffect(() => {
    if (!conversationId) return
    fetchEjecuciones(conversationId).then(setEjecuciones)
  }, [conversationId, refreshKey])

  return (
    <div className={`flex flex-col border-l border-gray-200 bg-gray-50 transition-all duration-300 ${abierto ? 'w-72' : 'w-10'}`}>
      <button
        onClick={() => setAbierto(p => !p)}
        className="flex items-center justify-center h-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
        title={abierto ? 'Cerrar panel' : 'Abrir panel'}
      >
        {abierto ? '›' : '‹'}
      </button>

      {abierto && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Herramientas
          </p>

          {!conversationId && (
            <p className="text-xs text-gray-400 italic">Sin conversación activa</p>
          )}

          {conversationId && ejecuciones.length === 0 && (
            <p className="text-xs text-gray-400 italic">Sin ejecuciones aún</p>
          )}

          {ejecuciones.map(ejec => (
            <TarjetaEjecucion key={ejec.id} ejec={ejec} />
          ))}
        </div>
      )}
    </div>
  )
}
