import { Hono } from 'hono'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { config } from '../config'
import { pbGetOne } from '../pocketbase'

const exec = promisify(execFile)

export const ttsRoutes = new Hono()

// GET /api/tts/voices — list available Kokoro voices
ttsRoutes.get('/tts/voices', async (c) => {
  try {
    const { stdout } = await exec('npx', [
      'hyperframes',
      'tts',
      '--list',
    ], {
      cwd: process.cwd(),
      env: process.env,
    })

    // Parse voice list output
    const voices = stdout
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [name, lang, desc] = line.split(/\s{2,}/)
        return { name: name?.trim(), lang: lang?.trim(), description: desc?.trim() }
      })
      .filter((v: { name: string }) => v.name)

    return c.json({ voices })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to list TTS voices',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/episodes/:id/tts/preview — generate TTS for first segment
ttsRoutes.post('/episodes/:id/tts/preview', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { text, voice, speed } = body

  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }

  try {
    // Fetch episode to get channel and style_dna defaults
    const episode = await pbGetOne('episodes', episodeId)
    const channel = await pbGetOne('channels', episode.channel)

    const ttsVoice = voice || channel.style_dna?.tts_voice || 'af_sarah'
    const ttsSpeed = speed || channel.style_dna?.tts_speed || 1.0
    const outputPath = `./renders/preview_${episodeId}_${Date.now()}.wav`

    await exec('npx', [
      'hyperframes',
      'tts',
      text,
      '--voice',
      ttsVoice,
      '--speed',
      String(ttsSpeed),
      '--output',
      outputPath,
    ], {
      cwd: process.cwd(),
      env: process.env,
    })

    return c.json({
      message: 'TTS preview generated',
      outputPath,
      voice: ttsVoice,
      speed: ttsSpeed,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to generate TTS preview',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})

// POST /api/episodes/:id/tts/generate — generate TTS for all script segments
ttsRoutes.post('/episodes/:id/tts/generate', async (c) => {
  const episodeId = c.req.param('id')
  const body = await c.req.json()
  const { segments, voice, speed } = body

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return c.json({ error: 'segments array is required' }, 400)
  }

  try {
    // Fetch episode for defaults
    const episode = await pbGetOne('episodes', episodeId)
    const channel = await pbGetOne('channels', episode.channel)

    const ttsVoice = voice || channel.style_dna?.tts_voice || 'af_sarah'
    const ttsSpeed = speed || channel.style_dna?.tts_speed || 1.0

    const results: Array<{
      segmentIndex: number
      outputPath: string
      status: string
    }> = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const outputPath = `./renders/tts_${episodeId}_seg${i}_${Date.now()}.wav`

      try {
        await exec('npx', [
          'hyperframes',
          'tts',
          segment.text,
          '--voice',
          ttsVoice,
          '--speed',
          String(ttsSpeed),
          '--output',
          outputPath,
        ], {
          cwd: process.cwd(),
          env: process.env,
        })

        results.push({ segmentIndex: i, outputPath, status: 'complete' })
      } catch (err: unknown) {
        results.push({
          segmentIndex: i,
          outputPath: '',
          status: 'failed',
        })
        console.error(`TTS failed for segment ${i}:`, err)
      }
    }

    return c.json({
      message: 'TTS generation complete',
      results,
      voice: ttsVoice,
      speed: ttsSpeed,
    })
  } catch (err: unknown) {
    return c.json({
      error: 'Failed to generate TTS',
      message: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
