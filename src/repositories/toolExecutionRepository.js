const supabase = require('../infrastructure/supabaseClient')

async function crear({ idConversacion, nombreHerramienta, entrada, salida, latenciaMs, tokensUsados = null, errorMsg = null }) {
  const { data, error } = await supabase
    .from('tool_executions')
    .insert({
      conversation_id: idConversacion,
      tool_name: nombreHerramienta,
      input: entrada,
      output: salida,
      latency_ms: latenciaMs,
      tokens_used: tokensUsados,
      error: errorMsg
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function listarPorConversacion(idConversacion) {
  const { data, error } = await supabase
    .from('tool_executions')
    .select('*')
    .eq('conversation_id', idConversacion)
    .neq('tool_name', '_turno')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

module.exports = { crear, listarPorConversacion }
