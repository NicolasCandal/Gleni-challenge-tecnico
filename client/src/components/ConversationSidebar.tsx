import { useState } from 'react'
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { ConversacionLocal } from '../hooks/useChat'

interface Props {
  conversaciones: ConversacionLocal[]
  conversationIdActivo: string | null
  onSeleccionar: (id: string) => void
  onNueva: () => void
  onEliminar: (id: string) => void
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

export function ConversationSidebar({ conversaciones, conversationIdActivo, onSeleccionar, onNueva, onEliminar, dark }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const ordenadas = [...conversaciones].reverse()

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
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
              onClick={() => onSeleccionar(conv.id)}
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
              <ListItemText
                primary={conv.titulo ?? 'Nueva conversacion'}
                secondary={formatearFecha(conv.creadoEn)}
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
              {hoverId === conv.id && (
                <Tooltip title="Eliminar">
                  <IconButton
                    size="small"
                    aria-label="Eliminar conversacion"
                    onClick={e => { e.stopPropagation(); onEliminar(conv.id) }}
                    sx={{ ml: 0.5, flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  )
}
