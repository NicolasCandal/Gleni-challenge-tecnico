import { useState, useRef, useEffect } from 'react'
import { Box, TextField, Button } from '@mui/material'

interface Props {
  onEnviar: (texto: string) => void
  deshabilitado: boolean
}

export function MessageInput({ onEnviar, deshabilitado }: Props) {
  const [texto, setTexto] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!deshabilitado) inputRef.current?.focus()
  }, [deshabilitado])

  const enviar = () => {
    if (!texto.trim() || deshabilitado) return
    onEnviar(texto.trim())
    setTexto('')
  }

  const manejarTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
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
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={manejarTecla}
        disabled={deshabilitado}
        placeholder="Escribí tu consulta... (Enter para enviar)"
        multiline
        maxRows={4}
        size="small"
        fullWidth
        slotProps={{
          htmlInput: {
            'aria-label': 'Campo de entrada para consultas',
            'aria-describedby': 'textarea-help',
          },
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
      />
      <span id="textarea-help" className="sr-only">
        Presiona Enter para enviar tu consulta, Shift+Enter para nueva línea
      </span>
      <Button
        variant="contained"
        onClick={enviar}
        disabled={deshabilitado || !texto.trim()}
        aria-label="Enviar consulta"
        sx={{ borderRadius: '12px', px: 2, py: 1, flexShrink: 0, textTransform: 'none' }}
      >
        Enviar
      </Button>
    </Box>
  )
}
