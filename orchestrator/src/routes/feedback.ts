/**
 * Feedback API routes — chat-based feedback loop for episode preview.
 */
import { Hono } from 'hono'
import { pbGetOne, pbUpdate, pbList } from '../pocketbase'
import { createBaseAgentSession, collectResponse } from '../agent'

export const feedbackRoutes = new Hono()

/**
 * POST /api/episodes/:id/feedback
 * Submit feedback for episode preview. Agent processes and updates compositions.
 */
feedbackRoutes.post('/episodes/:id/feedback', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { message, targetBlockId } = body

  if (!message || typeof message !== 'string' || !message.trim()) {
    return c.json({ error: 'Feedback message is required' }, 400)
  }

  try {
    const episode = await pbGetOne('episodes', episodeId)
    const feedbackLog = (episode.feedback_log || []) as Array<{
      iteration: number
      feedback: string
      timestamp: string
      agent_response: string
      target_block: string | null
    }>

    const iteration = feedbackLog.length + 1
    const targetBlock = targetBlockId || null

    // Add user feedback entry immediately
    feedbackLog.push({
      iteration,
      feedback: message.trim(),
      timestamp: new Date().toISOString(),
      agent_response: '',
      target_block: targetBlock,
    })

    await pbUpdate('episodes', episodeId, { feedback_log: feedbackLog })

    // Set episode to reviewing status
    if (episode.status !== 'reviewing') {
      await pbUpdate('episodes', episodeId, { status: 'reviewing' })
    }

    // Determine target context
    let contextPrompt = ''
    if (targetBlockId) {
      const blocks = await pbList('blocks', { filter: `episode="${episodeId}"` })
      const targetBlockData = (blocks.items || []).find((b: { id: string }) => b.id === targetBlockId)
      if (targetBlockData) {
        contextPrompt = `Focus on block "${targetBlockData.block_type}" (order: ${targetBlockData.order}).\n`
        if (targetBlockData.composition_src) {
          contextPrompt += `Block composition file: ${targetBlockData.composition_src}\n`
        }
        if (targetBlockData.script) {
          contextPrompt += `Block script: ${targetBlockData.script}\n`
        }
      }
    }

    // Get channel style DNA for context
    const channel = await pbGetOne('channels', episode.channel)
    const styleDNA = channel.style_dna || {}

    // Get composition path
    const compositionDir = episode.composition_path || `compositions/${channel.slug}/${episodeId}`

    // Spawn pi session to process feedback
    const session = await createBaseAgentSession()

    const prompt = `You are updating a HyperFrames video composition based on user feedback.

Episode: ${episode.title}
Channel style: ${JSON.stringify(styleDNA, null, 2)}

${contextPrompt}
User feedback: "${message.trim()}"

Composition directory: ${compositionDir}

Instructions:
1. Read the current composition files from the directory
2. Apply the requested changes to the appropriate HTML files
3. Maintain the existing style DNA (fonts, colors, animations)
4. Ensure all data-composition-id, data-start, data-duration attributes are correct
5. GSAP timelines must remain seekable and deterministic

Return a summary of what files you modified and what changes you made.`

    const response = await collectResponse(session, 120_000)

    // Update feedback log with agent response
    feedbackLog[feedbackLog.length - 1].agent_response = response

    await pbUpdate('episodes', episodeId, { feedback_log: feedbackLog })

    return c.json({
      iteration,
      feedback: message.trim(),
      agent_response: response,
      target_block: targetBlock,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to process feedback',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

/**
 * GET /api/episodes/:id/feedback
 * Get feedback history for episode.
 */
feedbackRoutes.get('/episodes/:id/feedback', async (c) => {
  const episodeId = c.req.param('id')

  try {
    const episode = await pbGetOne('episodes', episodeId)
    const feedbackLog = episode.feedback_log || []

    return c.json({
      episodeId,
      feedback_log: feedbackLog,
      iteration_count: feedbackLog.length,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to get feedback',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
