function createReportDTO({ conversationId, totalQueries, toolUsage, averageLatencyMs, queriedTypes, errors, totalExecutions }) {
  return { conversationId, totalQueries, toolUsage, averageLatencyMs, queriedTypes, errors, totalExecutions }
}

module.exports = { createReportDTO }
