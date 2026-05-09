import { Hono } from 'hono'
import { pbCreate, pbUpdate, pbList, pbGetOne, pbDelete } from '../pocketbase'
import { config } from '../config'
import * as fs from 'fs'
import * as path from 'path'

export const templateRoutes = new Hono()

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return
  ensureDir(dest)
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry)
    const destPath = path.join(dest, entry)
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * POST /api/templates/save
 * Save an episode as a template, copying composition files.
 */
templateRoutes.post('/templates/save', async (c) => {
  const body = await c.req.json()
  const { episodeId, name, description } = body

  if (!episodeId || !name) {
    return c.json({ error: 'episodeId and name are required' }, 400)
  }

  try {
    const episode = await pbGetOne('episodes', episodeId)
    const blocksResult = await pbList('blocks', {
      filter: `episode="${episodeId}"`,
      sort: 'order',
    })

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

    const compositionFiles = (blocksResult.items || [])
      .map((b: { composition_src: string }) => b.composition_src)
      .filter(Boolean)

    const channel = await pbGetOne('channels', episode.channel)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Copy composition files to template directory
    const episodeDir = path.join(config.COMPOSITIONS_DIR, channel.slug, episodeId)
    const templateDir = path.join(config.COMPOSITIONS_DIR, '_templates', slug)

    if (fs.existsSync(episodeDir)) {
      ensureDir(templateDir)
      copyDirRecursive(episodeDir, templateDir)
    }

    // Get script personality info for default_personality
    let defaultPersonality = null
    try {
      const scriptsResult = await pbList('scripts', { filter: `episode="${episodeId}"` })
      if (scriptsResult.items?.length > 0) {
        defaultPersonality = scriptsResult.items[0].personality || null
      }
    } catch { /* ignore */ }

    const template = await pbCreate('episode_templates', {
      name,
      slug,
      channel: episode.channel,
      source_episode: episodeId,
      description: description || `Template based on "${episode.title}"`,
      block_structure: blockStructure,
      composition_files: compositionFiles,
      default_personality: defaultPersonality,
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
 * POST /api/templates/:id/use
 * Create a new episode from a template, copying composition files.
 */
templateRoutes.post('/templates/:id/use', async (c) => {
  const templateId = c.req.param('id')
  const body = await c.req.json()
  const { topic, title } = body

  if (!topic) {
    return c.json({ error: 'topic is required' }, 400)
  }

  try {
    const template = await pbGetOne('episode_templates', templateId)
    const channel = await pbGetOne('channels', template.channel)

    const episodeTitle = title || `${template.name}: ${topic.slice(0, 60)}`
    const episodeSlug = episodeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const episode = await pbCreate('episodes', {
      channel: template.channel,
      title: episodeTitle,
      slug: episodeSlug,
      topic,
      status: 'draft',
      feedback_log: [],
      metadata: { created_from_template: templateId },
    })

    // Copy template composition files to episode directory
    const templateDir = path.join(config.COMPOSITIONS_DIR, '_templates', template.slug)
    const episodeDir = path.join(config.COMPOSITIONS_DIR, channel.slug, episode.id)

    if (fs.existsSync(templateDir)) {
      ensureDir(episodeDir)
      copyDirRecursive(templateDir, episodeDir)

      // Update composition_src paths in blocks to point to episode directory
      await pbUpdate('episodes', episode.id, {
        composition_path: episodeDir,
      })
    }

    // Create blocks from template structure
    if (template.block_structure?.length > 0) {
      for (const blockDef of template.block_structure) {
        // Remap composition_src from template to episode paths
        let compositionSrc = blockDef.composition_src || ''
        if (compositionSrc) {
          const fileName = path.basename(compositionSrc)
          compositionSrc = `compositions/${fileName}`
        }

        await pbCreate('blocks', {
          episode: episode.id,
          block_type: blockDef.block_type,
          order: blockDef.order,
          script: '',
          composition_src: compositionSrc,
          duration: blockDef.duration || 10,
          track_index: 0,
          variables: blockDef.variables || {},
          assets: [],
          status: 'pending',
        })
      }
    }

    await pbUpdate('episode_templates', templateId, {
      usage_count: (template.usage_count || 0) + 1,
    })

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
 * DELETE /api/templates/:id
 */
templateRoutes.delete('/templates/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const template = await pbGetOne('episode_templates', id)

    // Remove template directory
    const templateDir = path.join(config.COMPOSITIONS_DIR, '_templates', template.slug)
    if (fs.existsSync(templateDir)) {
      fs.rmSync(templateDir, { recursive: true, force: true })
    }

    await pbDelete('episode_templates', id)
    return c.json({ message: 'Template deleted' })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to delete template',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * GET /api/templates
 * List all templates.
 */
templateRoutes.get('/templates', async (c) => {
  try {
    const result = await pbList('episode_templates', { sort: '-usage_count' })
    return c.json({ templates: result.items || [] })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list templates',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * GET /api/templates/channel/:channelId
 * List templates for a specific channel.
 */
templateRoutes.get('/templates/channel/:channelId', async (c) => {
  const channelId = c.req.param('channelId')
  try {
    const result = await pbList('episode_templates', {
      filter: `channel="${channelId}"`,
      sort: '-usage_count',
    })
    return c.json({ templates: result.items || [] })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list templates',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
