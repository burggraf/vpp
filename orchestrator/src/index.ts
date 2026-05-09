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
import { episodeRoutes } from './routes/episode'
import { templateRoutes } from './routes/templates'
import { mediaRoutes } from './routes/media'
import { mediaAnalysisRoutes } from './routes/media-analysis'
import { blockRoutes } from './routes/blocks'
import { qualityRoutes } from './routes/quality'
import { queueRoutes } from './routes/queue'
import { mediaRegistry, UnsplashSource, PexelsSource, PixabaySource, ScreenCaptureSource } from './media'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8090'],
  credentials: true,
}))

app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  pb_url: config.PB_URL,
  port: config.ORCHESTRATOR_PORT,
}))

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

app.route('/api', researchRoutes)
app.route('/api', personalityRoutes)
app.route('/api', scriptRoutes)
app.route('/api', ttsRoutes)
app.route('/api', episodeRoutes)
app.route('/api', templateRoutes)
app.route('/api', mediaRoutes)
app.route('/api', mediaAnalysisRoutes)
app.route('/api', blockRoutes)
app.route('/api', qualityRoutes)
app.route('/api', queueRoutes)

app.onError((err, c) => {
  console.error('❌ Unhandled error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : String(err),
  }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Register media sources
mediaRegistry.register(new UnsplashSource())
mediaRegistry.register(new PexelsSource())
mediaRegistry.register(new PixabaySource())
mediaRegistry.register(new ScreenCaptureSource())
console.log(`📸 Media sources registered: ${mediaRegistry.list().map(s => s.id).join(', ')}`)

console.log(`🚀 Orchestrator starting on port ${config.ORCHESTRATOR_PORT}...`)
Bun.serve({ port: config.ORCHESTRATOR_PORT, fetch: app.fetch })
