import type { MediaSource, MediaAsset, SearchOptions } from '../media/registry'

/**
 * Pixabay source — free stock photos, videos, and music.
 * Requires PIXABAY_API_KEY env var.
 */
export class PixabaySource implements MediaSource {
  id = 'pixabay'
  name = 'Pixabay'
  type = 'stock-photo' as const
  enabled = true

  private baseUrl = 'https://pixabay.com/api'

  private get apiKey(): string {
    const key = process.env.PIXABAY_API_KEY
    if (!key) throw new Error('PIXABAY_API_KEY not set')
    return key
  }

  async search(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    if (!process.env.PIXABAY_API_KEY) return []

    const type = options?.type || 'image'
    const params = new URLSearchParams({
      key: this.apiKey,
      q: query,
      image_type: type === 'image' ? 'photo' : type,
      per_page: String(options?.limit ?? 20),
    })

    const url = `${this.baseUrl}/?${params}`
    const res = await fetch(url)

    if (!res.ok) return []

    const data = await res.json()
    return (data.hits || []).map((hit: Record<string, any>) => ({
      id: String(hit.id),
      sourceId: this.id,
      title: hit.tags || '',
      description: hit.tags || '',
      url: hit.largeImageURL || hit.webformatURL || hit.previewURL || '',
      thumbUrl: hit.previewURL || '',
      downloadUrl: hit.largeImageURL || hit.webformatURL || '',
      type: (type as any) === 'image' ? 'image' : 'video',
      width: hit.imageWidth,
      height: hit.imageHeight,
      license: 'Pixabay License',
      attribution: `By ${hit.user} on Pixabay`,
    }))
  }

  async download(assetId: string, path: string): Promise<string> {
    const { writeFile } = await import('node:fs/promises')

    // Fetch asset details to get download URL
    const res = await fetch(`${this.baseUrl}/?key=${this.apiKey}&id=${assetId}`)
    if (!res.ok) throw new Error(`Pixabay download failed: ${res.status}`)

    const data = await res.json()
    const hit = data.hits?.[0]
    if (!hit) throw new Error('Asset not found')

    const downloadUrl = hit.largeImageURL || hit.webformatURL
    const fileRes = await fetch(downloadUrl)
    const buffer = await fileRes.arrayBuffer()
    await writeFile(path, Buffer.from(buffer))
    return path
  }
}
