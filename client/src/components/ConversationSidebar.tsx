import { useState, useRef } from 'react'
import {
  Box,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { ConversacionLocal } from '../hooks/useChat'

interface Props {
  conversaciones: ConversacionLocal[]
  conversationIdActivo: string | null
  onSeleccionar: (id: string) => void
  onNueva: () => void
  onEliminar: (id: string) => void
  onRenombrar: (id: string, titulo: string) => Promise<void>
  dark: boolean
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)

  if (fecha.toDateString() === hoy.toDateString()) {
    return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }
  if (fecha.toDateString() === ayer.toDateString()) {
    return 'Ayer'
  }
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function ConversationSidebar({
  conversaciones,
  conversationIdActivo,
  onSeleccionar,
  onNueva,
  onEliminar,
  onRenombrar,
  dark,
}: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const ordenadas = [...conversaciones].reverse()

  function iniciarEdicion(conv: ConversacionLocal) {
    setEditandoId(conv.id)
    setTextoEdicion(conv.titulo ?? 'Nueva conversacion')
    // focus se aplica en el proximo render via autoFocus
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setTextoEdicion('')
  }

  async function confirmarEdicion(id: string) {
    const titulo = textoEdicion.trim()
    cancelarEdicion()
    if (titulo) {
      await onRenombrar(id, titulo)
    }
  }

  return (
    <Box
      component="aside"
      aria-label="Historial de conversaciones"
      sx={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: dark ? 'grey.900' : 'grey.50',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
        >
          Conversaciones
        </Typography>
        <Tooltip title="Nueva conversacion">
          <IconButton size="small" onClick={onNueva} aria-label="Nueva conversacion" color="primary">
            <AddCommentOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
        {ordenadas.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="caption" color="text.disabled">
              Sin conversaciones
            </Typography>
          </Box>
        ) : (
          ordenadas.map(conv => (
            <ListItemButton
              key={conv.id}
              selected={conv.id === conversationIdActivo}
              onClick={() => {
                if (editandoId !== conv.id) onSeleccionar(conv.id)
              }}
              onMouseEnter={() => setHoverId(conv.id)}
              onMouseLeave={() => setHoverId(null)}
              sx={{
                py: 0.75,
                px: 1.5,
                alignItems: 'flex-start',
                pr: 0.5,
                '&.Mui-selected': {
                  bgcolor: dark ? 'primary.dark' : 'primary.light',
                  '&:hover': { bgcolor: dark ? 'primary.dark' : 'primary.light' },
                },
              }}
            >
              {editandoId === conv.id ? (
                <InputBase
                  inputRef={inputRef}
                  value={textoEdicion}
                  onChange={e => setTextoEdicion(e.target.value)}
                  autoFocus
                  fullWidth
                  size="small"
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmarEdicion(conv.id) }
                    if (e.key === 'Escape') { e.preventDefault(); cancelarEdicion() }
                  }}
                  onBlur={() => confirmarEdicion(conv.id)}
                  onClick={e => e.stopPropagation()}
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: dark ? 'grey.800' : 'background.paper',
                    border: 1,
                    borderColor: 'primary.main',
                    '& input': { p: 0 },
                  }}
                  inputProps={{ 'aria-label': 'Editar titulo de conversacion', maxLength: 100 }}
                />
              ) : (
                <ListItemText
                  primary={conv.titulo ?? 'Nueva conversacion'}
                  secondary={formatearFecha(conv.creadoEn)}
                  onDoubleClick={e => { e.stopPropagation(); iniciarEdicion(conv) }}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      noWrap: true,
                      sx: { fontWeight: conv.id === conversationIdActivo ? 600 : 400 },
                    },
                    secondary: {
                      variant: 'caption',
                      noWrap: true,
                    },
                  }}
                />
              )}

              {hoverId === conv.id && editandoId !== conv.id && (
                <Box sx={{ display: 'flex', flexShrink: 0, ml: 0.5 }}>
                  <Tooltip title="Renombrar">
                    <IconButton
                      size="small"
                      aria-label="Renombrar conversacion"
                      onClick={e => { e.stopPropagation(); iniciarEdicion(conv) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      aria-label="Eliminar conversacion"
                      onClick={e => { e.stopPropagation(); onEliminar(conv.id) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  )
}
