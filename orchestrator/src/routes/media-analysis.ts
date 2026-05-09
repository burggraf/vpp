import { Hono } from 'hono'
import { pbGetOne } from '../pocketbase'
import { analyzeEpisodeMedia, searchMediaForNeed } from '../media/analysis'
import { mediaRegistry } from '../media'

export const mediaAnalysisRoutes = new Hono()

// Analyze episode media needs
mediaAnalysisRoutes.post('/episodes/:id/media/analyze', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const episode = await pbGetOne('episodes', episodeId)
    if (!episode) {
      return c.json({ error: 'Episode not found' }, 404)
    }

    const result = await analyzeEpisodeMedia(episodeId)
    return c.json({
      message: 'Media analysis complete',
      analysis: result,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Media analysis failed',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Get existing media analysis for episode
mediaAnalysisRoutes.get('/episodes/:id/media/analysis', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const episode = await pbGetOne('episodes', episodeId)
    const analysis = episode.metadata?.media_analysis || null
    return c.json({ analysis })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get media analysis',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Search media sources for a specific need
mediaAnalysisRoutes.post('/episodes/:id/media/search-need', async (c) => {
  const body = await c.req.json()
  const { query, type, limit, sourceId } = body

  if (!query) {
    return c.json({ error: 'query is required' }, 400)
  }

  try {
    if (sourceId) {
      const source = mediaRegistry.get(sourceId)
      if (!source) {
        return c.json({ error: `Source ${sourceId} not found` }, 404)
      }
      if (!source.enabled) {
        return c.json({ error: `Source ${sourceId} is disabled` }, 400)
      }
      const results = await source.search(query, { type, limit })
      return c.json({ source: sourceId, results })
    }

    const results = await searchMediaForNeed(query, { type, limit })
    return c.json({
      results: Object.fromEntries(results),
      totalSources: results.size,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Search failed',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
