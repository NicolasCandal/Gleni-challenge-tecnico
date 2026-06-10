const supabase = require('../infrastructure/supabaseClient')

async function crear({ idConversacion, rol, contenido }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: idConversacion, role: rol, content: contenido })
    .select()
    .single()

  if (error) throw error
  return data
}

async function listarPorConversacion(idConversacion) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', idConversacion)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

module.exports = { crear, listarPorConversacion }
