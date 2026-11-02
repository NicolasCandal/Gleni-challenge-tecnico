// Expose only the fields the client needs, in camelCase. Omit
// conversation_id because it is already part of the endpoint URL.
function createExecutionDTO({ id, tool_name, input, output, latency_ms, tokens_used, error, created_at }) {
  return {
    id,
    tool: tool_name,
    input,
    output,
    latencyMs: latency_ms,
    tokensUsed: tokens_used,
    error,
    createdAt: created_at
  }
}

function createExecutionsResponseDTO(executions) {
  return { executions }
}

module.exports = { createExecutionDTO, createExecutionsResponseDTO }
