import { describe, expect, test } from 'vitest'

describe('orchestrator client', () => {
  test('exports all API functions', async () => {
    const orchestrator = await import('@/lib/orchestrator')
    
    // Research
    expect(orchestrator.startResearch).toBeTypeOf('function')
    expect(orchestrator.getResearchResults).toBeTypeOf('function')
    expect(orchestrator.updateResearch).toBeTypeOf('function')
    
    // Personality
    expect(orchestrator.listPersonalities).toBeTypeOf('function')
    expect(orchestrator.getPersonalityBySlug).toBeTypeOf('function')
    expect(orchestrator.createPersonality).toBeTypeOf('function')
    expect(orchestrator.updatePersonality).toBeTypeOf('function')
    expect(orchestrator.deletePersonality).toBeTypeOf('function')
    expect(orchestrator.trainPersonality).toBeTypeOf('function')
    expect(orchestrator.validatePersonality).toBeTypeOf('function')
    
    // Script
    expect(orchestrator.generateScript).toBeTypeOf('function')
    expect(orchestrator.reviseScript).toBeTypeOf('function')
    expect(orchestrator.approveScript).toBeTypeOf('function')
    expect(orchestrator.getScript).toBeTypeOf('function')
    expect(orchestrator.listScripts).toBeTypeOf('function')
    expect(orchestrator.updateScript).toBeTypeOf('function')
    
    // TTS
    expect(orchestrator.listTTSVoices).toBeTypeOf('function')
    expect(orchestrator.previewTTS).toBeTypeOf('function')
    expect(orchestrator.generateTTS).toBeTypeOf('function')
  })
})
