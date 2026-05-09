import { Hono } from 'hono'
import { pbList, pbGetOne, pbCreate, pbUpdate, pbDelete } from '../pocketbase'
import { mediaRegistry } from '../media'

export const mediaRoutes = new Hono()

// List media library items
mediaRoutes.get('/media-library', async (c) => {
  try {
    const { filter, sort, page, perPage } = c.req.query()
    const result = await pbList('media_library', {
      filter,
      sort: sort || '-created',
      page: page ? parseInt(page) : 1,
      perPage: perPage ? parseInt(perPage) : 50,
    })
    return c.json(result)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list media',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Get single media item
mediaRoutes.get('/media-library/:id', async (c) => {
  try {
    const result = await pbGetOne('media_library', c.req.param('id'))
    return c.json(result)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get media',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Search external media sources
mediaRoutes.post('/media/search', async (c) => {
  const body = await c.req.json()
  const { query, type, limit, sourceId } = body

  if (!query) {
    return c.json({ error: 'query is required' }, 400)
  }

  try {
    if (sourceId) {
      // Search specific source
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

    // Search all enabled sources
    const results = await mediaRegistry.searchAll(query, { type, limit })
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

// Download asset from external source to local storage
mediaRoutes.post('/media/download', async (c) => {
  const body = await c.req.json()
  const { sourceId, assetId, name, mediaType, category, tags, license } = body

  if (!sourceId || !assetId) {
    return c.json({ error: 'sourceId and assetId are required' }, 400)
  }

  try {
    const source = mediaRegistry.get(sourceId)
    if (!source) {
      return c.json({ error: `Source ${sourceId} not found` }, 404)
    }

    const path = `./media/downloads/${Date.now()}_${assetId}`
    const localPath = await source.download(assetId, path)

    // Create media_library record
    const record = await pbCreate('media_library', {
      name: name || assetId,
      slug: (name || assetId).toLowerCase().replace(/[^\w-]+/g, '-'),
      media_type: mediaType || 'image',
      category: category || '',
      tags: JSON.stringify(tags || []),
      file_url: assetId,
      license: license || '',
      usage_count: 0,
    })

    return c.json({
      message: 'Asset downloaded',
      localPath,
      record,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Download failed',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// List available media sources
mediaRoutes.get('/media/sources', async (c) => {
  const sources = mediaRegistry.list().map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    enabled: s.enabled,
  }))
  return c.json({ sources })
})

// Update source config (enable/disable)
mediaRoutes.put('/media/sources/:id', async (c) => {
  const sourceId = c.req.param('id')
  const body = await c.req.json()
  const { enabled } = body

  const source = mediaRegistry.get(sourceId)
  if (!source) {
    return c.json({ error: `Source ${sourceId} not found` }, 404)
  }

  source.enabled = !!enabled

  // Update config
  const config = mediaRegistry.getConfig()
  const srcConfig = config.sources.find((s) => s.id === sourceId)
  if (srcConfig) {
    srcConfig.enabled = !!enabled
  }
  mediaRegistry.setConfig(config)

  return c.json({ id: sourceId, enabled: source.enabled })
})

// Delete media item
mediaRoutes.delete('/media-library/:id', async (c) => {
  try {
    const item = await pbGetOne('media_library', c.req.param('id'))
    if (item.usage_count > 0) {
      return c.json({
        error: 'Cannot delete: asset is in use',
        usage_count: item.usage_count,
      }, 400)
    }
    await pbDelete('media_library', c.req.param('id'))
    return c.json({ message: 'Deleted' })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to delete media',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// Update media item
mediaRoutes.put('/media-library/:id', async (c) => {
  try {
    const body = await c.req.json()
    const updated = await pbUpdate('media_library', c.req.param('id'), body)
    return c.json(updated)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to update media',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
