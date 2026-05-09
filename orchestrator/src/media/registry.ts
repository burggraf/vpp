/**
 * Media Source Registry — extensible pattern for sourcing media assets.
 * Each source implements MediaSource interface and is registered by ID.
 */

export interface SearchOptions {
  type?: string
  limit?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  query?: string
}

export interface MediaAsset {
  id: string
  sourceId: string
  title: string
  description: string
  url: string
  thumbUrl: string
  downloadUrl: string
  type: 'image' | 'video' | 'audio'
  width?: number
  height?: number
  duration?: number
  license?: string
  attribution?: string
}

export interface MediaSource {
  id: string
  name: string
  type: 'ai-image' | 'stock-photo' | 'stock-video' | 'screen-capture' | 'upload'
  enabled: boolean
  search(query: string, options?: SearchOptions): Promise<MediaAsset[]>
  download(assetId: string, path: string): Promise<string>
}

/** Default source registry config */
export interface MediaSourceConfig {
  sources: {
    id: string
    type: string
    enabled: boolean
  }[]
}

export const DEFAULT_SOURCE_CONFIG: MediaSourceConfig = {
  sources: [
    { id: 'upload', type: 'upload', enabled: true },
    { id: 'unsplash', type: 'stock-photo', enabled: true },
    { id: 'pexels', type: 'stock-photo', enabled: true },
    { id: 'pixabay', type: 'stock-photo', enabled: true },
    { id: 'screen-capture', type: 'screen-capture', enabled: true },
    { id: 'gemini', type: 'ai-image', enabled: false },
  ],
}

class MediaSourceRegistry {
  private sources = new Map<string, MediaSource>()
  private config: MediaSourceConfig = { ...DEFAULT_SOURCE_CONFIG }

  register(source: MediaSource) {
    this.sources.set(source.id, source)
  }

  get(id: string): MediaSource | undefined {
    return this.sources.get(id)
  }

  list(): MediaSource[] {
    return Array.from(this.sources.values())
  }

  listEnabled(): MediaSource[] {
    return this.list().filter((s) => s.enabled)
  }

  setConfig(config: MediaSourceConfig) {
    this.config = config
    // Update enabled status based on config
    for (const src of this.sources.values()) {
      const cfg = this.config.sources.find((s) => s.id === src.id)
      if (cfg) {
        src.enabled = cfg.enabled
      }
    }
  }

  getConfig(): MediaSourceConfig {
    return this.config
  }

  async searchAll(query: string, options?: SearchOptions): Promise<Map<string, MediaAsset[]>> {
    const results = new Map<string, MediaAsset[]>()
    const enabled = this.listEnabled()

    await Promise.all(
      enabled.map(async (source) => {
        try {
          const assets = await source.search(query, options)
          if (assets.length > 0) {
            results.set(source.id, assets)
          }
        } catch (err) {
          console.error(`Media source ${source.id} search failed:`, err)
        }
      })
    )

    return results
  }
}

export const mediaRegistry = new MediaSourceRegistry()
