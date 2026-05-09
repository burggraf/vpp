// Polyfill ResizeObserver before any imports
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as any).ResizeObserver = ResizeObserverMock
}

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { NewEpisode } from '@/pages/NewEpisode'
import { pb } from '@/lib/pocketbase'

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/lib/orchestrator', () => ({
  startEpisodeGeneration: vi.fn(() => ({ abort: vi.fn() })),
}))

const mockChannel = {
  id: 'ch1', slug: 'dev-channel', name: 'Dev Channel', description: '',
  style_dna: {}, intro_video: '', outro_video: '', system_prompt: '',
  status: 'active', episode_count: 3, schedule: '', schedule_enabled: false,
  schedule_template: '', schedule_auto_advance: false,
  created: '2026-01-01', updated: '2026-01-01',
  collectionId: 'ch_coll', collectionName: 'channels',
}

const mockTemplates = [
  {
    id: 'tpl1', slug: 'regular', name: 'Regular Episode', channel: 'ch1',
    description: 'Weekly format', block_structure: [{ type: 'intro' }],
    composition_files: ['intro.html'], default_personality: '',
    default_research_depth: { queries: 3, timeframe: '1 week' },
    default_duration: 300, variables: {}, usage_count: 5,
    status: 'active', created: '2026-01-01', updated: '2026-01-01',
    collectionId: 'tpl_coll', collectionName: 'episode_templates', source_episode: '',
  },
]

const makeColl = (templates: any[] = []) => ({
  getFirstListItem: vi.fn().mockResolvedValue(mockChannel),
  getList: vi.fn().mockResolvedValue({ items: templates, page: 1, perPage: 50, totalPages: 1, totalItems: templates.length }),
  create: vi.fn().mockResolvedValue({ id: 'ep_new' }),
  update: vi.fn().mockResolvedValue({}),
})

const renderPage = (initialEntries = ['/channels/dev-channel/new']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/channels/:slug/new" element={<NewEpisode />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NewEpisode Blueprint', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('loads channel and templates', async () => {
    vi.mocked(pb.collection).mockReturnValue(makeColl(mockTemplates) as any)

    renderPage()

    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })
    expect(screen.getByText('Channel: Dev Channel')).toBeTruthy()
    // Template name appears in the template selector card
    expect(screen.getAllByText('Regular Episode').length).toBeGreaterThan(0)
  })

  it('shows all generation sections', async () => {
    vi.mocked(pb.collection).mockReturnValue(makeColl([]) as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    expect(screen.getByText('Research')).toBeTruthy()
    expect(screen.getByText('Script')).toBeTruthy()
    expect(screen.getByText('TTS / Narration')).toBeTruthy()
    expect(screen.getByText('Visuals / Compositions')).toBeTruthy()
    expect(screen.getByText('Background Music')).toBeTruthy()
    expect(screen.getByText('Intro')).toBeTruthy()
    expect(screen.getByText('Outro')).toBeTruthy()
  })

  it('disables generate until topic entered', async () => {
    vi.mocked(pb.collection).mockReturnValue(makeColl([]) as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    const btn = screen.getByRole('button', { name: /generate episode/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/topic \/ prompt/i), { target: { value: 'AI news this week' } })
    await waitFor(() => {
      expect((screen.getByRole('button', { name: /generate episode/i }) as HTMLButtonElement).disabled).toBe(false)
    })
  })

  it('creates episode with generating status on submit', async () => {
    const coll = makeColl([])
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    fireEvent.change(screen.getByLabelText(/topic \/ prompt/i), { target: { value: 'AI news this week' } })
    fireEvent.click(screen.getByRole('button', { name: /generate episode/i }))

    await waitFor(() => {
      expect(coll.create).toHaveBeenCalledWith(expect.objectContaining({
        channel: 'ch1',
        topic: 'AI news this week',
        status: 'generating',
      }))
    })
  })

  it('auto-generates title from topic when title is blank', async () => {
    const coll = makeColl([])
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    fireEvent.change(screen.getByLabelText(/topic \/ prompt/i), { target: { value: 'AI news this week' } })
    fireEvent.click(screen.getByRole('button', { name: /generate episode/i }))

    await waitFor(() => {
      const callArgs = coll.create.mock.calls[0][0]
      expect(callArgs.title).toBe('AI news this week')
      expect(callArgs.slug).toBe('ai-news-this-week')
    })
  })

  it('includes template when selected', async () => {
    const coll = makeColl(mockTemplates)
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    // Find and click the template card (button with template name)
    const allTexts = screen.getAllByText('Regular Episode')
    fireEvent.click(allTexts[allTexts.length - 1])

    // Enter topic
    fireEvent.change(screen.getByLabelText(/topic \/ prompt/i), { target: { value: 'T' } })
    fireEvent.click(screen.getByRole('button', { name: /generate episode/i }))

    await waitFor(() => {
      expect(coll.create).toHaveBeenCalled()
      const callArgs = coll.create.mock.calls[0][0]
      expect(callArgs.template).toBe('tpl1')
    })
  })

  it('toggles sections via checkboxes', async () => {
    vi.mocked(pb.collection).mockReturnValue(makeColl([]) as any)

    renderPage()
    await waitFor(() => screen.getByText('Episode Blueprint'), { timeout: 3000 })

    // All sections should be visible
    expect(screen.getByText('Research')).toBeTruthy()
    expect(screen.getByText('TTS / Narration')).toBeTruthy()

    // Click "None" to deselect all
    fireEvent.click(screen.getByText('None'))

    // Sections should still be visible (just unchecked)
    expect(screen.getByText('Research')).toBeTruthy()
  })
})
