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
import { LocalConversation } from '../hooks/useChat'

interface Props {
  conversations: LocalConversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => Promise<void>
  dark: boolean
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  dark,
}: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sorted = [...conversations].reverse()

  function startEditing(conv: LocalConversation) {
    setEditingId(conv.id)
    setEditText(conv.title ?? 'New conversation')
    // autoFocus runs on the next render.
  }

  function cancelEditing() {
    setEditingId(null)
    setEditText('')
  }

  async function confirmEdit(id: string) {
    const title = editText.trim()
    cancelEditing()
    if (title) {
      await onRename(id, title)
    }
  }

  return (
    <Box
      component="aside"
      aria-label="Conversation history"
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
          Conversations
        </Typography>
        <Tooltip title="New conversation">
          <IconButton size="small" onClick={onNew} aria-label="New conversation" color="primary">
            <AddCommentOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="caption" color="text.disabled">
              No conversations yet
            </Typography>
          </Box>
        ) : (
          sorted.map(conv => (
            <ListItemButton
              key={conv.id}
              selected={conv.id === activeConversationId}
              onClick={() => {
                if (editingId !== conv.id) onSelect(conv.id)
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
              {editingId === conv.id ? (
                <InputBase
                  inputRef={inputRef}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                  fullWidth
                  size="small"
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmEdit(conv.id) }
                    if (e.key === 'Escape') { e.preventDefault(); cancelEditing() }
                  }}
                  onBlur={() => confirmEdit(conv.id)}
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
                  inputProps={{ 'aria-label': 'Edit conversation title', maxLength: 100 }}
                />
              ) : (
                <ListItemText
                  primary={conv.title ?? 'New conversation'}
                  secondary={formatDate(conv.createdAt)}
                  onDoubleClick={e => { e.stopPropagation(); startEditing(conv) }}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      noWrap: true,
                      sx: { fontWeight: conv.id === activeConversationId ? 600 : 400 },
                    },
                    secondary: {
                      variant: 'caption',
                      noWrap: true,
                    },
                  }}
                />
              )}

              {hoverId === conv.id && editingId !== conv.id && (
                <Box sx={{ display: 'flex', flexShrink: 0, ml: 0.5 }}>
                  <Tooltip title="Rename">
                    <IconButton
                      size="small"
                      aria-label="Rename conversation"
                      onClick={e => { e.stopPropagation(); startEditing(conv) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      aria-label="Delete conversation"
                      onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
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
