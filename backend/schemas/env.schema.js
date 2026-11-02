const { z } = require('zod')
const { getThresholdSettings } = require('../config/thresholdSettings')

const envSchema = z.object({
  SUPABASE_URL:       z.string().url({ message: 'must be a valid URL (e.g. https://<ref>.supabase.co)' }),
  SUPABASE_ANON_KEY:  z.string().min(1, { message: 'cannot be empty' }),
  OPENAI_API_KEY:     z.string().min(1, { message: 'cannot be empty' }),
  OPENAI_MODEL:       z.string().default('gpt-4o-mini'),
  CORS_ORIGIN:        z.string().url({ message: 'must be a valid URL (e.g. http://localhost:5173)' }).optional(),
  HIGH_SPREAD_THRESHOLD: z.coerce.number().positive().default(2.5),
  LOW_SPREAD_THRESHOLD: z.coerce.number().positive().default(1.5),
  HIGH_GAP_THRESHOLD: z.coerce.number().positive().default(8),
  LOW_GAP_THRESHOLD: z.coerce.number().positive().default(3),
})

function validateEnv() {
  const result = envSchema.safeParse({ ...process.env, ...getThresholdSettings() })

  if (!result.success) {
    const issues = result.error.issues.map(
      issue => `  • ${issue.path.join('.')}: ${issue.message}`
    )
    console.error(
      '\n[Config] Missing or invalid environment variables:\n' +
      issues.join('\n') +
      '\n\nSee .env.example for the required settings.\n'
    )
    process.exit(1)
  }

  return result.data
}

module.exports = { validateEnv }
