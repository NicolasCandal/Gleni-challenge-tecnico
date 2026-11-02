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
import { fetchExecutions, ToolExecution } from '../services/api'

interface Props {
  conversationId: string | null
  refreshKey: number
  tokensLive?: number | null
  dark: boolean
}

function CollapsiblePayload({ label, data, dark }: { label: string; data: unknown; dark: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const text = JSON.stringify(data, null, 2)
  const truncated = text.length > 500 && !expanded

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
        {truncated ? text.slice(0, 500) + '…' : text}
      </pre>
      {text.length > 500 && (
        <button
          onClick={() => setExpanded(p => !p)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpanded(p => !p)
            }
          }}
          className="text-xs text-blue-500 hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Show less' : 'Show more'} ${label}`}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </Box>
  )
}

function ExecutionCard({ execution, dark }: { execution: ToolExecution; dark: boolean }) {
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
        aria-label={`${execution.tool} - Expand for details`}
        sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5, overflow: 'hidden' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: dark ? '#f9fafb' : 'text.primary' }}
          >
            {execution.tool}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: dark ? '#cbd5e1' : 'text.secondary' }} title="Latency">
              {execution.latencyMs} ms
            </Typography>
            {execution.tokensUsed != null && (
              <Typography variant="caption" sx={{ color: dark ? '#cbd5e1' : 'text.secondary' }} title="Tokens used">
                {execution.tokensUsed} tokens
              </Typography>
            )}
            {execution.error && (
              <Typography variant="caption" color="error" title={execution.error}>
                Error
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {execution.error && (
          <Typography variant="caption" color="error" component="p" sx={{ mb: 1 }}>
            {execution.error}
          </Typography>
        )}
        {execution.input != null && <CollapsiblePayload label="Input" data={execution.input} dark={dark} />}
        {execution.output != null && <CollapsiblePayload label="Output" data={execution.output} dark={dark} />}
      </AccordionDetails>
    </Accordion>
  )
}

export function ToolPanel({ conversationId, refreshKey, tokensLive, dark }: Props) {
  const [open, setOpen] = useState(true)
  const [executions, setExecutions] = useState<ToolExecution[]>([])

  useEffect(() => {
    if (!conversationId) {
      setExecutions([])
      setOpen(true)
      return
    }
    fetchExecutions(conversationId).then(setExecutions)
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
        width: open ? 288 : 40,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <IconButton
        onClick={() => setOpen(p => !p)}
        title={open ? 'Close panel' : 'Open panel'}
        aria-expanded={open}
        aria-label={`${open ? 'Close' : 'Open'} tool panel`}
        aria-controls="tool-panel-content"
        size="small"
        sx={{ height: 40, borderRadius: 0, color: dark ? '#e5e7eb' : 'text.secondary' }}
      >
        {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>

      {open && (
        <Box
          id="tool-panel-content"
          sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, color: dark ? '#e5e7eb' : 'text.primary' }}
          role="region"
          aria-label="Tool and token details"
        >
          <Typography
            variant="overline"
            sx={{ display: 'block', mb: 1, color: dark ? '#cbd5e1' : 'text.secondary' }}
          >
            Tools
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
                aria-label={`${tokensLive} tokens used`}
              >
                {tokensLive}
              </Box>
            </Typography>
          )}

          {!conversationId && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: dark ? '#94a3b8' : 'text.secondary' }}>
              No active conversation
            </Typography>
          )}

          {conversationId && executions.length === 0 && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: dark ? '#94a3b8' : 'text.secondary' }}>
              No tool calls yet
            </Typography>
          )}

          {executions.map(execution => (
            <ExecutionCard key={execution.id} execution={execution} dark={dark} />
          ))}
        </Box>
      )}
    </Box>
  )
}
