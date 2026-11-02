const supabase = require('../infrastructure/supabaseClient')

async function create({ conversationId, toolName, input, output, latencyMs, tokensUsed = null, errorMessage = null }) {
  const { data, error } = await supabase
    .from('tool_executions')
    .insert({
      conversation_id: conversationId,
      tool_name: toolName,
      input: input,
      output: output,
      latency_ms: latencyMs,
      tokens_used: tokensUsed,
      error: errorMessage
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function listByConversation(conversationId) {
  const { data, error } = await supabase
    .from('tool_executions')
    .select('*')
    .eq('conversation_id', conversationId)
    .neq('tool_name', '_turn')
    .neq('tool_name', '_turno')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

module.exports = { create, listByConversation }
