const supabase = require('../infrastructure/supabaseClient')

async function upsert({ messageId, feedback }) {
  const { data, error } = await supabase
    .from('feedback')
    .upsert(
      { message_id: messageId, feedback },
      { onConflict: 'message_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

async function listByMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return {}

  const { data, error } = await supabase
    .from('feedback')
    .select('message_id, feedback')
    .in('message_id', messageIds)

  if (error) throw error

  return (data ?? []).reduce((accumulated, row) => {
    accumulated[row.message_id] = row.feedback
    return accumulated
  }, {})
}

module.exports = { upsert, listByMessages }