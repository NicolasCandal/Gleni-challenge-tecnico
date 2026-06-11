function filaDBADto({ id, role, content, created_at, feedback = null }) {
  return { id, role, content, created_at, feedback }
}

module.exports = { filaDBADto }
