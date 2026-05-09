import type { MediaSource, MediaAsset, SearchOptions } from '../media/registry'

/**
 * Unsplash source — free stock photos.
 * Requires UNSPLASH_ACCESS_KEY env var.
 */
export class UnsplashSource implements MediaSource {
  id = 'unsplash'
  name = 'Unsplash'
  type = 'stock-photo' as const
  enabled = true

  private baseUrl = 'https://api.unsplash.com'

  private get apiKey(): string {
    const key = process.env.UNSPLASH_ACCESS_KEY
    if (!key) throw new Error('UNSPLASH_ACCESS_KEY not set')
    return key
  }

  async search(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    if (!process.env.UNSPLASH_ACCESS_KEY) return []

    const params = new URLSearchParams({
      query,
      per_page: String(options?.limit ?? 20),
    })
    if (options?.orientation) params.set('orientation', options.orientation)

    const url = `${this.baseUrl}/search/photos?${params}`
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${this.apiKey}` },
    })

    if (!res.ok) {
      console.error(`Unsplash search failed: ${res.status}`)
      return []
    }

    const data = await res.json()
    return (data.results || []).map((photo: Record<string, any>) => ({
      id: photo.id,
      sourceId: this.id,
      title: photo.description || photo.alt_description || 'Untitled',
      description: photo.alt_description || '',
      url: photo.urls?.regular || photo.urls?.full || '',
      thumbUrl: photo.urls?.small || photo.urls?.thumb || '',
      downloadUrl: photo.links?.download || photo.urls?.full || '',
      type: 'image' as const,
      width: photo.width,
      height: photo.height,
      license: 'Unsplash License',
      attribution: `Photo by ${photo.user?.name} on Unsplash`,
    }))
  }

  async download(assetId: string, path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/photos/${assetId}/download`, {
      headers: { Authorization: `Client-ID ${this.apiKey}` },
    })
    if (!res.ok) throw new Error(`Unsplash download failed: ${res.status}`)

    const { writeFile } = await import('node:fs/promises')
    const buffer = await res.arrayBuffer()
    await writeFile(path, Buffer.from(buffer))
    return path
  }
}
