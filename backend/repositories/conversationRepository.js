const supabase = require('../infrastructure/supabaseClient')

async function create() {
  const { data, error } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single()

  if (error) throw error
  return data
}

async function list(ids) {
  if (!ids || ids.length === 0) return []

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title:titulo, created_at')
    .in('id', ids)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

async function updateTitle(id, title) {
  const { error } = await supabase
    .from('conversations')
    .update({ titulo: title })
    .eq('id', id)

  if (error) throw error
}



async function remove(id) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

module.exports = { create, list, updateTitle, remove }
