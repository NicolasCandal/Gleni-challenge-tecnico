import { useState, useRef, useEffect } from 'react'
import { Box, TextField, Button } from '@mui/material'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
  rateLimited?: boolean
}

export function MessageInput({ onSend, disabled, rateLimited = false }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const send = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <TextField
        inputRef={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled || rateLimited}
        placeholder={rateLimited ? 'Request limit reached. Please wait a moment…' : 'Ask a question… (Enter to send)'}
        multiline
        maxRows={4}
        size="small"
        fullWidth
        slotProps={{
          htmlInput: {
            'aria-label': 'Message input',
            'aria-describedby': 'textarea-help',
          },
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
      />
      <span id="textarea-help" className="sr-only">
        Press Enter to send or Shift+Enter for a new line
      </span>
      <Button
        variant="contained"
        onClick={send}
        disabled={disabled || rateLimited || !text.trim()}
        aria-label="Send message"
        sx={{ borderRadius: '12px', px: 2, py: 1, flexShrink: 0, textTransform: 'none' }}
      >
        Send
      </Button>
    </Box>
  )
}
