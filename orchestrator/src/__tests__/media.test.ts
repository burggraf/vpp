import { describe, expect, test, beforeEach } from 'bun:test'
import { mediaRegistry, DEFAULT_SOURCE_CONFIG, type MediaSource, type MediaAsset } from '../media/registry'

class MockSource implements MediaSource {
  constructor(
    public id: string,
    public name: string,
    public type: 'ai-image' | 'stock-photo' | 'stock-video' | 'screen-capture' | 'upload',
    public enabled = true,
  ) {}

  async search(query: string): Promise<MediaAsset[]> {
    if (query === 'fail') throw new Error('Search failed')
    return [{
      id: `${this.id}-1`,
      sourceId: this.id,
      title: `Mock result for "${query}"`,
      description: '',
      url: 'https://example.com/image.jpg',
      thumbUrl: 'https://example.com/thumb.jpg',
      downloadUrl: 'https://example.com/download.jpg',
      type: 'image',
    }]
  }

  async download(assetId: string, path: string): Promise<string> {
    return path
  }
}

describe('MediaSourceRegistry', () => {
  beforeEach(() => {
    // Reset registry
    mediaRegistry.setConfig({ ...DEFAULT_SOURCE_CONFIG })
  })

  test('register and get source', () => {
    const src = new MockSource('mock', 'Mock', 'stock-photo')
    mediaRegistry.register(src)
    const found = mediaRegistry.get('mock')
    expect(found).toBeDefined()
    expect(found?.id).toBe('mock')
    expect(found?.name).toBe('Mock')
  })

  test('list returns all registered sources', () => {
    mediaRegistry.register(new MockSource('a', 'A', 'stock-photo'))
    mediaRegistry.register(new MockSource('b', 'B', 'stock-video'))
    const sources = mediaRegistry.list()
    expect(sources.length).toBeGreaterThanOrEqual(2)
  })

  test('listEnabled filters by enabled flag', () => {
    const disabled = new MockSource('disabled', 'Disabled', 'stock-photo', false)
    mediaRegistry.register(disabled)
    const enabled = mediaRegistry.listEnabled()
    expect(enabled.find((s) => s.id === 'disabled')).toBeUndefined()
  })

  test('setConfig updates enabled status', () => {
    const src = new MockSource('test-src', 'Test', 'stock-photo')
    mediaRegistry.register(src)
    expect(src.enabled).toBe(true)

    mediaRegistry.setConfig({
      sources: [{ id: 'test-src', type: 'stock-photo', enabled: false }],
    })
    expect(src.enabled).toBe(false)
  })

  test('getConfig returns current config', () => {
    const config = mediaRegistry.getConfig()
    expect(config.sources).toBeDefined()
    expect(config.sources.length).toBeGreaterThan(0)
  })

  test('searchAll searches all enabled sources', async () => {
    mediaRegistry.register(new MockSource('mock1', 'Mock1', 'stock-photo'))
    mediaRegistry.register(new MockSource('mock2', 'Mock2', 'stock-photo'))

    const results = await mediaRegistry.searchAll('test query')
    expect(results.size).toBeGreaterThanOrEqual(2)
    expect(results.has('mock1')).toBe(true)
    expect(results.has('mock2')).toBe(true)
  })

  test('searchAll skips failed sources', async () => {
    mediaRegistry.register(new MockSource('ok', 'OK', 'stock-photo'))
    mediaRegistry.register(new MockSource('fail', 'Fail', 'stock-photo'))

    const results = await mediaRegistry.searchAll('fail')
    expect(results.has('ok')).toBe(false)
    expect(results.has('fail')).toBe(false)
  })

  test('searchAll with type option', async () => {
    mediaRegistry.register(new MockSource('img', 'Image', 'stock-photo'))
    const results = await mediaRegistry.searchAll('test', { type: 'image' })
    expect(results.size).toBeGreaterThanOrEqual(1)
  })

  test('default config has expected sources', () => {
    expect(DEFAULT_SOURCE_CONFIG.sources).toContainEqual(
      expect.objectContaining({ id: 'unsplash', enabled: true }),
    )
    expect(DEFAULT_SOURCE_CONFIG.sources).toContainEqual(
      expect.objectContaining({ id: 'pexels', enabled: true }),
    )
    expect(DEFAULT_SOURCE_CONFIG.sources).toContainEqual(
      expect.objectContaining({ id: 'pixabay', enabled: true }),
    )
  })
})
