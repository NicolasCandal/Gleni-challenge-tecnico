const supabase = require('../infrastructure/supabaseClient')
const feedbackRepository = require('./messageFeedbackRepository')

async function create({ conversationId, role, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: role, content: content })
    .select()
    .single()

  if (error) throw error
  return data
}

async function listByConversation(conversationId) {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const messageIds = (messages ?? []).map(m => m.id)
  let feedbackByMessage = {}
  try {
    feedbackByMessage = await feedbackRepository.listByMessages(messageIds)
  } catch (feedbackError) {
    console.error('Could not load message feedback:', feedbackError.message)
  }

  return (messages ?? []).map(message => ({
    ...message,
    feedback: feedbackByMessage[message.id] ?? null
  }))
}

module.exports = { create, listByConversation }
