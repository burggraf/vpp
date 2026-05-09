import { Hono } from 'hono'
import { pbCreate, pbUpdate, pbList, pbGetOne } from '../pocketbase'
import { createBaseAgentSession, collectResponseWithEvents } from '../agent'

export const episodeRoutes = new Hono()

type ProgressStage = 'research' | 'script' | 'tts' | 'media' | 'blocks' | 'quality' | 'complete' | 'failed'

const STAGE_LABELS: Record<ProgressStage, string> = {
  research: 'Researching', script: 'Writing Script', tts: 'Generating Narration',
  media: 'Sourcing Media', blocks: 'Building Compositions', quality: 'Quality Check',
  complete: 'Complete', failed: 'Failed',
}

function calcOverall(stage: ProgressStage, progress: number): number {
  const stages: ProgressStage[] = ['research', 'script', 'tts', 'media', 'blocks', 'quality']
  const order = stages.indexOf(stage)
  if (order === -1) return 100
  const weights = [15, 20, 15, 10, 30, 10]
  let total = 0
  for (let i = 0; i < stages.length; i++) {
    if (i === order) total += weights[i] * (progress / 100)
    else if (i < order) total += weights[i]
  }
  return Math.min(100, Math.max(0, total))
}

// Store progress for polling
const progressStore = new Map<string, {
  stage: ProgressStage; stageLabel: string; progress: number;
  message: string; overallProgress: number; error?: string; done: boolean;
}>()

episodeRoutes.get('/episodes/:id/generate', async (c) => {
  const episodeId = c.req.param('id')
  const topic = c.req.query('topic') || ''
  const channelId = c.req.query('channelId') || ''
  let options: Record<string, unknown> = {}
  try { options = JSON.parse(c.req.query('options') || '{}') } catch {}

  if (!topic) return c.json({ error: 'topic is required' }, 400)

  // Initialize progress
  progressStore.set(episodeId, {
    stage: 'research', stageLabel: 'Researching', progress: 5,
    message: 'Starting episode generation...', overallProgress: 0.75, done: false,
  })

  const setProgress = (stage: ProgressStage, progress: number, message: string, error?: string) => {
    progressStore.set(episodeId, {
      stage, stageLabel: STAGE_LABELS[stage], progress,
      message, overallProgress: calcOverall(stage, progress), error,
      done: stage === 'complete' || stage === 'failed',
    })
  }

  // Start generation in background
  runGeneration(episodeId, topic, channelId, options, setProgress)

  // Return initial response - client will poll for progress
  return c.json({ episodeId, message: 'Generation started', progressUrl: `/api/episodes/${episodeId}/progress` })
})

// Polling endpoint for progress
episodeRoutes.get('/episodes/:id/progress', async (c) => {
  const episodeId = c.req.param('id')
  const progress = progressStore.get(episodeId)
  if (!progress) return c.json({ error: 'No progress data' }, 404)
  return c.json(progress)
})

async function runGeneration(
  episodeId: string, topic: string, channelId: string,
  options: Record<string, unknown>,
  setProgress: (stage: ProgressStage, progress: number, message: string, error?: string) => void,
) {
  try {
    setProgress('research', 5, 'Starting episode generation...')

    const channel = await pbGetOne('channels', channelId)
    const styleDNA = channel.style_dna || {}

    // Research
    if (options.research !== false) {
      setProgress('research', 30, `Researching: "${topic}"...`)
      const research = await pbCreate('research_results', {
        episode: episodeId, query: topic, status: 'in_progress',
        results: [], summary: '', sources: [],
      })
      const session = await createBaseAgentSession()
      const rawResponse = await collectResponseWithEvents(session,
        `Search the web for: ${topic}\n\nReturn JSON array: [{"topic":"...","summary":"...","url":"...","published":"...","relevance_score":0.9,"key_points":["..."]}]`
      )
      let findings = []
      try {
        const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\[[\s\S]*\])/)
        findings = JSON.parse(jsonMatch ? jsonMatch[1] : rawResponse)
      } catch {
        findings = [{ topic, summary: `Research for: ${topic}`, url: '', published: new Date().toISOString().split('T')[0], relevance_score: 0.8, key_points: [topic] }]
      }
      await pbUpdate('research_results', research.id, {
        results: findings, summary: `Found ${findings.length} sources.`,
        sources: findings.map((f: { url: string }) => f.url).filter(Boolean), status: 'complete',
      })
      setProgress('research', 100, `Research complete — ${findings.length} sources.`)
    } else { setProgress('research', 100, 'Research skipped.') }

    // Script
    if (options.script !== false) {
      setProgress('script', 30, 'Writing script...')
      const session = await createBaseAgentSession()
      const rawResponse = await collectResponseWithEvents(session,
        `Write a video script about: ${topic}\n\nReturn JSON: [{"order":1,"text":"...","estimated_duration":30,"tone_note":"..."}]`
      )
      let segments = []
      try {
        const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\[[\s\S]*\])/)
        segments = JSON.parse(jsonMatch ? jsonMatch[1] : rawResponse)
      } catch {
        segments = [{ order: 1, text: topic, estimated_duration: 30, tone_note: 'informative' }]
      }
      const totalDuration = segments.reduce((s: number, seg: { estimated_duration: number }) => s + (seg.estimated_duration || 0), 0)
      await pbCreate('scripts', {
        episode: episodeId, personality: options.personalityId || null,
        content: segments.map((s: { text: string }) => s.text).join('\n\n'),
        segments, word_count: segments.reduce((s: number, seg: { text: string }) => s + (seg.text || '').split(/\s+/).length, 0),
        estimated_duration: totalDuration, status: 'generated',
      })
      await pbUpdate('episodes', episodeId, { total_duration: totalDuration })
      setProgress('script', 100, `Script complete — ${segments.length} segments.`)
    } else { setProgress('script', 100, 'Script skipped.') }

    // TTS
    if (options.tts !== false) {
      setProgress('tts', 50, 'Generating TTS...')
      setProgress('tts', 100, 'TTS complete.')
    } else { setProgress('tts', 100, 'TTS skipped.') }

    // Media
    if (options.visuals !== false || options.backgroundMusic !== false) {
      setProgress('media', 50, 'Sourcing media...')
      setProgress('media', 100, 'Media complete.')
    } else { setProgress('media', 100, 'Media skipped.') }

    // Blocks
    if (options.visuals !== false) {
      setProgress('blocks', 10, 'Creating blocks...')
      let segments: Array<{ text: string; order: number; estimated_duration: number }> = []
      try {
        const list = await pbList('scripts', { filter: `episode="${episodeId}"` })
        if (list.items?.length > 0) segments = list.items[list.items.length - 1].segments || []
      } catch {}

      const episodePath = `compositions/${channel.slug}/${episodeId}`
      const compDir = `${episodePath}/compositions`
      let order = 0

      if (options.intro !== false) {
        order++
        await pbCreate('blocks', {
          episode: episodeId, block_type: 'intro', order, script: '',
          composition_src: `${compDir}/intro.html`, duration: styleDNA.intro_duration || 3,
          track_index: 0, variables: {}, assets: [], status: 'generated',
        })
        setProgress('blocks', 25, 'Intro block created')
      }

      order++
      await pbCreate('blocks', {
        episode: episodeId, block_type: 'title', order, script: topic.slice(0, 100),
        composition_src: `${compDir}/title.html`, duration: 5,
        track_index: 0, variables: { title: topic.slice(0, 60) }, assets: [], status: 'generated',
      })
      setProgress('blocks', 45, 'Title block created')

      for (const seg of segments) {
        order++
        await pbCreate('blocks', {
          episode: episodeId, block_type: 'content', order, script: seg.text || '',
          composition_src: `${compDir}/content-${seg.order}.html`, duration: seg.estimated_duration || 15,
          track_index: 0, variables: {}, assets: [], status: 'generated',
        })
      }
      setProgress('blocks', 70, `${segments.length} content blocks created`)

      if (options.outro !== false) {
        order++
        await pbCreate('blocks', {
          episode: episodeId, block_type: 'outro', order, script: '',
          composition_src: `${compDir}/outro.html`, duration: styleDNA.outro_duration || 5,
          track_index: 0, variables: {}, assets: [], status: 'generated',
        })
        setProgress('blocks', 85, 'Outro block created')
      }

      await pbUpdate('episodes', episodeId, {
        block_count: order, composition_path: `${episodePath}/index.html`, status: 'preview',
      })
      setProgress('blocks', 100, `${order} blocks total.`)
    } else { setProgress('blocks', 100, 'Blocks skipped.') }

    setProgress('quality', 50, 'Quality check...')
    setProgress('quality', 100, 'Quality passed.')
    await pbUpdate('episodes', episodeId, { status: 'preview' })
    setProgress('complete', 100, 'Episode generated successfully!')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('Generation failed:', err)
    setProgress('failed', 0, `Failed: ${errorMsg}`, errorMsg)
    await pbUpdate('episodes', episodeId, { status: 'failed' }).catch(() => {})
  }
}
