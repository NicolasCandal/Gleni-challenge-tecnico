import { useMemo, useEffect, useState } from 'react'
import { useChat } from './hooks/useChat'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToolPanel } from './components/ToolPanel'
import { ConversationSidebar } from './components/ConversationSidebar'
import {
  Box,
  Alert,
  Backdrop,
  CircularProgress,
  CssBaseline,
  Switch,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
} from '@mui/material'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('dark_mode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark_mode', String(dark))
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

export default function App() {
  const { messages, loading, loadingConversation, tokensLive, error, errorStatus, rateLimited, conversationId, conversations, refreshKey, send, sendFeedback, reset, selectConversation, deleteConversation, renameConversation } = useChat()
  const { dark, toggle } = useDarkMode()

  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: dark ? 'dark' : 'light' } }),
    [dark]
  )

  const alertSeverity = errorStatus === 429 ? 'warning' : errorStatus === 503 ? 'warning' : 'error'

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}
        role="application"
        aria-label="Currency Exchange Advisor app"
      >
        {/* Conversation sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          onSelect={selectConversation}
          onNew={reset}
          onDelete={deleteConversation}
          onRename={renameConversation}
          dark={dark}
        />

        {/* Main content */}
        <Box component="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <AppBar position="static" color="default" elevation={1} component="header">
            <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="h1" sx={{ lineHeight: 1.3, fontWeight: 600 }}>
                  Currency Exchange Advisor
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Exchange rates · dolarapi.com and exchange-api
                </Typography>
              </Box>
              <Switch
                checked={dark}
                onChange={toggle}
                size="small"
                slotProps={{
                  input: {
                    'aria-label': `Toggle dark mode (currently ${dark ? 'dark' : 'light'})`,
                  },
                }}
              />
            </Toolbar>
          </AppBar>

          <ChatWindow messages={messages} onFeedback={sendFeedback} />

          {error && (
            <Alert severity={alertSeverity} sx={{ mx: 2, mb: 1 }} role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          <MessageInput onSend={send} disabled={loading} rateLimited={rateLimited} />
        </Box>

        <ToolPanel conversationId={conversationId} refreshKey={refreshKey} tokensLive={tokensLive} dark={dark} />

        <Backdrop open={loadingConversation} sx={{ zIndex: 50 }}>
          <Paper
            elevation={8}
            sx={{
              px: 3,
              py: 2,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CircularProgress size={20} />
            <Typography variant="body2">Loading conversation…</Typography>
          </Paper>
        </Backdrop>
      </Box>
    </ThemeProvider>
  )
}
