const supabase = require('../config/database')

async function crear({ conversationId, toolName, input, output, latencyMs, error = null }) {
  const { data, errorDb } = await supabase
    .from('tool_executions')
    .insert({
      conversation_id: conversationId,
      tool_name: toolName,
      input,
      output,
      latency_ms: latencyMs,
      error
    })
    .select()
    .single()

  if (errorDb) throw errorDb
  return data
}

async function listarPorConversacion(conversationId) {
  const { data, error } = await supabase
    .from('tool_executions')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

module.exports = { crear, listarPorConversacion }
