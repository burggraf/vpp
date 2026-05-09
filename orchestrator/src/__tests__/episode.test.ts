import { describe, it, expect, vi, beforeEach } from 'vitest'
import { episodeRoutes } from '../routes/episode'
import * as pocketbase from '../pocketbase'

vi.mock('../pocketbase', () => ({
  pbCreate: vi.fn(),
  pbUpdate: vi.fn(),
  pbList: vi.fn(),
  pbGetOne: vi.fn(),
}))

vi.mock('../agent', () => ({
  createBaseAgentSession: vi.fn(),
  collectResponseWithEvents: vi.fn(),
}))

const mockChannel = {
  id: 'ch1',
  slug: 'dev-channel',
  name: 'Dev Channel',
  style_dna: {
    primary_font: 'Inter',
    secondary_font: 'JetBrains Mono',
    color_palette: ['#1a1a2e', '#e94560'],
    resolution: '1920x1080',
    intro_duration: 3,
    outro_duration: 5,
  },
  system_prompt: 'Test channel system prompt',
}

describe('episodeRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(pocketbase.pbGetOne).mockResolvedValue(mockChannel as any)
    vi.mocked(pocketbase.pbCreate).mockResolvedValue({ id: 'new_id' } as any)
    vi.mocked(pocketbase.pbUpdate).mockResolvedValue({} as any)
    vi.mocked(pocketbase.pbList).mockResolvedValue({ items: [] } as any)
  })

  it('returns 400 when topic is missing', async () => {
    const req = new Request('http://localhost/api/episodes/ep1/generate')
    const res = await episodeRoutes.fetch(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('topic is required')
  })

  it('returns episode generation SSE stream', async () => {
    const params = new URLSearchParams({
      topic: 'Test topic',
      channelId: 'ch1',
      options: JSON.stringify({ research: true, script: true }),
    })
    const req = new Request(`http://localhost/api/episodes/ep1/generate?${params}`)
    const res = await episodeRoutes.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
