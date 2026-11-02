const fs = require('fs')
const path = require('path')
const ts = require('../client/node_modules/typescript')

// Compile the actual browser storage module without loading React or a browser.
const source = fs.readFileSync(path.join(__dirname, '../client/src/services/conversationStorage.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const storageModule = { exports: {} }
new Function('exports', 'module', compiled)(storageModule.exports, storageModule)
const { loadConversations, saveConversationsToStorage, loadRateLimit, RATE_LIMIT_KEY } = storageModule.exports

beforeEach(() => {
  const data = new Map()
  global.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  }
})
afterAll(() => { delete global.localStorage })

test('migrates legacy metadata while preserving conversation IDs and user text', () => {
  localStorage.setItem('asesor_conversaciones', JSON.stringify([{ id: 'existing-id', titulo: 'Original title', creadoEn: '2026-01-01' }]))
  expect(loadConversations()).toEqual([{ id: 'existing-id', title: 'Original title', createdAt: '2026-01-01' }])
  expect(localStorage.getItem('asesor_conversaciones')).toBeNull()
  expect(loadConversations()).toEqual([{ id: 'existing-id', title: 'Original title', createdAt: '2026-01-01' }])
})

test('migrates the original single-conversation key', () => {
  localStorage.setItem('asesor_conversation_id', 'original-id')
  expect(loadConversations()).toEqual([expect.objectContaining({ id: 'original-id', title: null })])
  expect(localStorage.getItem('asesor_conversation_id')).toBeNull()
})

test('reads English metadata and tolerates invalid stored JSON', () => {
  const conversations = [{ id: 'id', title: 'Dollar rates', createdAt: '2026-01-01' }]
  saveConversationsToStorage(conversations)
  expect(loadConversations()).toEqual(conversations)
  localStorage.setItem('exchange_advisor_conversations', '{invalid')
  expect(loadConversations()).toEqual([])
})

test('preserves an active legacy cooldown and ignores expired cooldowns', () => {
  const timestamp = Date.now() - 1000
  localStorage.setItem('asesor_rate_limited_at', timestamp)
  expect(loadRateLimit()).toBe(timestamp)
  expect(loadRateLimit()).toBe(timestamp)
  expect(localStorage.getItem('asesor_rate_limited_at')).toBeNull()
  localStorage.setItem(RATE_LIMIT_KEY, Date.now() - 61_000)
  expect(loadRateLimit()).toBeNull()
})
