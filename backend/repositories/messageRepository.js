const supabase = require('../infrastructure/supabaseClient')
const repositorioFeedback = require('./messageFeedbackRepository')

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
  const { data: mensajes, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', idConversacion)
    .order('created_at', { ascending: true })

  if (error) throw error

  const idsMensajes = (mensajes ?? []).map(m => m.id)
  let feedbackPorMensaje = {}
  try {
    feedbackPorMensaje = await repositorioFeedback.listarPorMensajes(idsMensajes)
  } catch (errFeedback) {
    console.error('Error al obtener feedback de mensajes:', errFeedback.message)
  }

  return (mensajes ?? []).map(mensaje => ({
    ...mensaje,
    feedback: feedbackPorMensaje[mensaje.id] ?? null
  }))
}

module.exports = { crear, listarPorConversacion }
