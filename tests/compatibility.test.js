jest.mock('../backend/infrastructure/supabaseClient', () => ({ from: jest.fn() }))

const supabase = require('../backend/infrastructure/supabaseClient')
const conversations = require('../backend/repositories/conversationRepository')
const executions = require('../backend/repositories/toolExecutionRepository')
const { getThresholdSettings } = require('../backend/config/thresholdSettings')

let query
beforeEach(() => {
  query = Object.fromEntries(['select', 'in', 'eq', 'neq', 'update'].map(name => [name, jest.fn().mockReturnThis()]))
  query.order = jest.fn().mockResolvedValue({ data: [], error: null })
  supabase.from.mockReturnValue(query)
})

test('reads the existing database title column through an English alias', async () => {
  await expect(conversations.list(['existing-id'])).resolves.toEqual([])
  expect(query.select).toHaveBeenCalledWith('id, title:titulo, created_at')
})

test('writes English titles to the existing database column', async () => {
  query.eq.mockResolvedValue({ error: null })
  await conversations.updateTitle('existing-id', 'Dollar comparison')
  expect(query.update).toHaveBeenCalledWith({ titulo: 'Dollar comparison' })
  expect(query.eq).toHaveBeenCalledWith('id', 'existing-id')
})

test('excludes current and historical token records from tool execution history', async () => {
  await executions.listByConversation('existing-id')
  expect(query.neq).toHaveBeenCalledWith('tool_name', '_turn')
  expect(query.neq).toHaveBeenCalledWith('tool_name', '_turno')
})

test('accepts legacy thresholds and gives English settings precedence', () => {
  expect(getThresholdSettings({
    UMBRAL_SPREAD_ALTO: '4', UMBRAL_SPREAD_BAJO: '1', UMBRAL_BRECHA_ALTA: '9', UMBRAL_BRECHA_BAJA: '2', HIGH_SPREAD_THRESHOLD: '5',
  })).toEqual({ HIGH_SPREAD_THRESHOLD: '5', LOW_SPREAD_THRESHOLD: '1', HIGH_GAP_THRESHOLD: '9', LOW_GAP_THRESHOLD: '2' })
})
