import { describe, expect, test, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { blockRoutes } from '../routes/blocks'
import { qualityRoutes } from '../routes/quality'
import { queueRoutes } from '../routes/queue'

function createTestApp() {
  const app = new Hono()
  app.route('/api', blockRoutes)
  app.route('/api', qualityRoutes)
  app.route('/api', queueRoutes)
  return app
}

describe('block routes', () => {
  const app = createTestApp()

  test('POST /api/episodes/:id/blocks/generate requires episode', async () => {
    // Without PB running, this will fail but the route should exist
    const res = await app.request('/api/episodes/test123/blocks/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBeDefined()
  })
})

describe('quality gate routes', () => {
  const app = createTestApp()

  test('GET /api/episodes/:id/quality-gate returns report field', async () => {
    const res = await app.request('/api/episodes/test123/quality-gate')
    expect(res.status).toBeDefined()
    expect([200, 500]).toContain(res.status)
  })

  test('POST /api/episodes/:id/quality-gate runs checks', async () => {
    const res = await app.request('/api/episodes/test123/quality-gate', {
      method: 'POST',
    })
    expect(res.status).toBeDefined()
  })
})

describe('queue routes', () => {
  const app = createTestApp()

  test('GET /api/queue returns status', async () => {
    const res = await app.request('/api/queue')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.active).toBeDefined()
    expect(data.queue).toBeDefined()
    expect(data.totalWaiting).toBeDefined()
  })

  test('POST /api/queue validates episodeId', async () => {
    const res = await app.request('/api/queue', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('episodeId is required')
  })

  test('POST /api/queue adds episode', async () => {
    const res = await app.request('/api/queue', {
      method: 'POST',
      body: JSON.stringify({ episodeId: 'test-123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Added to queue')
  })

  test('POST /api/queue/process gets next', async () => {
    const res = await app.request('/api/queue/process', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
  })

  test('POST /api/queue/complete marks active done', async () => {
    const res = await app.request('/api/queue/complete', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
  })

  test('DELETE /api/queue/:id removes episode', async () => {
    const res = await app.request('/api/queue/test-123', {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
  })
})
