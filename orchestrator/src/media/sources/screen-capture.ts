import type { MediaSource, MediaAsset, SearchOptions } from '../media/registry'

/**
 * Screen capture source — takes screenshots of URLs using Playwright.
 * Useful for capturing website visuals as media assets.
 */
export class ScreenCaptureSource implements MediaSource {
  id = 'screen-capture'
  name = 'Screen Capture'
  type = 'screen-capture' as const
  enabled = true

  async search(query: string, options?: SearchOptions): Promise<MediaAsset[]> {
    // Screen capture doesn't support traditional search.
    // Returns empty — use download directly with URL as assetId.
    const isUrl = query.startsWith('http://') || query.startsWith('https://')
    if (!isUrl) return []

    const id = Buffer.from(query).toString('base64url')
    return [{
      id,
      sourceId: this.id,
      title: query,
      description: `Screenshot of ${query}`,
      url: '',
      thumbUrl: '',
      downloadUrl: query,
      type: 'image' as const,
      license: 'Screenshot',
    }]
  }

  async download(assetId: string, path: string): Promise<string> {
    const url = Buffer.from(assetId, 'base64url').toString()
    if (!url.startsWith('http')) throw new Error('Invalid URL for screen capture')

    let browser: any
    try {
      const { chromium } = await import('playwright')
      browser = await chromium.launch({ headless: true })
      const page = await browser.newPage()
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.screenshot({ path, fullPage: false })
    } catch (err) {
      // If Playwright is not available, try puppeteer
      try {
        const puppeteer = await import('puppeteer')
        const b = await puppeteer.launch({ headless: true })
        const p = await b.newPage()
        await p.setViewport({ width: 1920, height: 1080 })
        await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
        await p.screenshot({ path })
        await b.close()
      } catch {
        throw new Error('Screen capture requires playwright or puppeteer')
      }
    } finally {
      if (browser) await browser.close()
    }

    return path
  }
}
