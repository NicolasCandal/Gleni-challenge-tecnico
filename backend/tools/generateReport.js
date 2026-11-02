const messageRepository = require('../repositories/messageRepository')
const toolExecutionRepository = require('../repositories/toolExecutionRepository')
const { createReportDTO } = require('../dtos/ReportDTO')


const definition = {
  name: 'generate_session_report',
  description: 'Summarize the current session: total queries, tool usage, average latency, dollar rate types requested, and errors. Does not call an external market data API.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
}

async function handler(_input, { conversationId }) {
  const [messages, executions] = await Promise.all([
    messageRepository.listByConversation(conversationId),
    toolExecutionRepository.listByConversation(conversationId)
  ])

  const totalQueries = messages.filter(m => m.role === 'user').length

  const toolUsage = executions.reduce((accumulator, e) => {
    accumulator[e.tool_name] = (accumulator[e.tool_name] || 0) + 1
    return accumulator
  }, {})

  const executionsWithLatency = executions.filter(e => e.latency_ms != null)
  const averageLatency = executionsWithLatency.length
    ? Math.round(executionsWithLatency.reduce((sum, e) => sum + e.latency_ms, 0) / executionsWithLatency.length)
    : null

  const queriedTypes = [...new Set(
    executions
      .filter(e => e.input?.rate_types?.length)
      .flatMap(e => e.input.rate_types)
  )]

  const errors = executions
    .filter(e => e.error)
    .map(e => ({ tool: e.tool_name, error: e.error }))

  return createReportDTO({
    conversationId,
    totalQueries,
    toolUsage,
    averageLatencyMs: averageLatency,
    queriedTypes,
    errors,
    totalExecutions: executions.length
  })
}

module.exports = { definition, handler }
