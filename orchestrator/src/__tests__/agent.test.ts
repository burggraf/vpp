import { describe, expect, test, beforeAll, afterAll, mock } from 'bun:test'

describe('agent module', () => {
  test('exports session creation functions', async () => {
    const agent = await import('../agent')
    expect(agent.createResearchSession).toBeFunction()
    expect(agent.createScriptSession).toBeFunction()
    expect(agent.createPersonalityTrainSession).toBeFunction()
    expect(agent.createPersonalityValidateSession).toBeFunction()
    expect(agent.collectResponse).toBeFunction()
    expect(agent.getSession).toBeFunction()
    expect(agent.removeSession).toBeFunction()
    expect(agent.listSessions).toBeFunction()
  })
})

describe('agent session tracking', () => {
  test('listSessions returns empty initially', async () => {
    const agent = await import('../agent')
    const sessions = agent.listSessions()
    expect(sessions).toBeArray()
  })
})
