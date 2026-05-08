import { Hono } from 'hono'
import { pbList, pbGetOne, pbCreate, pbUpdate } from '../pocketbase'
import { createScriptSession, collectResponse, removeSession } from '../agent'
import type { ScriptSegment } from '../types'

export const scriptRoutes = new Hono()

// POST /api/episodes/:id/script/generate — generate script
scriptRoutes.post('/episodes/:id/script/generate', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { personalityId, researchId, targetDuration } = body

  if (!personalityId) {
    return c.json({ error: 'personalityId is required' }, 400)
  }

  try {
    // Fetch personality for system_prompt
    const personality = await pbGetOne('personalities', personalityId)

    if (personality.status !== 'active') {
      return c.json({ error: 'Personality must be active' }, 400)
    }

    // Create script record
    const record = await pbCreate('scripts', {
      episode: episodeId,
      personality: personalityId,
      research: researchId || '',
      content: '',
      segments: [],
      word_count: 0,
      estimated_duration: 0,
      status: 'draft',
      revision_notes: '',
    })

    // Spawn pi script session (async)
    const scriptId = record.id
    ;(async () => {
      try {
        // Fetch research if provided
        let researchText = ''
        if (researchId) {
          const research = await pbGetOne('research_results', researchId)
          if (research.results && Array.isArray(research.results)) {
            researchText = research.results
              .map(
                (r: { topic: string; summary: string; key_points?: string[] }, i: number) =>
                  `Finding ${i + 1}: ${r.topic}\n${r.summary}${r.key_points ? '\nKey points: ' + r.key_points.join(', ') : ''}`
              )
              .join('\n\n')
          }
        }

        const targetWords = targetDuration ? Math.round((targetDuration / 60) * 150) : 150
        const topic = (await pbGetOne('episodes', episodeId)).topic || 'general topic'

        const prompt = `${personality.system_prompt}

Write a script for a video about: ${topic}

${researchText ? `Use these research findings as factual basis:\n${researchText}\n` : ''}

Target duration: ${targetDuration || 60} seconds (~${targetWords} words at 150wpm).
Break the script into segments, each mapping to a video block.

Return ONLY valid JSON, no markdown:
{
  "content": "full script text here",
  "segments": [
    {"order": 1, "text": "segment text", "estimated_duration": 10, "tone_note": "intro"}
  ]
}`

        const { session } = await createScriptSession(
          { episodeId, personalityId, researchId, type: 'script' },
          personality.system_prompt
        )

        await session.prompt(prompt)
        const rawResponse = await collectResponse(session)
        removeSession(session.sessionId)

        // Parse JSON from response
        let parsed: { content: string; segments: ScriptSegment[] } = { content: '', segments: [] }
        try {
          const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\{[\s\S]*\})/)
          const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse
          parsed = JSON.parse(jsonStr)
        } catch {
          console.error('Failed to parse script response:', rawResponse)
          // Fallback: save raw text as content
          parsed.content = rawResponse
        }

        const segments = parsed.segments || []
        const totalDuration = segments.reduce((sum, s) => sum + (s.estimated_duration || 0), 0)
        const wordCount = parsed.content.split(/\s+/).filter(Boolean).length

        await pbUpdate('scripts', scriptId, {
          content: parsed.content,
          segments,
          word_count: wordCount,
          estimated_duration: totalDuration || 60,
          status: 'generated',
        })
      } catch (err) {
        console.error(`Script generation failed for ${scriptId}:`, err)
        await pbUpdate('scripts', scriptId, {
          status: 'draft',
          revision_notes: `Generation failed: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()

    return c.json({
      message: 'Script generation started',
      script: record,
    }, 202)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to generate script',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/episodes/:id/script/revise — revise script with feedback
scriptRoutes.post('/episodes/:id/script/revise', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { feedback } = body

  if (!feedback) {
    return c.json({ error: 'feedback is required' }, 400)
  }

  try {
    // Find latest script for episode
    const results = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
      sort: '-created',
    })

    if (results.items.length === 0) {
      return c.json({ error: 'No script found for this episode' }, 404)
    }

    const script = results.items[0]

    // TODO: Spawn revision session with feedback
    const updated = await pbUpdate('scripts', script.id, {
      status: 'needs_revision',
      revision_notes: (script.revision_notes || '') + '\n' + feedback,
    })

    return c.json({
      message: 'Script revision started',
      script: updated,
    }, 202)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to revise script',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/episodes/:id/script/approve — approve script
scriptRoutes.post('/episodes/:id/script/approve', async (c) => {
  const episodeId = c.req.param('id')

  try {
    const results = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
      sort: '-created',
    })

    if (results.items.length === 0) {
      return c.json({ error: 'No script found for this episode' }, 404)
    }

    const script = results.items[0]
    const updated = await pbUpdate('scripts', script.id, {
      status: 'approved',
    })

    return c.json({ message: 'Script approved', script: updated })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to approve script',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// GET /api/episodes/:id/script — get latest script for episode
scriptRoutes.get('/episodes/:id/script', async (c) => {
  const episodeId = c.req.param('id')

  try {
    const results = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
      sort: '-created',
    })

    if (results.items.length === 0) {
      return c.json({ error: 'No script found' }, 404)
    }

    return c.json(results.items[0])
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get script',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// GET /api/episodes/:id/scripts — list all scripts for episode
scriptRoutes.get('/episodes/:id/scripts', async (c) => {
  const episodeId = c.req.param('id')

  try {
    const results = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
    })
    return c.json(results)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list scripts',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// PUT /api/scripts/:id — update script directly (for manual edits)
scriptRoutes.put('/scripts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  try {
    const updated = await pbUpdate('scripts', id, body)
    return c.json(updated)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to update script',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
