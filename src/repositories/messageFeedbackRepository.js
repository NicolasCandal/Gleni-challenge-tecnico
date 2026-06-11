const supabase = require('../infrastructure/supabaseClient')

async function crearOActualizar({ idMensaje, feedback }) {
  const { data, error } = await supabase
    .from('feedback')
    .upsert(
      { message_id: idMensaje, feedback },
      { onConflict: 'message_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

async function listarPorMensajes(idsMensajes) {
  if (!idsMensajes || idsMensajes.length === 0) return {}

  const { data, error } = await supabase
    .from('feedback')
    .select('message_id, feedback')
    .in('message_id', idsMensajes)

  if (error) throw error

  return (data ?? []).reduce((acumulado, fila) => {
    acumulado[fila.message_id] = fila.feedback
    return acumulado
  }, {})
}

module.exports = { crearOActualizar, listarPorMensajes }