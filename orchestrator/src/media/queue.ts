/**
 * Queue Manager — manages episode generation queue.
 * One episode at a time, with FIFO ordering.
 */

interface QueueEntry {
  episodeId: string
  addedAt: number
  priority: 'normal' | 'high'
}

class QueueManager {
  private queue: QueueEntry[] = []
  private active: string | null = null

  addToQueue(episodeId: string, priority: 'normal' | 'high' = 'normal') {
    // Don't add duplicates
    if (this.queue.find((e) => e.episodeId === episodeId)) return
    if (this.active === episodeId) return

    const entry: QueueEntry = { episodeId, addedAt: Date.now(), priority }
    // High priority entries go to front
    if (priority === 'high') {
      const normalIdx = this.queue.findIndex((e) => e.priority === 'normal')
      if (normalIdx === -1) {
        this.queue.push(entry)
      } else {
        this.queue.splice(normalIdx, 0, entry)
      }
    } else {
      this.queue.push(entry)
    }
  }

  removeFromQueue(episodeId: string) {
    this.queue = this.queue.filter((e) => e.episodeId !== episodeId)
  }

  processNext(): string | null {
    if (this.active) return null
    const next = this.queue.shift()
    if (next) {
      this.active = next.episodeId
      return next.episodeId
    }
    return null
  }

  completeActive() {
    this.active = null
  }

  getActive(): string | null {
    return this.active
  }

  getQueue(): QueueEntry[] {
    return [...this.queue]
  }

  getStatus() {
    return {
      active: this.active,
      queue: this.queue,
      totalWaiting: this.queue.length,
    }
  }

  isActive(episodeId: string): boolean {
    return this.active === episodeId
  }

  isInQueue(episodeId: string): boolean {
    return this.queue.some((e) => e.episodeId === episodeId)
  }
}

export const queueManager = new QueueManager()
