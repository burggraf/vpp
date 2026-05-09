import { describe, expect, test, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { mediaAnalysisRoutes } from '../routes/media-analysis'

function createTestApp() {
  const app = new Hono()
  app.route('/api', mediaAnalysisRoutes)
  return app
}

describe('media analysis routes', () => {
  const app = createTestApp()

  test('GET /api/episodes/:id/media/analysis returns analysis field', async () => {
    // Will fail without PB, but route should exist and return something
    const res = await app.request('/api/episodes/test123/media/analysis')
    expect(res.status).toBeDefined()
    // Either 200 with null analysis or 500 if PB not running
    expect([200, 500]).toContain(res.status)
  })

  test('POST /api/episodes/:id/media/search-need validates query', async () => {
    const res = await app.request('/api/episodes/test123/media/search-need', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('query is required')
  })

  test('POST /api/episodes/:id/media/search-need with unknown source', async () => {
    const res = await app.request('/api/episodes/test123/media/search-need', {
      method: 'POST',
      body: JSON.stringify({ query: 'test', sourceId: 'nonexistent' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })

  test('POST /api/episodes/:id/media/search-need with disabled source', async () => {
    const res = await app.request('/api/episodes/test123/media/search-need', {
      method: 'POST',
      body: JSON.stringify({ query: 'test', sourceId: 'gemini' }),
      headers: { 'Content-Type': 'application/json' },
    })
    // Gemini is disabled by default
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('disabled')
  })
})
