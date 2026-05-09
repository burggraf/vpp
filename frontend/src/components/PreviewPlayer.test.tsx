import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PreviewPlayer } from './PreviewPlayer'
import * as orchestrator from '@/lib/orchestrator'

vi.mock('@/lib/orchestrator', () => ({
  startPreview: vi.fn(),
  stopPreview: vi.fn(),
  getPreviewStatus: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

describe('PreviewPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows stopped state initially', () => {
    vi.mocked(orchestrator.getPreviewStatus).mockResolvedValue({ active: false })

    render(<PreviewPlayer episodeId="ep-1" />)

    expect(screen.getByText('Preview server is stopped')).toBeTruthy()
    expect(screen.getByText('Start Preview')).toBeTruthy()
  })

  it('shows starting state when start clicked', async () => {
    vi.mocked(orchestrator.getPreviewStatus).mockResolvedValue({ active: false })
    vi.mocked(orchestrator.startPreview).mockImplementation(
      () => new Promise(() => {}) // Never resolves — keeps it in starting state
    )

    render(<PreviewPlayer episodeId="ep-1" />)

    fireEvent.click(screen.getByText('Start Preview'))

    await waitFor(() => {
      expect(screen.getByText(/Starting preview server/)).toBeTruthy()
    })
  })

  it('shows error state on failure', async () => {
    vi.mocked(orchestrator.getPreviewStatus).mockResolvedValue({ active: false })
    vi.mocked(orchestrator.startPreview).mockRejectedValue(new Error('Port in use'))

    render(<PreviewPlayer episodeId="ep-1" />)

    fireEvent.click(screen.getByText('Start Preview'))

    await waitFor(() => {
      expect(screen.getByText('Port in use')).toBeTruthy()
    })
  })

  it('detects active preview on mount', async () => {
    vi.mocked(orchestrator.getPreviewStatus).mockResolvedValue({
      active: true,
      episodeId: 'ep-1',
      url: 'http://localhost:4000',
    })

    render(<PreviewPlayer episodeId="ep-1" />)

    // Should show live badge when running
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy()
    })
  })

  it('calls onStatusChange callback', async () => {
    const onStatusChange = vi.fn()
    vi.mocked(orchestrator.getPreviewStatus).mockResolvedValue({ active: false })
    vi.mocked(orchestrator.startPreview).mockResolvedValue({
      url: 'http://localhost:4000',
      port: 4000,
    })

    render(<PreviewPlayer episodeId="ep-1" onStatusChange={onStatusChange} />)

    fireEvent.click(screen.getByText('Start Preview'))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('starting')
    })
  })
})
