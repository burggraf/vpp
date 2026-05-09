/**
 * Media Analysis Pipeline — analyzes script segments to identify media needs.
 * Compares required assets against existing media library to find gaps.
 */
import { pbList, pbGetOne } from '../pocketbase'
import { mediaRegistry } from '../media'
import { createBaseAgentSession, collectResponseWithEvents } from '../agent'

export interface MediaNeed {
  segmentOrder: number
  visualNeeds: string
  suggestedAssets: string[] // media library IDs
  newAssetsNeeded: string[] // descriptions of assets to source
  musicMood: string
  transitionType: string
}

export interface MediaAnalysisResult {
  segments: MediaNeed[]
  globalNeeds: {
    backgroundMusic: string
    logoAnimation: string
  }
  gapCount: number
}

export async function analyzeEpisodeMedia(episodeId: string): Promise<MediaAnalysisResult> {
  // Get episode and approved script
  const episode = await pbGetOne('episodes', episodeId)
  const channel = await pbGetOne('channels', episode.channel)

  // Get approved script
  const scriptList = await pbList('scripts', {
    filter: `episode="${episodeId}"`,
  })
  if (!scriptList.items || scriptList.items.length === 0) {
    throw new Error('No approved script found for this episode')
  }
  const script = scriptList.items[0]

  // Get existing media library
  const mediaList = await pbList('media_library', { perPage: 200 })
  const mediaCatalog = mediaList.items.map((m: any) => ({
    id: m.id,
    name: m.name,
    media_type: m.media_type,
    category: m.category,
    tags: m.tags || [],
    description: m.description || '',
  }))

  // Spawn pi session to analyze script
  const session = await createBaseAgentSession()
  const rawResponse = await collectResponseWithEvents(session,
    `Analyze this script and identify all media assets needed:

Script:
${script.content || JSON.stringify(script.segments)}

Segments:
${JSON.stringify(script.segments, null, 2)}

Channel style:
${JSON.stringify(channel.style_dna || {}, null, 2)}

Available media library:
${JSON.stringify(mediaCatalog, null, 2)}

For each segment, specify:
- Required visuals (describe what image/video/graphic is needed)
- Background music mood/style
- Transitions between segments
- Text overlays, lower thirds, captions

Search the media library first for existing assets.
Flag any assets that need to be created or sourced.

Return ONLY valid JSON:
{
  "segments": [
    {
      "segmentOrder": 1,
      "visualNeeds": "description of needed visual",
      "suggestedAssets": ["media-id-1", "media-id-2"],
      "newAssetsNeeded": ["description 1", "description 2"],
      "musicMood": "upbeat tech",
      "transitionType": "crossfade"
    }
  ],
  "globalNeeds": {
    "backgroundMusic": "free-licensed tech background music",
    "logoAnimation": "animated logo intro"
  }
}`
  )

  // Parse response
  let result: MediaAnalysisResult
  try {
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse
    result = JSON.parse(jsonStr)
  } catch {
    // Fallback: create basic analysis
    const segments = (script.segments || []).map((seg: any, i: number) => ({
      segmentOrder: i + 1,
      visualNeeds: seg.text?.substring(0, 100) || '',
      suggestedAssets: [],
      newAssetsNeeded: [seg.text?.substring(0, 80) || 'visual for segment'],
      musicMood: 'neutral',
      transitionType: 'crossfade',
    }))
    result = {
      segments,
      globalNeeds: {
        backgroundMusic: 'background music',
        logoAnimation: 'logo animation',
      },
      gapCount: segments.reduce((sum: number, s: MediaNeed) => sum + s.newAssetsNeeded.length, 0),
    }
  }

  // Calculate gap count
  result.gapCount = result.segments.reduce((sum: number, s) => sum + s.newAssetsNeeded.length, 0)

  // Save to episode metadata
  await pbUpdate('episodes', episodeId, {
    metadata: {
      ...(episode.metadata || {}),
      media_analysis: result,
    },
  })

  return result
}

export async function searchMediaForNeed(need: string, options?: { limit?: number; type?: string }) {
  return mediaRegistry.searchAll(need, {
    limit: options?.limit ?? 10,
    type: options?.type,
  })
}
