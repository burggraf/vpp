import { Hono } from 'hono'
import { pbCreate, pbUpdate, pbList, pbGetOne, pbDelete } from '../pocketbase'

export const templateRoutes = new Hono()

/**
 * Save an episode as a template.
 * POST /api/templates/save
 * Body: { episodeId, name, description? }
 */
templateRoutes.post('/templates/save', async (c) => {
  const body = await c.req.json()
  const { episodeId, name, description } = body

  if (!episodeId || !name) {
    return c.json({ error: 'episodeId and name are required' }, 400)
  }

  try {
    // Fetch episode
    const episode = await pbGetOne('episodes', episodeId)

    // Fetch blocks for this episode
    const blocksResult = await pbList('blocks', {
      filter: `episode="${episodeId}"`,
      sort: 'order',
    })

    // Build block structure from blocks
    const blockStructure = (blocksResult.items || []).map((b: {
      block_type: string; order: number; duration: number;
      composition_src: string; variables: Record<string, unknown>;
    }) => ({
      block_type: b.block_type,
      order: b.order,
      duration: b.duration,
      composition_src: b.composition_src,
      variables: b.variables || {},
    }))

    // Get composition files list
    const compositionFiles = (blocksResult.items || [])
      .map((b: { composition_src: string }) => b.composition_src)
      .filter(Boolean)

    // Get channel info
    const channel = await pbGetOne('channels', episode.channel)

    // Create slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const template = await pbCreate('episode_templates', {
      name,
      slug,
      channel: episode.channel,
      source_episode: episodeId,
      description: description || `Template based on "${episode.title}"`,
      block_structure: blockStructure,
      composition_files: compositionFiles,
      default_personality: null,
      default_research_depth: channel.style_dna?.research_depth || { queries: 5, timeframe: '1 week' },
      default_duration: episode.total_duration || 60,
      variables: {},
      usage_count: 0,
      status: 'active',
    })

    return c.json({ template }, 201)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to save template',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * Create a new episode from a template.
 * POST /api/templates/:id/use
 * Body: { topic, title? }
 */
templateRoutes.post('/templates/:id/use', async (c) => {
  const templateId = c.req.param('id')
  const body = await c.req.json()
  const { topic, title } = body

  if (!topic) {
    return c.json({ error: 'topic is required' }, 400)
  }

  try {
    // Fetch template
    const template = await pbGetOne('episode_templates', templateId)

    // Create episode
    const episodeTitle = title || `${template.name}: ${topic.slice(0, 60)}`
    const episodeSlug = episodeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const episode = await pbCreate('episodes', {
      channel: template.channel,
      title: episodeTitle,
      slug: episodeSlug,
      topic,
      status: 'draft',
      template: templateId,
      feedback_log: [],
      metadata: { created_from_template: templateId },
    })

    // Pre-create blocks from template structure
    if (template.block_structure?.length > 0) {
      for (const blockDef of template.block_structure) {
        await pbCreate('blocks', {
          episode: episode.id,
          block_type: blockDef.block_type,
          order: blockDef.order,
          script: '',
          composition_src: blockDef.composition_src || '',
          duration: blockDef.duration || 10,
          track_index: 0,
          variables: blockDef.variables || {},
          assets: [],
          status: 'pending',
        })
      }
    }

    // Update template usage count
    await pbUpdate('episode_templates', templateId, {
      usage_count: (template.usage_count || 0) + 1,
    })

    // Update channel episode count
    await pbUpdate('channels', template.channel, {
      episode_count: ((await pbGetOne('channels', template.channel)).episode_count || 0) + 1,
    })

    return c.json({ episode }, 201)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to create episode from template',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * Delete a template.
 * DELETE /api/templates/:id
 */
templateRoutes.delete('/templates/:id', async (c) => {
  const id = c.req.param('id')

  try {
    await pbDelete('episode_templates', id)
    return c.json({ message: 'Template deleted' })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to delete template',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
