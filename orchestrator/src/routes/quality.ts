import { Hono } from 'hono'
import { pbGetOne } from '../pocketbase'
import { runQualityGate } from '../media/quality'

export const qualityRoutes = new Hono()

// Run quality gate
qualityRoutes.post('/episodes/:id/quality-gate', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const report = await runQualityGate(episodeId)
    return c.json({
      message: report.passed ? 'Quality gate passed' : 'Quality gate failed',
      report,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Quality gate failed',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Get last quality gate report
qualityRoutes.get('/episodes/:id/quality-gate', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const episode = await pbGetOne('episodes', episodeId)
    const report = episode.metadata?.quality_gate || null
    return c.json({ report })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get quality report',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
