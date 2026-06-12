import { useMemo, useEffect, useState } from 'react'
import { useChat } from './hooks/useChat'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToolPanel } from './components/ToolPanel'
import {
  Box,
  Alert,
  Backdrop,
  CircularProgress,
  CssBaseline,
  Switch,
  Button,
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
  const { mensajes, cargando, cargandoConversation, tokensLive, error, errorStatus, rateLimited, conversationId, refreshKey, enviar, enviarFeedback, resetear } = useChat()
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
        aria-label="Aplicación Asesor de Cambio de Divisas"
      >
        <Box component="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <AppBar position="static" color="default" elevation={1} component="header">
            <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" component="h1" sx={{ lineHeight: 1.3, fontWeight: 600 }}>
                  Asesor de Cambio de Divisas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cotizaciones en tiempo real · dolarapi.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Switch
                  checked={dark}
                  onChange={toggle}
                  size="small"
                  slotProps={{
                    input: {
                      'aria-label': `Alternar modo oscuro (actualmente en ${dark ? 'oscuro' : 'claro'})`,
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetear}
                  disabled={cargando}
                  aria-label="Iniciar nueva conversación"
                  sx={{ textTransform: 'none', borderRadius: 1.5 }}
                >
                  Nueva conversación
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          <ChatWindow mensajes={mensajes} onFeedback={enviarFeedback} />

          {error && (
            <Alert severity={alertSeverity} sx={{ mx: 2, mb: 1 }} role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          <MessageInput onEnviar={enviar} deshabilitado={cargando} rateLimited={rateLimited} />
        </Box>

        <ToolPanel conversationId={conversationId} refreshKey={refreshKey} tokensLive={tokensLive} dark={dark} />

        <Backdrop open={cargandoConversation} sx={{ zIndex: 50 }}>
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
            <Typography variant="body2">Cargando conversación…</Typography>
          </Paper>
        </Backdrop>
      </Box>
    </ThemeProvider>
  )
}
