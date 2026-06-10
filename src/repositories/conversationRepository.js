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

async function buscarPorId(id) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

module.exports = { crear, buscarPorId }
