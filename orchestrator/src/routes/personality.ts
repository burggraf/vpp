import { Hono } from 'hono'
import { pbList, pbGetOne, pbCreate, pbUpdate, pbDelete } from '../pocketbase'
import {
  createPersonalityTrainSession,
  createPersonalityValidateSession,
  collectResponse,
  removeSession,
} from '../agent'

export const personalityRoutes = new Hono()

// GET /api/personalities — list all personalities
personalityRoutes.get('/personalities', async (c) => {
  try {
    const results = await pbList('personalities')
    return c.json(results)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list personalities',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// GET /api/personalities/:slug — get personality by slug
personalityRoutes.get('/personalities/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    const results = await pbList('personalities', {
      filter: `slug="${slug}"`,
    })
    if (results.items.length === 0) {
      return c.json({ error: 'Personality not found' }, 404)
    }
    return c.json(results.items[0])
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get personality',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/personalities — create personality
personalityRoutes.post('/personalities', async (c) => {
  const body = await c.req.json()
  const { name, slug, description } = body

  if (!name || !slug) {
    return c.json({ error: 'name and slug are required' }, 400)
  }

  try {
    const record = await pbCreate('personalities', {
      name,
      slug,
      description: description || '',
      voice_profile: {},
      training_sources: [],
      system_prompt: ' ',  // placeholder — filled after training
      sample_output: '',
      status: 'draft',
    })
    return c.json(record, 201)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to create personality',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// PUT /api/personalities/:id — update personality
personalityRoutes.put('/personalities/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const updated = await pbUpdate('personalities', id, body)
    return c.json(updated)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to update personality',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// DELETE /api/personalities/:id — delete personality
personalityRoutes.delete('/personalities/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await pbDelete('personalities', id)
    return c.json({ message: 'Personality deleted' })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to delete personality',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/personalities/:id/train — analyze training sources
personalityRoutes.post('/personalities/:id/train', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { sources } = body as { sources?: string[] }

  if (!sources || sources.length === 0) {
    return c.json({ error: 'sources array is required' }, 400)
  }

  if (sources.length < 5) {
    // Warning but don't block
    console.warn(`⚠️ Only ${sources.length} training sources (recommended: 5+)`)
  }

  try {
    // Save training sources first
    await pbUpdate('personalities', id, {
      training_sources: sources,
    })

    // Spawn pi session to analyze sources (async)
    const personalityId = id
    ;(async () => {
      try {
        const sourcesText = sources.map((s: string, i: number) => `--- Source ${i + 1} ---\n${s}`).join('\n\n')

        const prompt = `Analyze these writing samples for voice patterns:

${sourcesText}

Extract:
1. Sentence length and structure patterns
2. Vocabulary choices, jargon, catchphrases
3. Tone (formality, humor, energy)
4. Rhetorical devices (questions, direct address)
5. What to avoid (AI-sounding phrases, clichés)

Return ONLY valid JSON, no markdown:
{
  "voice_profile": {
    "tone": "description of overall tone",
    "pacing": "description of pacing style",
    "vocabulary": "description of word choice",
    "avoid": ["phrases or patterns to avoid"],
    "catchphrases": ["signature phrases or expressions"],
    "sentence_style": "description of sentence construction",
    "humor_level": "none | low | medium | high"
  },
  "system_prompt": "Full system prompt that would make an AI write in this voice. Include tone, style, structure rules, and examples."
}`

        const { session } = await createPersonalityTrainSession({
          episodeId: '',
          type: 'personality_train',
        })

        await session.prompt(prompt)
        const rawResponse = await collectResponse(session)
        removeSession(session.sessionId)

        // Parse JSON from response
        let parsed: { voice_profile: unknown; system_prompt: string } = { voice_profile: {}, system_prompt: '' }
        try {
          const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\{[\s\S]*\})/)
          const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse
          parsed = JSON.parse(jsonStr)
        } catch {
          console.error('Failed to parse personality analysis:', rawResponse)
        }

        await pbUpdate('personalities', personalityId, {
          voice_profile: parsed.voice_profile || {},
          system_prompt: parsed.system_prompt || '',
          status: 'active',
        })
      } catch (err) {
        console.error(`Personality training failed for ${personalityId}:`, err)
        await pbUpdate('personalities', personalityId, {
          status: 'draft',
        })
      }
    })()

    return c.json({
      message: 'Training started',
      warning: sources.length < 5 ? 'Minimum 5 sources recommended' : null,
    }, 202)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to start training',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/personalities/:id/validate — generate sample output
personalityRoutes.post('/personalities/:id/validate', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { topic } = body || {}

  try {
    const personality = await pbGetOne('personalities', id)

    if (!personality.system_prompt) {
      return c.json({
        error: 'Personality must be trained first (no system_prompt)',
      }, 400)
    }

    // Spawn pi session to generate sample (async)
    const personalityId = id
    ;(async () => {
      try {
        const sampleTopic = topic || 'a recent development in technology'
        const prompt = `${personality.system_prompt}

Write a short video script (about 60 seconds, ~150 words) about: ${sampleTopic}

Format:
- Write naturally in the specified voice
- Break into natural segments
- Include any stage directions in [brets]`

        const { session } = await createPersonalityValidateSession(
          { episodeId: '', type: 'personality_validate' },
          personality.system_prompt
        )

        await session.prompt(prompt)
        const sampleOutput = await collectResponse(session)
        removeSession(session.sessionId)

        await pbUpdate('personalities', personalityId, {
          sample_output: sampleOutput,
          status: 'active',
        })
      } catch (err) {
        console.error(`Personality validation failed for ${personalityId}:`, err)
      }
    })()

    return c.json({
      message: 'Sample generation started',
    }, 202)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to generate sample',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
