function createMessageDTO({ id, role, content, created_at, feedback = null }) {
  return { id, role, content, createdAt: created_at, feedback }
}

// Map the feedback row to its public representation,
// excluding internal columns such as id and created_at.
function createFeedbackDTO({ message_id, feedback }) {
  return { messageId: message_id, feedback }
}

function createMessagesResponseDTO(messages) {
  return { messages }
}

function createFeedbackResponseDTO(feedback) {
  return { feedback: createFeedbackDTO(feedback) }
}

module.exports = { createMessageDTO, createFeedbackDTO, createMessagesResponseDTO, createFeedbackResponseDTO }
