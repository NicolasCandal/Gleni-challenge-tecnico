function dbRowToDto({ role, content, created_at }) {
  return { role, content, created_at }
}

module.exports = { dbRowToDto }
