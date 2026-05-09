import { Hono } from 'hono'
import { queueManager } from '../media/queue'

export const queueRoutes = new Hono()

// Get queue status
queueRoutes.get('/queue', async (c) => {
  return c.json(queueManager.getStatus())
})

// Add episode to queue
queueRoutes.post('/queue', async (c) => {
  const body = await c.req.json()
  const { episodeId, priority } = body
  if (!episodeId) {
    return c.json({ error: 'episodeId is required' }, 400)
  }

  queueManager.addToQueue(episodeId, priority || 'normal')
  return c.json({
    message: 'Added to queue',
    position: queueManager.getQueue().length + (queueManager.getActive() ? 1 : 0),
    queue: queueManager.getStatus(),
  })
})

// Remove episode from queue
queueRoutes.delete('/queue/:episodeId', async (c) => {
  const episodeId = c.req.param('episodeId')
  queueManager.removeFromQueue(episodeId)
  return c.json({ message: 'Removed from queue', queue: queueManager.getStatus() })
})

// Process next in queue
queueRoutes.post('/queue/process', async (c) => {
  const next = queueManager.processNext()
  if (next) {
    return c.json({ message: 'Processing next', active: next, queue: queueManager.getStatus() })
  }
  return c.json({ message: 'Queue empty or already processing', queue: queueManager.getStatus() })
})

// Complete active episode
queueRoutes.post('/queue/complete', async (c) => {
  queueManager.completeActive()
  return c.json({ message: 'Active completed', queue: queueManager.getStatus() })
})
