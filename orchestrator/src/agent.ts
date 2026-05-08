import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
  type AgentSession,
  type AgentSessionEvent,
} from '@earendil-works/pi-coding-agent'
import type { SessionContext } from './types'

// Active sessions keyed by session ID
const activeSessions = new Map<string, { session: AgentSession; context: SessionContext }>()

/**
 * Create a base pi session with default config.
 */
async function createBaseSession(): Promise<AgentSession> {
  const authStorage = AuthStorage.create()
  const modelRegistry = ModelRegistry.create(authStorage)

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
  })

  return session
}

/**
 * Subscribe to session events and collect full text response.
 * Resolves on agent_end, rejects on error.
 */
export function collectResponse(session: AgentSession, timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullText = ''
    let completed = false

    const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
      // Collect streaming text
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        fullText += event.assistantMessageEvent.delta
      }

      // Detect completion
      if (event.type === 'agent_end') {
        if (!completed) {
          completed = true
          unsubscribe()
          resolve(fullText)
        }
      }

      // Detect errors
      if (event.type === 'tool_execution_end' && (event as { isError?: boolean }).isError) {
        // Don't reject on individual tool errors, only agent_end
      }
    })

    // Timeout safety
    setTimeout(() => {
      if (!completed) {
        completed = true
        unsubscribe()
        reject(new Error(`Session timed out after ${timeoutMs / 1000}s`))
      }
    }, timeoutMs)
  })
}

/**
 * Create a research session — web search tools enabled.
 */
export async function createResearchSession(
  context: SessionContext
): Promise<{ session: AgentSession; response: Promise<string> }> {
  const session = await createBaseSession()
  activeSessions.set(session.sessionId, { session, context })

  const response = collectResponse(session)

  return { session, response }
}

/**
 * Create a script generation session — personality context + research input.
 */
export async function createScriptSession(
  context: SessionContext,
  systemPrompt: string
): Promise<{ session: AgentSession; response: Promise<string> }> {
  const session = await createBaseSession()
  activeSessions.set(session.sessionId, { session, context })

  // Inject personality system prompt as context
  const response = collectResponse(session)

  return { session, response }
}

/**
 * Create a personality training session — analyze writing samples.
 */
export async function createPersonalityTrainSession(
  context: SessionContext
): Promise<{ session: AgentSession; response: Promise<string> }> {
  const session = await createBaseSession()
  activeSessions.set(session.sessionId, { session, context })

  const response = collectResponse(session)

  return { session, response }
}

/**
 * Create a personality validation session — generate sample output.
 */
export async function createPersonalityValidateSession(
  context: SessionContext,
  systemPrompt: string
): Promise<{ session: AgentSession; response: Promise<string> }> {
  const session = await createBaseSession()
  activeSessions.set(session.sessionId, { session, context })

  const response = collectResponse(session)

  return { session, response }
}

/**
 * Get active session by ID.
 */
export function getSession(sessionId: string) {
  return activeSessions.get(sessionId)
}

/**
 * Remove session from active map.
 */
export function removeSession(sessionId: string) {
  activeSessions.delete(sessionId)
}

/**
 * List all active sessions.
 */
export function listSessions() {
  return Array.from(activeSessions.entries()).map(([id, { context }]) => ({
    sessionId: id,
    context,
  }))
}
