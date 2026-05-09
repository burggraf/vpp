import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../config', () => ({
  config: {
    HYPERFRAMES_PORT: 4000,
  },
}))

vi.mock('../pocketbase', () => ({
  pbUpdate: vi.fn().mockResolvedValue({}),
}))

describe('Preview Server', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getActivePreview', () => {
    it('returns null when no preview is active', async () => {
      const { getActivePreview } = await import('../preview')
      expect(getActivePreview()).toBeNull()
    })
  })

  describe('isPreviewActive', () => {
    it('returns false when no preview is active', async () => {
      const { isPreviewActive } = await import('../preview')
      expect(isPreviewActive('test-episode')).toBe(false)
    })
  })
})
