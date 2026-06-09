const UMBRALES = {
  SPREAD_ALTO: Number(process.env.UMBRAL_SPREAD_ALTO) || 2.5,
  SPREAD_BAJO: Number(process.env.UMBRAL_SPREAD_BAJO) || 1.5,
  BRECHA_ALTA: Number(process.env.UMBRAL_BRECHA_ALTA) || 8,
  BRECHA_BAJA: Number(process.env.UMBRAL_BRECHA_BAJA) || 3,
}

if (UMBRALES.SPREAD_BAJO >= UMBRALES.SPREAD_ALTO) {
  throw new Error(`Configuración inválida: UMBRAL_SPREAD_BAJO (${UMBRALES.SPREAD_BAJO}) debe ser menor que UMBRAL_SPREAD_ALTO (${UMBRALES.SPREAD_ALTO})`)
}
if (UMBRALES.BRECHA_BAJA >= UMBRALES.BRECHA_ALTA) {
  throw new Error(`Configuración inválida: UMBRAL_BRECHA_BAJA (${UMBRALES.BRECHA_BAJA}) debe ser menor que UMBRAL_BRECHA_ALTA (${UMBRALES.BRECHA_ALTA})`)
}

module.exports = UMBRALES
