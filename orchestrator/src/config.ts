import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PB_URL: z.string().url().default('http://127.0.0.1:8090'),
  PB_ADMIN_EMAIL: z.string().default('admin@vpp.local'),
  PB_ADMIN_PASSWORD: z.string().default('changeme'),
  ORCHESTRATOR_PORT: z.coerce.number().default(3001),
  HYPERFRAMES_PORT: z.coerce.number().default(4000),
  COMPOSITIONS_DIR: z.string().default('../compositions'),
  RENDERS_DIR: z.string().default('../renders'),
  PI_MODEL: z.string().optional(),
  PI_PROVIDER: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
