import { Hono } from 'hono'
import { pbGetOne, pbUpdate } from '../pocketbase'
import { generateBlocks } from '../media/block-gen'

export const blockRoutes = new Hono()

// Generate blocks for episode
blockRoutes.post('/episodes/:id/blocks/generate', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const episode = await pbGetOne('episodes', episodeId)
    if (!episode) {
      return c.json({ error: 'Episode not found' }, 404)
    }

    // Check script is approved
    if (episode.status === 'draft' || episode.status === 'failed') {
      return c.json({ error: 'Episode must have approved script before block generation' }, 400)
    }

    const result = await generateBlocks(episodeId)

    await pbUpdate('episodes', episodeId, {
      status: 'generating',
      composition_path: result.compositionPath,
      block_count: result.blocks.length,
      total_duration: result.blocks.reduce((sum, b) => sum + b.duration, 0),
    })

    return c.json({
      message: 'Blocks generated',
      blocks: result.blocks,
      compositionPath: result.compositionPath,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Block generation failed',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
