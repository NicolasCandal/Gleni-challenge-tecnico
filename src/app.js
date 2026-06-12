require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { validateEnv } = require('./schemas/env.schema')
validateEnv()

const express = require('express')
const cors = require('cors')
const chatRoutes = require('./routes/chatRoutes')
const sessionRoutes = require('./routes/sessionRoutes')
const messageRoutes = require('./routes/messageRoutes')
const errorMiddleware = require('./middlewares/errorMiddleware')

const app = express()
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173')

app.set('trust proxy', 1)

app.use(cors({
  origin: corsOrigin,
  credentials: false,
}))
app.use(express.json())

app.get('/api/health', async (req, res) => {
  const clienteSupabase = require('./infrastructure/supabaseClient')
  const { error } = await clienteSupabase.from('conversations').select('id').limit(1)

  if (error) {
    return res.status(503).json({
      status: 'degraded',
      supabase: { ok: false, error: error.message },
    })
  }

  res.json({ status: 'ok', supabase: { ok: true } })
})

app.use('/api/chat', chatRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/messages', messageRoutes)

app.use(errorMiddleware)

module.exports = app
