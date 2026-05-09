import { describe, it, expect } from 'vitest'
import { getPipelineStages } from './PipelineStepper'

describe('getPipelineStages', () => {
  it('shows all pending for draft episode', () => {
    const stages = getPipelineStages('draft')
    expect(stages[0].status).toBe('active')
    expect(stages[1].status).toBe('pending')
  })

  it('marks previous stages complete for preview status', () => {
    const stages = getPipelineStages('preview')
    // Research through Quality Gate should be complete
    expect(stages[0].status).toBe('complete') // research
    expect(stages[1].status).toBe('complete') // script
    expect(stages[2].status).toBe('complete') // tts
    expect(stages[3].status).toBe('complete') // media
    expect(stages[4].status).toBe('complete') // blocks
    expect(stages[5].status).toBe('complete') // quality
    expect(stages[6].status).toBe('active')  // preview
    expect(stages[7].status).toBe('pending') // render
  })

  it('marks render as active for complete status', () => {
    const stages = getPipelineStages('complete')
    // All stages before render are complete, render is active
    for (let i = 0; i < 7; i++) {
      expect(stages[i].status).toBe('complete')
    }
    expect(stages[7].status).toBe('active') // render
  })

  it('shows failed status for failed episodes', () => {
    const stages = getPipelineStages('failed')
    const failedStage = stages.find((s) => s.status === 'failed')
    expect(failedStage).toBeTruthy()
  })

  it('has correct 8-stage labels', () => {
    const stages = getPipelineStages('draft')
    expect(stages.length).toBe(8)
    expect(stages.map((s) => s.id)).toEqual([
      'research', 'script', 'tts', 'media', 'blocks', 'quality', 'preview', 'render',
    ])
  })

  it('handles unknown status gracefully', () => {
    const stages = getPipelineStages('unknown_status')
    expect(stages[0].status).toBe('active')
    expect(stages.length).toBe(8)
  })
})
