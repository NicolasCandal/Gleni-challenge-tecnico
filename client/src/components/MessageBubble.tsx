import { Box, Paper, IconButton, Chip, CircularProgress } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import type { Message, FeedbackValue } from '../hooks/useChat'

interface Props {
  message: Message
  onFeedback: (messageId: string, feedback: FeedbackValue) => Promise<void>
}

const TOOL_LABELS: Record<string, string> = {
  get_exchange_rates: 'dollar exchange rates',
  get_latam_rate: 'currency exchange rate',
  generate_session_report: 'session report',
}

export function MessageBubble({ message, onFeedback }: Props) {
  if (message.role === 'tool_call') {
    const name = TOOL_LABELS[message.content] ?? message.content
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
        <Chip
          icon={<CircularProgress size={12} sx={{ color: 'inherit !important' }} />}
          label={'Looking up ' + name + '...'}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'text.secondary', borderColor: 'divider' }}
        />
      </Box>
    )
  }

  const isUser = message.role === 'user'
  const isThinking = !isUser && message.partial === true && message.content === ''
  const canGiveFeedback = !isUser && !message.partial && message.id

  const handleFeedback = async (feedback: FeedbackValue) => {
    if (!message.id) return
    await onFeedback(message.id, feedback)
  }

  if (isThinking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Paper
          elevation={1}
          role="status"
          aria-label="The assistant is thinking"
          sx={{
            borderRadius: '1rem',
            borderBottomLeftRadius: '0.25rem',
            px: 2,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                animation: 'bounce 1.2s ease-in-out infinite',
                animationDelay: (i * 0.2) + 's',
                '@keyframes bounce': {
                  '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.4 },
                  '40%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            />
          ))}
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {isUser ? (
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
            opacity: message.partial ? 0.8 : 1,
          }}
        >
          {message.content}
          {message.partial && (
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
            opacity: message.partial ? 0.8 : 1,
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
            {message.content}
          </ReactMarkdown>
          {message.partial && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current align-middle animate-pulse rounded-sm" />
          )}
          {canGiveFeedback && (
            <Box
              component="footer"
              sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
              role="group"
              aria-label="Response feedback"
            >
              <IconButton
                size="small"
                onClick={() => handleFeedback('up')}
                disabled={message.feedback === 'up'}
                aria-label="Mark response as helpful"
                aria-pressed={message.feedback === 'up'}
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
                onClick={() => handleFeedback('down')}
                disabled={message.feedback === 'down'}
                aria-label="Mark response as unhelpful"
                aria-pressed={message.feedback === 'down'}
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
