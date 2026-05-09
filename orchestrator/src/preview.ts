/**
 * HyperFrames Preview Server Manager.
 * Starts/stops a per-episode preview server on a dedicated port.
 * Only one preview server active at a time (queue-based).
 */
import { spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { config } from './config'

interface PreviewServer {
  episodeId: string
  process: ChildProcess
  port: number
  startTime: number
}

let activePreview: PreviewServer | null = null

const HTTP_SERVER_BIN = path.resolve(__dirname, '..', 'node_modules', '.bin', 'http-server')

export async function startPreview(episodeId: string, episodeDir: string): Promise<{ url: string; port: number }> {
  // Stop any existing preview
  if (activePreview) {
    await stopPreview(activePreview.episodeId)
  }

  const port = config.HYPERFRAMES_PORT

  // Ensure episode directory exists
  const absoluteDir = path.isAbsolute(episodeDir) ? episodeDir : path.resolve(process.cwd(), episodeDir)
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true })
    console.log(`[preview] Created missing episode directory: ${absoluteDir}`)
  }

  // Spawn http-server (without -s flag so we can detect startup)
  const child = spawn(HTTP_SERVER_BIN, [
    absoluteDir,
    '-p', String(port),
    '-c-1', // no cache for hot-reload
    '--cors',
  ], {
    cwd: absoluteDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })

  return new Promise((resolve, reject) => {
    let settled = false

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(new Error(`Failed to start preview server: ${err.message}`))
      }
    })

    child.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`[preview] ${output.trim().split('\n')[0]}`)
      if (output.includes('Starting up http-server') || output.includes('Available on')) {
        if (!settled) {
          settled = true
          const url = `http://localhost:${port}`
          activePreview = { episodeId, process: child, port, startTime: Date.now() }
          console.log(`[preview] Server running for episode ${episodeId} at ${url}`)
          resolve({ url, port })
        }
      }
    })

    child.stderr?.on('data', (data) => {
      const output = data.toString()
      if (output.includes('EADDRINUSE') || output.includes('already in use')) {
        if (!settled) {
          settled = true
          reject(new Error(`Port ${port} is already in use.`))
          child.kill()
        }
      } else if (output.trim()) {
        console.log(`[preview] stderr: ${output.trim()}`)
      }
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!settled) {
        settled = true
        if (child.exitCode === null && !child.killed) {
          const url = `http://localhost:${port}`
          activePreview = { episodeId, process: child, port, startTime: Date.now() }
          console.log(`[preview] Timeout fallback: server running for episode ${episodeId} at ${url}`)
          resolve({ url, port })
        } else {
          reject(new Error(`Preview server failed to start (exit code: ${child.exitCode}).`))
        }
      }
    }, 10_000)

    child.on('exit', (code) => {
      console.log(`[preview] Server for episode ${episodeId} exited with code ${code}`)
      if (activePreview?.episodeId === episodeId) {
        activePreview = null
      }
    })
  })
}

export async function stopPreview(episodeId?: string): Promise<void> {
  if (!activePreview) return
  if (episodeId && activePreview.episodeId !== episodeId) return

  const prev = activePreview
  activePreview = null

  return new Promise((resolve) => {
    try {
      prev.process.kill('SIGTERM')
      setTimeout(() => {
        try { prev.process.kill('SIGKILL') } catch { /* already dead */ }
      }, 3000)
      prev.process.on('exit', () => resolve())
      setTimeout(resolve, 5000)
    } catch {
      resolve()
    }
  })
}

export function getActivePreview(): { episodeId: string; port: number; url: string } | null {
  if (!activePreview) return null
  return {
    episodeId: activePreview.episodeId,
    port: activePreview.port,
    url: `http://localhost:${activePreview.port}`,
  }
}

export function isPreviewActive(episodeId: string): boolean {
  return activePreview?.episodeId === episodeId
}
