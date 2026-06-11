import { Box, Paper, IconButton } from '@mui/material'
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
    <Box sx={{ display: 'flex', justifyContent: esUsuario ? 'flex-end' : 'flex-start' }}>
      {esUsuario ? (
        <Box
          sx={{
            maxWidth: '75%',
            borderRadius: '1rem',
            borderBottomRightRadius: '0.25rem',
            px: 2,
            py: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.875rem',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            opacity: mensaje.parcial ? 0.8 : 1,
          }}
        >
          {mensaje.contenido}
          {mensaje.parcial && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current align-middle animate-pulse rounded-sm" />
          )}
        </Box>
      ) : (
        <Paper
          elevation={1}
          sx={{
            maxWidth: '75%',
            borderRadius: '1rem',
            borderBottomLeftRadius: '0.25rem',
            px: 2,
            py: 1,
            fontSize: '0.875rem',
            wordBreak: 'break-word',
            opacity: mensaje.parcial ? 0.8 : 1,
          }}
        >
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
          {mensaje.parcial && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current align-middle animate-pulse rounded-sm" />
          )}
          {puedeDarFeedback && (
            <Box
              component="footer"
              sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
              role="group"
              aria-label="Herramientas de retroalimentación"
            >
              <IconButton
                size="small"
                onClick={() => manejarFeedback('up')}
                disabled={mensaje.feedback === 'up'}
                aria-label="Marcar respuesta como útil"
                aria-pressed={mensaje.feedback === 'up'}
                sx={{
                  '&.Mui-disabled': {
                    opacity: 1,
                    color: 'success.main',
                    bgcolor: 'success.light',
                  },
                }}
              >
                👍
              </IconButton>
              <IconButton
                size="small"
                onClick={() => manejarFeedback('down')}
                disabled={mensaje.feedback === 'down'}
                aria-label="Marcar respuesta como no útil"
                aria-pressed={mensaje.feedback === 'down'}
                sx={{
                  '&.Mui-disabled': {
                    opacity: 1,
                    color: 'error.main',
                    bgcolor: 'error.light',
                  },
                }}
              >
                👎
              </IconButton>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}
