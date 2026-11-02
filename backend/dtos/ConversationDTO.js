function createConversationDTO(row) {
  return {
    id: row.id,
    title: row.title ?? null,
    createdAt: row.created_at,
  }
}

function createConversationsResponseDTO(conversations) {
  return { conversations }
}

module.exports = { createConversationDTO, createConversationsResponseDTO }
