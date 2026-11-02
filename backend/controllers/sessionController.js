const toolExecutionRepository = require('../repositories/toolExecutionRepository')
const messageRepository = require('../repositories/messageRepository')
const { createMessageDTO, createMessagesResponseDTO } = require('../dtos/MessageDTO')
const { createExecutionDTO, createExecutionsResponseDTO } = require('../dtos/ToolExecutionDTO')

async function getExecutions(req, res, next) {
  try {
    const { id } = req.params
    const rows = await toolExecutionRepository.listByConversation(id)
    const executions = rows.map(createExecutionDTO)
    res.json(createExecutionsResponseDTO(executions))
  } catch (err) {
    next(err)
  }
}

async function getMessages(req, res, next) {
  try {
    const { id } = req.params
    const rows = await messageRepository.listByConversation(id)
    const messages = rows.map(createMessageDTO)
    res.json(createMessagesResponseDTO(messages))
  } catch (err) {
    next(err)
  }
}

module.exports = { getExecutions, getMessages }
