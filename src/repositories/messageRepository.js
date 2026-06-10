const supabase = require('../config/database')

async function crear({ conversationId, role, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single()

  if (error) throw error
  return data
}

async function listarPorConversacion(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

module.exports = { crear, listarPorConversacion }
