require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const chatRoutes = require('./routes/chatRoutes')
const sessionRoutes = require('./routes/sessionRoutes')
const errorMiddleware = require('./middlewares/errorMiddleware')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/chat', chatRoutes)
app.use('/api/sessions', sessionRoutes)

app.use(errorMiddleware)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

module.exports = app
