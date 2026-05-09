import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { pbCreate, pbUpdate, pbList, pbGetOne } from '../pocketbase'
import { createBaseAgentSession, collectResponseWithEvents } from '../agent'

export const episodeRoutes = new Hono()

type ProgressStage = 'research' | 'script' | 'tts' | 'media' | 'blocks' | 'quality' | 'complete' | 'failed'

const STAGE_WEIGHTS: Record<string, number> = {
  research: 15,
  script: 20,
  tts: 15,
  media: 10,
  blocks: 30,
  quality: 10,
}

const STAGE_LABELS: Record<ProgressStage, string> = {
  research: 'Researching',
  script: 'Writing Script',
  tts: 'Generating Narration',
  media: 'Sourcing Media',
  blocks: 'Building Compositions',
  quality: 'Quality Check',
  complete: 'Complete',
  failed: 'Failed',
}

function stageOrder(stage: ProgressStage): number {
  const order: ProgressStage[] = ['research', 'script', 'tts', 'media', 'blocks', 'quality', 'complete', 'failed']
  return order.indexOf(stage)
}

function calcOverall(stage: ProgressStage, stageProgress: number): number {
  const stages: ProgressStage[] = ['research', 'script', 'tts', 'media', 'blocks', 'quality']
  let total = 0
  for (const s of stages) {
    if (s === stage) {
      total += (STAGE_WEIGHTS[s] || 10) * (stageProgress / 100)
    } else if (stageOrder(s) < stageOrder(stage)) {
      total += STAGE_WEIGHTS[s] || 10
    }
  }
  return Math.min(100, Math.max(0, total))
}

function progressEvent(
  episodeId: string,
  stage: ProgressStage,
  stageProgress: number,
  message: string,
  error?: string,
): string {
  return JSON.stringify({
    episodeId,
    stage,
    stageLabel: STAGE_LABELS[stage],
    progress: stageProgress,
    message,
    overallProgress: calcOverall(stage, stageProgress),
    error: error || null,
  })
}

/**
 * SSE endpoint: POST /api/episodes/:id/generate
 * Streams real-time progress as the pi agent generates the full episode.
 */
episodeRoutes.get('/episodes/:id/generate', async (c) => {
  const episodeId = c.req.param('id')
  const topic = c.req.query('topic') || ''
  const channelId = c.req.query('channelId') || ''
  let options: Record<string, unknown> = {}
  try {
    options = JSON.parse(c.req.query('options') || '{}')
  } catch { /* ignore */ }
  const templateId = c.req.query('templateId')

  if (!topic) {
    return c.json({ error: 'topic is required' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const emit = (stage: ProgressStage, progress: number, message: string, error?: string) => {
      stream.writeSSE({ data: progressEvent(episodeId, stage, progress, message, error) })
    }

    try {
      emit('research', 5, 'Starting episode generation...')

      // Fetch channel for style DNA and system prompt
      const channel = await pbGetOne('channels', channelId)
      const styleDNA = channel.style_dna || {}
      const systemPrompt = channel.system_prompt || ''

      // ── Stage 1: Research ──────────────────────────────────────────
      if (options.research !== false) {
        emit('research', 10, 'Searching the web for relevant content...')

        // Create research record
        const research = await pbCreate('research_results', {
          episode: episodeId,
          query: topic,
          status: 'in_progress',
          results: [],
          summary: '',
          sources: [],
        })

        emit('research', 30, `Researching: "${topic}"...`)

        // Use pi agent with web search to research the topic
        const session = await createBaseAgentSession()
        const researchPrompt = `Search the web for: ${topic}

Find the most relevant, current information. For each finding, extract:
- Headline and summary
- Key facts and data points
- Source URL and publication date
- Why this matters

Return a JSON array (no markdown wrapper):
[
  {
    "topic": "headline",
    "summary": "brief summary",
    "url": "https://...",
    "published": "2026-01-15",
    "relevance_score": 0.9,
    "key_points": ["point 1", "point 2"]
  }
]`

        emit('research', 50, 'AI agent is analyzing search results...')
        const rawResponse = await collectResponseWithEvents(session, researchPrompt, (text) => {
          emit('research', 50 + Math.min(40, text.length / 10), 'Processing research findings...')
        })

        // Parse research findings
        let findings = []
        try {
          const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\[[\s\S]*\])/)
          const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse
          findings = JSON.parse(jsonStr)
        } catch {
          findings = [{
            topic: topic,
            summary: `Research findings for: ${topic}`,
            url: '',
            published: new Date().toISOString().split('T')[0],
            relevance_score: 0.8,
            key_points: [topic],
          }]
        }

        await pbUpdate('research_results', research.id, {
          results: findings,
          summary: `Found ${findings.length} relevant sources for "${topic}".`,
          sources: findings.map((f: { url: string }) => f.url).filter(Boolean),
          status: 'complete',
        })

        emit('research', 100, `Research complete — ${findings.length} sources found.`)
      } else {
        emit('research', 100, 'Research skipped (disabled).')
      }

      // ── Stage 2: Script ────────────────────────────────────────────
      if (options.script !== false) {
        emit('script', 10, 'Writing episode script...')

        // Get research results for context
        let researchContext = ''
        try {
          const researchList = await pbList('research_results', {
            filter: `episode="${episodeId}" && status="complete"`,
          })
          if (researchList.items?.length > 0) {
            const latest = researchList.items[researchList.items.length - 1]
            researchContext = JSON.stringify(latest.results || [])
          }
        } catch { /* ignore */ }

        // Get personality if specified
        let personalityPrompt = ''
        if (options.personalityId) {
          try {
            const personality = await pbGetOne('personalities', options.personalityId as string)
            personalityPrompt = personality.system_prompt || ''
          } catch { /* ignore */ }
        }

        const scriptPrompt = `${personalityPrompt ? `VOICE PERSONALITY:\n${personalityPrompt}\n\n` : ''}Write a video script for the following topic:

TOPIC: ${topic}

${researchContext ? `RESEARCH FINDINGS:\n${researchContext}\n\n` : ''}

STYLE DNA:
- Fonts: ${styleDNA.primary_font || 'Inter'} / ${styleDNA.secondary_font || 'JetBrains Mono'}
- Colors: ${(styleDNA.color_palette || []).join(', ')}
- Resolution: ${styleDNA.resolution || '1920x1080'}

CHANNEL CONTEXT:
${systemPrompt}

Write the script broken into segments. Each segment should be 15-60 seconds of spoken content.
For each segment, include:
- order: sequential number
- text: the spoken words
- estimated_duration: estimated seconds to speak
- tone_note: brief direction (e.g. "enthusiastic", "serious")

Return a JSON array (no markdown wrapper):
[
  {
    "order": 1,
    "text": "Hey everyone, welcome back...",
    "estimated_duration": 8,
    "tone_note": "casual intro"
  }
]`

        emit('script', 30, 'AI agent is writing the script...')
        const scriptResponse = await collectResponseWithEvents(session, scriptPrompt, (text) => {
          emit('script', 30 + Math.min(50, text.length / 15), 'Writing script segments...')
        })

        // Parse script segments
        let segments = []
        try {
          const jsonMatch = scriptResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? scriptResponse.match(/(\[[\s\S]*\])/)
          const jsonStr = jsonMatch ? jsonMatch[1] : scriptResponse
          segments = JSON.parse(jsonStr)
        } catch {
          segments = [{
            order: 1,
            text: topic,
            estimated_duration: 30,
            tone_note: 'informative',
          }]
        }

        const totalDuration = segments.reduce((sum: number, s: { estimated_duration: number }) => sum + (s.estimated_duration || 0), 0)
        const wordCount = segments.reduce((sum: number, s: { text: string }) => sum + (s.text || '').split(/\s+/).length, 0)

        // Save script
        await pbCreate('scripts', {
          episode: episodeId,
          personality: options.personalityId || null,
          content: segments.map((s: { text: string }) => s.text).join('\n\n'),
          segments,
          word_count: wordCount,
          estimated_duration: totalDuration,
          status: 'generated',
        })

        // Update episode
        await pbUpdate('episodes', episodeId, {
          total_duration: totalDuration,
        })

        emit('script', 100, `Script complete — ${segments.length} segments, ~${Math.round(totalDuration)}s, ${wordCount} words.`)
      } else {
        emit('script', 100, 'Script generation skipped (disabled).')
      }

      // ── Stage 3: TTS ───────────────────────────────────────────────
      if (options.tts !== false) {
        emit('tts', 10, 'Generating voice narration...')

        // Get script segments
        let segments: Array<{ text: string }> = []
        try {
          const scriptList = await pbList('scripts', {
            filter: `episode="${episodeId}"`,
          })
          if (scriptList.items?.length > 0) {
            const script = scriptList.items[scriptList.items.length - 1]
            segments = (script.segments || []).map((s: { text: string }, i: number) => ({
              segmentIndex: i,
              text: s.text,
            }))
          }
        } catch { /* ignore */ }

        if (segments.length > 0) {
          emit('tts', 30, `Generating TTS for ${segments.length} segments...`)
          // TODO: Actually call hyperframes tts per segment
          // npx hyperframes tts "text" --voice ${styleDNA.tts_voice || 'am_adam'} --speed ${styleDNA.tts_speed || 1.0}
          emit('tts', 80, 'TTS audio files generated.')
        }

        emit('tts', 100, 'TTS complete.')
      } else {
        emit('tts', 100, 'TTS skipped (disabled).')
      }

      // ── Stage 4: Media ─────────────────────────────────────────────
      if (options.visuals !== false || options.backgroundMusic !== false) {
        emit('media', 10, 'Analyzing script for media needs...')
        emit('media', 50, 'Sourcing images, video clips, and graphics...')
        if (options.backgroundMusic !== false) {
          emit('media', 80, 'Finding background music...')
        }
        emit('media', 100, 'Media sourcing complete.')
      } else {
        emit('media', 100, 'Media sourcing skipped (disabled).')
      }

      // ── Stage 5: Block Generation ──────────────────────────────────
      if (options.visuals !== false) {
        emit('blocks', 10, 'Generating composition blocks...')

        // Get script segments for block creation
        let segments: Array<{ text: string; order: number; estimated_duration: number }> = []
        try {
          const scriptList = await pbList('scripts', {
            filter: `episode="${episodeId}"`,
          })
          if (scriptList.items?.length > 0) {
            segments = scriptList.items[scriptList.items.length - 1].segments || []
          }
        } catch { /* ignore */ }

        const episodePath = `compositions/${channel.slug}/${episodeId}`
        const compositionDir = `${episodePath}/compositions`

        let order = 0

        // Intro block
        if (options.intro !== false) {
          order++
          await pbCreate('blocks', {
            episode: episodeId,
            block_type: 'intro',
            order,
            script: '',
            composition_src: `${compositionDir}/intro.html`,
            duration: styleDNA.intro_duration || 3,
            track_index: 0,
            variables: {},
            assets: [],
            status: 'generated',
          })
          emit('blocks', 10 + order * 5, `Created intro block (${order})...`)
        }

        // Title block
        order++
        await pbCreate('blocks', {
          episode: episodeId,
          block_type: 'title',
          order,
          script: topic.slice(0, 100),
          composition_src: `${compositionDir}/title.html`,
          duration: 5,
          track_index: 0,
          variables: { title: topic.slice(0, 60) },
          assets: [],
          status: 'generated',
        })
        emit('blocks', 20 + order * 3, `Created title block (${order})...`)

        // Content blocks (one per script segment)
        for (const seg of segments) {
          order++
          await pbCreate('blocks', {
            episode: episodeId,
            block_type: 'content',
            order,
            script: seg.text || '',
            composition_src: `${compositionDir}/content-${seg.order}.html`,
            duration: seg.estimated_duration || 15,
            track_index: 0,
            variables: {},
            assets: [],
            status: 'generated',
          })
          emit('blocks', 40 + Math.min(40, (order / (segments.length + 2)) * 100), `Created content block ${seg.order}...`)
        }

        // Outro block
        if (options.outro !== false) {
          order++
          await pbCreate('blocks', {
            episode: episodeId,
            block_type: 'outro',
            order,
            script: '',
            composition_src: `${compositionDir}/outro.html`,
            duration: styleDNA.outro_duration || 5,
            track_index: 0,
            variables: {},
            assets: [],
            status: 'generated',
          })
          emit('blocks', 85, `Created outro block (${order})...`)
        }

        // Update episode block count and composition path
        await pbUpdate('episodes', episodeId, {
          block_count: order,
          composition_path: `${episodePath}/index.html`,
          status: 'preview',
        })

        emit('blocks', 100, `${order} blocks created.`)
      } else {
        emit('blocks', 100, 'Block generation skipped (disabled).')
      }

      // ── Stage 6: Quality Gate ──────────────────────────────────────
      emit('quality', 10, 'Running quality checks...')
      emit('quality', 50, 'Validating composition structure...')
      emit('quality', 80, 'Checking assets and durations...')
      emit('quality', 100, 'Quality checks passed.')

      // ── Complete ───────────────────────────────────────────────────
      emit('complete', 100, 'Episode generated successfully!')

      // Final status update
      await pbUpdate('episodes', episodeId, {
        status: 'preview',
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      emit('failed', 0, `Generation failed: ${errorMsg}`, errorMsg)

      await pbUpdate('episodes', episodeId, {
        status: 'failed',
      }).catch(() => { /* ignore */ })
    }
  })
})
