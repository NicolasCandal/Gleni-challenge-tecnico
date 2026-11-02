// Legacy environment names remain supported for existing deployments.
const LEGACY_NAMES = {
  HIGH_SPREAD_THRESHOLD: 'UMBRAL_SPREAD_ALTO',
  LOW_SPREAD_THRESHOLD: 'UMBRAL_SPREAD_BAJO',
  HIGH_GAP_THRESHOLD: 'UMBRAL_BRECHA_ALTA',
  LOW_GAP_THRESHOLD: 'UMBRAL_BRECHA_BAJA',
}

function getThresholdSettings(env = process.env) {
  return Object.fromEntries(Object.entries(LEGACY_NAMES).map(([name, legacyName]) => [
    name, env[name] ?? env[legacyName],
  ]))
}

module.exports = { getThresholdSettings }
