import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { config } from './config'
import { authAdmin } from './pocketbase'
import './agent' // Initialize agent module

// Route modules (import after they exist)
import { researchRoutes } from './routes/research'
import { personalityRoutes } from './routes/personality'
import { scriptRoutes } from './routes/script'
import { ttsRoutes } from './routes/tts'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  pb_url: config.PB_URL,
  port: config.ORCHESTRATOR_PORT,
}))

// Test PB connection
app.get('/health/pb', async (c) => {
  try {
    const pb = await authAdmin()
    const collections = await pb.collections.getFullList()
    return c.json({
      status: 'connected',
      collections: collections.length,
      collection_names: collections.map((col: { name: string }) => col.name),
    })
  } catch (err: unknown) {
    return c.json({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Mount route modules
app.route('/api', researchRoutes)
app.route('/api', personalityRoutes)
app.route('/api', scriptRoutes)
app.route('/api', ttsRoutes)

// Error handler
app.onError((err, c) => {
  console.error('❌ Unhandled error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : String(err),
  }, 500)
})

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Start server
console.log(`🚀 Orchestrator starting on port ${config.ORCHESTRATOR_PORT}...`)
Bun.serve({ port: config.ORCHESTRATOR_PORT, fetch: app.fetch })
