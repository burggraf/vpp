/**
 * Quality Gate — validates episode compositions before preview/render.
 * Runs lint, asset, and duration checks.
 */
import { pbGetOne, pbList, pbUpdate } from '../pocketbase'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'

const exec = promisify(execFile)

export interface QualityCheck {
  name: string
  passed: boolean
  errors: string[]
  warnings: string[]
}

export interface QualityGateReport {
  passed: boolean
  checks: QualityCheck[]
  totalErrors: number
  totalWarnings: number
  timestamp: string
}

export async function runQualityGate(episodeId: string): Promise<QualityGateReport> {
  const episode = await pbGetOne('episodes', episodeId)
  const checks: QualityCheck[] = []

  // 1. HyperFrames lint
  const lintCheck = await runLintCheck(episodeId)
  checks.push(lintCheck)

  // 2. Asset validation
  const assetCheck = await runAssetCheck(episodeId)
  checks.push(assetCheck)

  // 3. Duration validation
  const durationCheck = await runDurationCheck(episodeId)
  checks.push(durationCheck)

  // 4. TTS validation
  const ttsCheck = await runTtsCheck(episodeId)
  checks.push(ttsCheck)

  const totalErrors = checks.reduce((sum, c) => sum + c.errors.length, 0)
  const totalWarnings = checks.reduce((sum, c) => sum + c.warnings.length, 0)

  const report: QualityGateReport = {
    passed: totalErrors === 0,
    checks,
    totalErrors,
    totalWarnings,
    timestamp: new Date().toISOString(),
  }

  // Save to episode metadata
  await pbUpdate('episodes', episodeId, {
    metadata: {
      ...(episode.metadata || {}),
      quality_gate: report,
    },
  })

  return report
}

async function runLintCheck(episodeId: string): Promise<QualityCheck> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const compDir = resolve(process.cwd(), 'compositions', episodeId)
    const { stdout, stderr } = await exec('npx', ['hyperframes', 'lint', compDir], {
      cwd: process.cwd(),
      timeout: 30000,
    })

    if (stderr) {
      const lines = stderr.split('\n').filter(Boolean)
      for (const line of lines) {
        if (line.includes('error') || line.includes('Error')) {
          errors.push(line.trim())
        } else {
          warnings.push(line.trim())
        }
      }
    }

    if (stdout) {
      const lines = stdout.split('\n').filter(Boolean)
      for (const line of lines) {
        if (line.includes('warning') || line.includes('Warning')) {
          warnings.push(line.trim())
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ENOENT') || msg.includes('not found')) {
      warnings.push('hyperframes not installed — skipping lint')
    } else {
      errors.push(`Lint failed: ${msg}`)
    }
  }

  return { name: 'hyperframes lint', passed: errors.length === 0, errors, warnings }
}

async function runAssetCheck(episodeId: string): Promise<QualityCheck> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const episode = await pbGetOne('episodes', episodeId)
    const blocks = await pbList('blocks', {
      filter: `episode="${episodeId}"`,
      sort: 'order',
    })

    // Check composition_src files exist
    for (const block of blocks.items || []) {
      if (block.composition_src) {
        const fullPath = resolve(process.cwd(), 'compositions', episodeId, block.composition_src.replace('compositions/', ''))
        try {
          await access(fullPath)
        } catch {
          errors.push(`Composition file not found: ${block.composition_src}`)
        }
      }
    }

    // Check TTS files referenced in metadata
    if (episode.metadata?.tts_files) {
      for (const ttsPath of episode.metadata.tts_files) {
        const fullPath = resolve(process.cwd(), ttsPath)
        try {
          await access(fullPath)
        } catch {
          warnings.push(`TTS file not found: ${ttsPath}`)
        }
      }
    }
  } catch (err: unknown) {
    errors.push(`Asset check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { name: 'asset validation', passed: errors.length === 0, errors, warnings }
}

async function runDurationCheck(episodeId: string): Promise<QualityCheck> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const episode = await pbGetOne('episodes', episodeId)
    const blocks = await pbList('blocks', {
      filter: `episode="${episodeId}"`,
      sort: 'order',
    })

    const compDuration = blocks.items?.reduce((sum: number, b: any) => {
      const end = (b.start_time || 0) + (b.duration || 0)
      return Math.max(sum, end)
    }, 0) || 0

    // Get script estimated duration
    const scripts = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
    })
    const scriptDuration = scripts.items?.[0]?.estimated_duration || 0

    if (scriptDuration > 0 && compDuration > 0) {
      const diff = Math.abs(compDuration - scriptDuration) / scriptDuration
      if (diff > 0.1) {
        warnings.push(
          `Duration mismatch: composition ${compDuration}s vs script ${scriptDuration}s (${(diff * 100).toFixed(0)}% difference)`
        )
      }
    }
  } catch (err: unknown) {
    errors.push(`Duration check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { name: 'duration validation', passed: errors.length === 0, errors, warnings }
}

async function runTtsCheck(episodeId: string): Promise<QualityCheck> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const scripts = await pbList('scripts', {
      filter: `episode="${episodeId}"`,
    })
    const script = scripts.items?.[0]
    if (!script) {
      warnings.push('No script found — skipping TTS check')
      return { name: 'TTS validation', passed: true, errors, warnings }
    }

    const segments = script.segments || []
    if (segments.length === 0) {
      warnings.push('Script has no segments — skipping TTS check')
      return { name: 'TTS validation', passed: true, errors, warnings }
    }

    // Check if TTS files exist for each segment
    for (let i = 0; i < segments.length; i++) {
      const ttsPath = `renders/tts_${episodeId}_seg${i}.wav`
      try {
        await access(resolve(process.cwd(), ttsPath))
      } catch {
        warnings.push(`TTS file missing for segment ${i}: ${ttsPath}`)
      }
    }
  } catch (err: unknown) {
    errors.push(`TTS check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { name: 'TTS validation', passed: errors.length === 0, errors, warnings }
}
