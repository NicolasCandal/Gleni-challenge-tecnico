const { z } = require('zod')

const envSchema = z.object({
  SUPABASE_URL:       z.string().url({ message: 'debe ser una URL válida (ej: https://<ref>.supabase.co)' }),
  SUPABASE_ANON_KEY:  z.string().min(1, { message: 'no puede estar vacío' }),
  OPENAI_API_KEY:     z.string().min(1, { message: 'no puede estar vacío' }),
  OPENAI_MODEL:       z.string().default('gpt-4o-mini'),
  UMBRAL_SPREAD_ALTO: z.coerce.number().positive().default(2.5),
  UMBRAL_SPREAD_BAJO: z.coerce.number().positive().default(1.5),
  UMBRAL_BRECHA_ALTA: z.coerce.number().positive().default(8),
  UMBRAL_BRECHA_BAJA: z.coerce.number().positive().default(3),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues.map(
      issue => `  • ${issue.path.join('.')}: ${issue.message}`
    )
    console.error(
      '\n[Config] Variables de entorno inválidas o faltantes:\n' +
      issues.join('\n') +
      '\n\nRevisá el archivo .env.example para ver los valores requeridos.\n'
    )
    process.exit(1)
  }

  return result.data
}

module.exports = { validateEnv }
