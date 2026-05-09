import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackPanel } from './FeedbackPanel'
import * as orchestrator from '@/lib/orchestrator'

vi.mock('@/lib/orchestrator', () => ({
  submitFeedback: vi.fn(),
  getFeedbackLog: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

// Mock scrollIntoView (not available in jsdom)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterAll(() => {
  vi.restoreAllMocks()
})

const mockBlocks = [
  { id: 'block-1', block_type: 'intro', order: 1, script: 'Intro script', duration: 5, composition_src: 'intro.html', status: 'generated', episode: 'ep-1', start_time: 0, track_index: 0, variables: {}, assets: [], created: '', updated: '', collectionId: '', collectionName: '' },
  { id: 'block-2', block_type: 'content', order: 2, script: 'Content script', duration: 30, composition_src: 'content-1.html', status: 'generated', episode: 'ep-1', start_time: 5, track_index: 0, variables: {}, assets: [], created: '', updated: '', collectionId: '', collectionName: '' },
]

describe('FeedbackPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no feedback', async () => {
    vi.mocked(orchestrator.getFeedbackLog).mockResolvedValue({ feedback_log: [] })

    render(<FeedbackPanel episodeId="ep-1" />)

    await waitFor(() => {
      expect(screen.getByText('No feedback yet')).toBeTruthy()
    })
  })

  it('displays feedback log entries', async () => {
    const mockLog = {
      feedback_log: [
        { iteration: 1, feedback: 'Make the title bigger', timestamp: '2024-01-01T00:00:00Z', agent_response: 'Updated title font size', target_block: null },
      ],
    }
    vi.mocked(orchestrator.getFeedbackLog).mockResolvedValue(mockLog)

    render(<FeedbackPanel episodeId="ep-1" />)

    await waitFor(() => {
      expect(screen.getByText('Make the title bigger')).toBeTruthy()
      expect(screen.getByText('Updated title font size')).toBeTruthy()
    })
  })

  it('shows iteration count in header', async () => {
    const mockLog = {
      feedback_log: [
        { iteration: 1, feedback: 'First', timestamp: '2024-01-01T00:00:00Z', agent_response: 'Done', target_block: null },
        { iteration: 2, feedback: 'Second', timestamp: '2024-01-01T00:01:00Z', agent_response: 'Done', target_block: null },
      ],
    }
    vi.mocked(orchestrator.getFeedbackLog).mockResolvedValue(mockLog)

    render(<FeedbackPanel episodeId="ep-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 iterations')).toBeTruthy()
    })
  })

  it('sends feedback when submitted', async () => {
    vi.mocked(orchestrator.getFeedbackLog).mockResolvedValue({ feedback_log: [] })
    vi.mocked(orchestrator.submitFeedback).mockResolvedValue({
      iteration: 1,
      feedback: 'Test feedback',
      agent_response: 'Done',
    })

    render(<FeedbackPanel episodeId="ep-1" />)

    const textarea = await screen.findByPlaceholderText(/Describe changes/)
    fireEvent.change(textarea, { target: { value: 'Test feedback' } })

    // Get the send button (last button in the component)
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(orchestrator.submitFeedback).toHaveBeenCalledWith('ep-1', 'Test feedback', undefined)
    })
  })

  it('shows block selector when blocks provided', async () => {
    vi.mocked(orchestrator.getFeedbackLog).mockResolvedValue({ feedback_log: [] })

    render(<FeedbackPanel episodeId="ep-1" blocks={mockBlocks} />)

    // Should show the block selector trigger
    await waitFor(() => {
      expect(screen.getByText('All blocks')).toBeTruthy()
    })
  })
})
