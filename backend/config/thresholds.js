const { getThresholdSettings } = require('./thresholdSettings')
const settings = getThresholdSettings()

const THRESHOLDS = {
  HIGH_SPREAD: Number(settings.HIGH_SPREAD_THRESHOLD) || 2.5,
  LOW_SPREAD: Number(settings.LOW_SPREAD_THRESHOLD) || 1.5,
  HIGH_GAP: Number(settings.HIGH_GAP_THRESHOLD) || 8,
  LOW_GAP: Number(settings.LOW_GAP_THRESHOLD) || 3,
}

if (THRESHOLDS.LOW_SPREAD >= THRESHOLDS.HIGH_SPREAD) {
  throw new Error(`Invalid configuration: LOW_SPREAD_THRESHOLD (${THRESHOLDS.LOW_SPREAD}) must be less than HIGH_SPREAD_THRESHOLD (${THRESHOLDS.HIGH_SPREAD})`)
}
if (THRESHOLDS.LOW_GAP >= THRESHOLDS.HIGH_GAP) {
  throw new Error(`Invalid configuration: LOW_GAP_THRESHOLD (${THRESHOLDS.LOW_GAP}) must be less than HIGH_GAP_THRESHOLD (${THRESHOLDS.HIGH_GAP})`)
}

module.exports = THRESHOLDS
