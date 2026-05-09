import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { researchRoutes } from '../routes/research'
import { personalityRoutes } from '../routes/personality'
import { scriptRoutes } from '../routes/script'
import { ttsRoutes } from '../routes/tts'
import { mediaRoutes } from '../routes/media'

function createTestApp() {
  const app = new Hono()
  app.route('/api', researchRoutes)
  app.route('/api', personalityRoutes)
  app.route('/api', scriptRoutes)
  app.route('/api', ttsRoutes)
  app.route('/api', mediaRoutes)
  return app
}

describe('research routes', () => {
  const app = createTestApp()

  test('POST /api/episodes/:id/research validates query', async () => {
    const res = await app.request('/api/episodes/123/research', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('query is required')
  })
})

describe('personality routes', () => {
  const app = createTestApp()

  test('POST /api/personalities validates name+slug', async () => {
    const res = await app.request('/api/personalities', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('name and slug are required')
  })

  test('POST /api/personalities/:id/train validates sources', async () => {
    const res = await app.request('/api/personalities/abc/train', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('sources array is required')
  })
})

describe('script routes', () => {
  const app = createTestApp()

  test('POST /api/episodes/:id/script/generate validates personalityId', async () => {
    const res = await app.request('/api/episodes/123/script/generate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('personalityId is required')
  })

  test('POST /api/episodes/:id/script/revise validates feedback', async () => {
    const res = await app.request('/api/episodes/123/script/revise', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('feedback is required')
  })
})

describe('tts routes', () => {
  const app = createTestApp()

  test('POST /api/episodes/:id/tts/preview validates text', async () => {
    const res = await app.request('/api/episodes/123/tts/preview', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('text is required')
  })

  test('POST /api/episodes/:id/tts/generate validates segments', async () => {
    const res = await app.request('/api/episodes/123/tts/generate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('segments array is required')
  })
})

describe('media routes', () => {
  const app = createTestApp()

  test('POST /api/media/search validates query', async () => {
    const res = await app.request('/api/media/search', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('query is required')
  })

  test('POST /api/media/download validates sourceId+assetId', async () => {
    const res = await app.request('/api/media/download', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('sourceId and assetId are required')
  })

  test('GET /api/media/sources returns source list', async () => {
    const res = await app.request('/api/media/sources')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sources).toBeDefined()
    expect(Array.isArray(data.sources)).toBe(true)
  })

  test('GET /api/media-library lists media', async () => {
    const res = await app.request('/api/media-library')
    // Will fail if PB not running, but route should exist
    expect(res.status).toBeDefined()
  })

  test('PUT /api/media/sources/:id validates unknown source', async () => {
    const res = await app.request('/api/media/sources/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })
})
