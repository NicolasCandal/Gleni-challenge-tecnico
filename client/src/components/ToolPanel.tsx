import { useState, useEffect } from 'react'
import {
  Box,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { fetchEjecuciones, EjecucionHerramienta } from '../services/api'

interface Props {
  conversationId: string | null
  refreshKey: number
  tokensLive?: number | null
  dark: boolean
}

function PayloadColapsable({ label, datos, dark }: { label: string; datos: unknown; dark: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const texto = JSON.stringify(datos, null, 2)
  const truncado = texto.length > 500 && !expandido

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">{label}: </Typography>
      <pre
        style={{
          fontSize: '0.75rem',
          borderRadius: 4,
          padding: '4px',
          marginTop: 2,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
        className={dark ? 'bg-gray-950 text-gray-200' : 'bg-white text-gray-600'}
      >
        {truncado ? texto.slice(0, 500) + '…' : texto}
      </pre>
      {texto.length > 500 && (
        <button
          onClick={() => setExpandido(p => !p)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpandido(p => !p)
            }
          }}
          className="text-xs text-blue-500 hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded"
          aria-expanded={expandido}
          aria-label={`${expandido ? 'Ver menos' : 'Ver más'} ${label}`}
        >
          {expandido ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </Box>
  )
}

function TarjetaEjecucion({ ejec, dark }: { ejec: EjecucionHerramienta; dark: boolean }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mb: 1,
        '&:before': { display: 'none' },
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: dark ? '#111827' : 'background.default',
      }}
      component="article"
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        aria-label={`${ejec.herramienta} - Presiona para ver detalles`}
        sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5, overflow: 'hidden' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: dark ? '#f9fafb' : 'text.primary' }}
          >
            {ejec.herramienta}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: dark ? '#cbd5e1' : 'text.secondary' }} title="Latencia">
              {ejec.latenciaMs} ms
            </Typography>
            {ejec.tokensUsados != null && (
              <Typography variant="caption" sx={{ color: dark ? '#cbd5e1' : 'text.secondary' }} title="Tokens usados">
                {ejec.tokensUsados} tokens
              </Typography>
            )}
            {ejec.error && (
              <Typography variant="caption" color="error" title={ejec.error}>
                Error
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {ejec.error && (
          <Typography variant="caption" color="error" component="p" sx={{ mb: 1 }}>
            {ejec.error}
          </Typography>
        )}
        {ejec.input != null && <PayloadColapsable label="Entrada" datos={ejec.input} dark={dark} />}
        {ejec.output != null && <PayloadColapsable label="Salida" datos={ejec.output} dark={dark} />}
      </AccordionDetails>
    </Accordion>
  )
}

export function ToolPanel({ conversationId, refreshKey, tokensLive, dark }: Props) {
  const [abierto, setAbierto] = useState(true)
  const [ejecuciones, setEjecuciones] = useState<EjecucionHerramienta[]>([])

  useEffect(() => {
    if (!conversationId) {
      setEjecuciones([])
      setAbierto(true)
      return
    }
    fetchEjecuciones(conversationId).then(setEjecuciones)
  }, [conversationId, refreshKey])

  return (
    <Box
      component="aside"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: dark ? '#374151' : 'divider',
        bgcolor: dark ? '#0f172a' : 'background.paper',
        transition: 'width 300ms',
        width: abierto ? 288 : 40,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <IconButton
        onClick={() => setAbierto(p => !p)}
        title={abierto ? 'Cerrar panel' : 'Abrir panel'}
        aria-expanded={abierto}
        aria-label={`${abierto ? 'Cerrar' : 'Abrir'} panel de herramientas`}
        aria-controls="tool-panel-content"
        size="small"
        sx={{ height: 40, borderRadius: 0, color: dark ? '#e5e7eb' : 'text.secondary' }}
      >
        {abierto ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>

      {abierto && (
        <Box
          id="tool-panel-content"
          sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, color: dark ? '#e5e7eb' : 'text.primary' }}
          role="region"
          aria-label="Detalles de herramientas y tokens"
        >
          <Typography
            variant="overline"
            sx={{ display: 'block', mb: 1, color: dark ? '#cbd5e1' : 'text.secondary' }}
          >
            Herramientas
          </Typography>

          {tokensLive != null && (
            <Typography
              variant="caption"
              component="p"
              sx={{ mb: 1, color: dark ? '#cbd5e1' : 'text.secondary' }}
              role="status"
              aria-live="polite"
            >
              Tokens (live):{' '}
              <Box
                component="span"
                sx={{ fontWeight: 'medium', color: dark ? '#f9fafb' : 'text.primary' }}
                aria-label={`${tokensLive} tokens utilizados`}
              >
                {tokensLive}
              </Box>
            </Typography>
          )}

          {!conversationId && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: dark ? '#94a3b8' : 'text.secondary' }}>
              Sin conversación activa
            </Typography>
          )}

          {conversationId && ejecuciones.length === 0 && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: dark ? '#94a3b8' : 'text.secondary' }}>
              Sin ejecuciones aún
            </Typography>
          )}

          {ejecuciones.map(ejec => (
            <TarjetaEjecucion key={ejec.id} ejec={ejec} dark={dark} />
          ))}
        </Box>
      )}
    </Box>
  )
}
