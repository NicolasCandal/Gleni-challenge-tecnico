function chunkEvent(text) {
  return { type: 'chunk', text }
}

function usageEvent(tokens) {
  return { type: 'usage', tokens }
}

function toolStartEvent(tool) {
  return { type: 'tool_start', tool }
}

function errorEvent(message, status) {
  return { type: 'error', message, status: status || 500 }
}

function doneEvent(conversationId, assistantMessageId, title) {
  return { type: 'done', conversationId, assistantMessageId, title: title || null }
}

module.exports = { chunkEvent, usageEvent, toolStartEvent, errorEvent, doneEvent }
