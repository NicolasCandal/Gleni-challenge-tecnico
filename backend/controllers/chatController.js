const agentService = require('../services/agentService')
const { errorEvent, doneEvent } = require('../dtos/ChatDTO')

async function chat(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  const sendEvent = (event) => {
    res.write('data: ' + JSON.stringify(event) + '\n\n')
  }

  try {
    const { conversationId, message } = req.body

    const result = await agentService.chat(conversationId ?? null, message, sendEvent)

    sendEvent(doneEvent(result.conversationId, result.assistantMessageId, result.title))
    res.end()
  } catch (err) {
    sendEvent(errorEvent(err.message || 'Internal server error', err.status || 500))
    res.end()
  }
}

module.exports = { chat }
