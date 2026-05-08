import { describe, expect, test } from 'bun:test'

describe('config', () => {
  test('loads with defaults', async () => {
    // Test that config module loads without throwing
    const { config } = await import('../config')
    expect(config.PB_URL).toBeString()
    expect(config.ORCHESTRATOR_PORT).toBeNumber()
    expect(config.HYPERFRAMES_PORT).toBeNumber()
  })

  test('PB_URL is valid URL', async () => {
    const { config } = await import('../config')
    expect(() => new URL(config.PB_URL)).not.toThrow()
  })

  test('port defaults to 3001', async () => {
    const { config } = await import('../config')
    expect(config.ORCHESTRATOR_PORT).toBe(3001)
  })
})
