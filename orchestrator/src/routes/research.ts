import { Hono } from 'hono'
import { pbList, pbGetOne, pbCreate, pbUpdate } from '../pocketbase'
import { createResearchSession, collectResponse, removeSession } from '../agent'
import type { ResearchFinding } from '../types'

export const researchRoutes = new Hono()

// GET /api/episodes/:id/research — list all research for episode
researchRoutes.get('/episodes/:id/research', async (c) => {
  const episodeId = c.req.param('id')
  try {
    const results = await pbList('research_results', {
      filter: `episode="${episodeId}"`,
    })
    return c.json(results)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list research results',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// GET /api/episodes/:id/research/:rid — get single research result
researchRoutes.get('/episodes/:id/research/:rid', async (c) => {
  const rid = c.req.param('rid')
  try {
    const result = await pbGetOne('research_results', rid)
    return c.json(result)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get research result',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/episodes/:id/research — create and run research
researchRoutes.post('/episodes/:id/research', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { query, timeframe, depth } = body

  if (!query) {
    return c.json({ error: 'query is required' }, 400)
  }

  try {
    // Create research_results record
    const record = await pbCreate('research_results', {
      episode: episodeId,
      query,
      status: 'in_progress',
      results: [],
      summary: '',
      sources: [],
    })

    // Spawn pi research session (async, don't block response)
    const researchId = record.id
    ;(async () => {
      try {
        const effectiveTimeframe = timeframe || '1 week'
        const prompt = `Search the web for ${query} from the past ${effectiveTimeframe}.
For each finding, extract:
- Headline and summary
- Key facts and data points
- Source URL and publication date
- Why this matters
Return structured JSON with relevance scores (0-1).

Format as JSON array:
[
  {
    "topic": "headline here",
    "summary": "brief summary",
    "url": "https://...",
    "published": "2026-01-15",
    "relevance_score": 0.9,
    "key_points": ["point 1", "point 2"]
  }
]

Return ONLY the JSON array, no markdown, no explanation.`

        const { session } = await createResearchSession({
          episodeId,
          type: 'research',
        })

        await session.prompt(prompt)
        const rawResponse = await collectResponse(session)
        removeSession(session.sessionId)

        // Parse JSON from response
        let findings: ResearchFinding[] = []
        try {
          // Try to extract JSON from markdown code blocks or raw
          const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawResponse.match(/(\[[\s\S]*\])/)
          const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse
          findings = JSON.parse(jsonStr)
        } catch {
          console.error('Failed to parse research response:', rawResponse)
        }

        const summary = findings.length > 0
          ? `Found ${findings.length} relevant sources for "${query}".`
          : 'No relevant sources found.'

        const sources = findings.map((f) => f.url).filter(Boolean)

        await pbUpdate('research_results', researchId, {
          results: findings,
          summary,
          sources,
          status: 'complete',
        })
      } catch (err) {
        console.error(`Research failed for ${researchId}:`, err)
        await pbUpdate('research_results', researchId, {
          status: 'failed',
          summary: `Research failed: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()

    return c.json({
      message: 'Research started',
      research: record,
    }, 202)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to start research',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// PUT /api/research/:id — update research result (e.g., approve, edit)
researchRoutes.put('/api/research/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const updated = await pbUpdate('research_results', id, body)
    return c.json(updated)
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to update research',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
