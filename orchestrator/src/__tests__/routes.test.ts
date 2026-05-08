import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { researchRoutes } from '../routes/research'
import { personalityRoutes } from '../routes/personality'
import { scriptRoutes } from '../routes/script'
import { ttsRoutes } from '../routes/tts'

function createTestApp() {
  const app = new Hono()
  app.route('/api', researchRoutes)
  app.route('/api', personalityRoutes)
  app.route('/api', scriptRoutes)
  app.route('/api', ttsRoutes)
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
