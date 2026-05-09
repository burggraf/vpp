/**
 * Preview API routes — start/stop HyperFrames preview server per episode.
 */
import { Hono } from 'hono'
import * as path from 'path'
import { startPreview, stopPreview, getActivePreview, isPreviewActive } from '../preview'
import { pbGetOne, pbUpdate } from '../pocketbase'
import { config } from '../config'

export const previewRoutes = new Hono()

/**
 * POST /api/episodes/:id/preview/start
 * Start preview server for episode.
 */
previewRoutes.post('/episodes/:id/preview/start', async (c) => {
  const episodeId = c.req.param('id')

  try {
    const episode = await pbGetOne('episodes', episodeId)

    // Quality gate must have passed
    const qualityReport = (episode.metadata as Record<string, unknown>)?.qualityGate as Record<string, unknown> | undefined
    const hasBlocks = (episode.block_count || 0) > 0

    if (!hasBlocks) {
      return c.json({ error: 'Episode has no blocks. Generate blocks first.' }, 400)
    }

    // Determine episode composition directory using config
    const channel = await pbGetOne('channels', episode.channel)
    const episodeDir = path.join(config.COMPOSITIONS_DIR, channel.slug, episodeId)

    // Check if already running for this episode
    if (isPreviewActive(episodeId)) {
      return c.json({
        message: 'Preview already running',
        url: `http://localhost:${config.HYPERFRAMES_PORT}`,
        port: config.HYPERFRAMES_PORT,
      })
    }

    const { url, port } = await startPreview(episodeId, episodeDir)

    // Fire-and-forget status update — don't block the response
    pbUpdate('episodes', episodeId, {
      status: 'preview',
      preview_url: url,
    }).catch((err) => console.error('[preview] Failed to update episode status:', err))

    return c.json({
      message: 'Preview started',
      url,
      port,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to start preview',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * DELETE /api/episodes/:id/preview
 * Stop preview server for episode.
 */
previewRoutes.delete('/episodes/:id/preview', async (c) => {
  const episodeId = c.req.param('id')

  try {
    await stopPreview(episodeId)

    return c.json({ message: 'Preview stopped' })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to stop preview',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * GET /api/preview/status
 * Get current preview server status.
 */
previewRoutes.get('/preview/status', async (c) => {
  const active = getActivePreview()

  return c.json({
    active: !!active,
    episodeId: active?.episodeId || null,
    url: active?.url || null,
    port: active?.port || null,
  })
})
