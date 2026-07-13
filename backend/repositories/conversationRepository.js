const supabase = require('../infrastructure/supabaseClient')

async function crear() {
  const { data, error } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single()

  if (error) throw error
  return data
}

async function listar(ids) {
  if (!ids || ids.length === 0) return []

  const { data, error } = await supabase
    .from('conversations')
    .select('id, titulo, created_at')
    .in('id', ids)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

async function actualizarTitulo(id, titulo) {
  const { error } = await supabase
    .from('conversations')
    .update({ titulo })
    .eq('id', id)

  if (error) throw error
}

module.exports = { crear, listar, actualizarTitulo }
