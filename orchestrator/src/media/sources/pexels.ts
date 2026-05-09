import type { MediaSource, MediaAsset, SearchOptions } from '../media/registry'

/**
 * Pexels source — free stock photos and videos.
 * Requires PEXELS_API_KEY env var.
 */
export class PexelsSource implements MediaSource {
  id = 'pexels'
  name = 'Pexels'
  type = 'stock-photo' as const
  enabled = true

  private baseUrl = 'https://api.pexels.com/v1'
  private videoUrl = 'https://api.pexels.com/videos'

  private get apiKey(): string {
    const key = process.env.PEXELS_API_KEY
    if (!key) throw new Error('PEXELS_API_KEY not set')
    return key
  }

  async search(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    if (!process.env.PEXELS_API_KEY) return []

    const type = options?.type || 'photo'
    if (type === 'video') {
      return this.searchVideos(query, options)
    }
    return this.searchPhotos(query, options)
  }

  private async searchPhotos(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    const params = new URLSearchParams({
      query,
      per_page: String(options?.limit ?? 20),
    })

    const url = `${this.baseUrl}/search?${params}`
    const res = await fetch(url, {
      headers: { Authorization: this.apiKey },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.photos || []).map((photo: Record<string, any>) => ({
      id: String(photo.id),
      sourceId: this.id,
      title: photo.alt || 'Untitled',
      description: photo.alt || '',
      url: photo.src?.large || photo.src?.original || '',
      thumbUrl: photo.src?.medium || photo.src?.small || '',
      downloadUrl: photo.src?.original || '',
      type: 'image' as const,
      width: photo.width,
      height: photo.height,
      license: 'Pexels License',
      attribution: `Photo by ${photo.photographer} on Pexels`,
    }))
  }

  private async searchVideos(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    const params = new URLSearchParams({
      query,
      per_page: String(options?.limit ?? 10),
    })

    const url = `${this.videoUrl}/search?${params}`
    const res = await fetch(url, {
      headers: { Authorization: this.apiKey },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.videos || []).map((video: Record<string, any>) => ({
      id: String(video.id),
      sourceId: this.id,
      title: '',
      description: '',
      url: video.video_files?.[0]?.link || '',
      thumbUrl: video.image || '',
      downloadUrl: video.video_files?.[0]?.link || '',
      type: 'video' as const,
      width: video.width,
      height: video.height,
      duration: video.duration,
      license: 'Pexels License',
      attribution: `Video by ${video.user?.name} on Pexels`,
    }))
  }

  async download(assetId: string, path: string): Promise<string> {
    const { writeFile } = await import('node:fs/promises')
    const res = await fetch(`${this.baseUrl}/photos/${assetId}`, {
      headers: { Authorization: this.apiKey },
    })
    if (!res.ok) throw new Error(`Pexels download failed: ${res.status}`)

    const data = await res.json()
    const downloadUrl = data.src?.original
    if (!downloadUrl) throw new Error('No download URL found')

    const fileRes = await fetch(downloadUrl)
    const buffer = await fileRes.arrayBuffer()
    await writeFile(path, Buffer.from(buffer))
    return path
  }
}
