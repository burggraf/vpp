import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { NewEpisode } from '@/pages/NewEpisode'
import { pb } from '@/lib/pocketbase'

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
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

const renderPage = (initialEntries = ['/channels/dev-channel/new']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/channels/:slug/new" element={<NewEpisode />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NewEpisode', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('loads channel and templates', async () => {
    const coll = {
      getFirstListItem: vi.fn().mockResolvedValue(mockChannel),
      getList: vi.fn().mockResolvedValue({ items: mockTemplates, page: 1, perPage: 50, totalPages: 1, totalItems: 1 }),
      create: vi.fn().mockResolvedValue({ id: 'ep_new' }),
      update: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()

    await waitFor(() => screen.getByText('New Episode'), { timeout: 3000 })
    expect(screen.getByText('Channel: Dev Channel')).toBeTruthy()
    expect(screen.getByText('Regular Episode')).toBeTruthy()
  })

  it('disables submit until title entered', async () => {
    const coll = {
      getFirstListItem: vi.fn().mockResolvedValue(mockChannel),
      getList: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 50, totalPages: 1, totalItems: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'ep_new' }),
      update: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('New Episode'), { timeout: 3000 })

    expect((screen.getByRole('button', { name: /create episode/i }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Test' } })
    await waitFor(() => expect((screen.getByRole('button', { name: /create episode/i }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('creates episode on submit', async () => {
    const coll = {
      getFirstListItem: vi.fn().mockResolvedValue(mockChannel),
      getList: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 50, totalPages: 1, totalItems: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'ep_new' }),
      update: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('New Episode'), { timeout: 3000 })

    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'My Episode' } })
    fireEvent.change(screen.getByLabelText('Topic / Prompt'), { target: { value: 'AI news' } })
    fireEvent.change(screen.getByLabelText('Episode Number'), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: /create episode/i }))

    await waitFor(() => {
      expect(coll.create).toHaveBeenCalledWith({
        channel: 'ch1', title: 'My Episode', slug: 'my-episode',
        topic: 'AI news', status: 'draft', feedback_log: [], metadata: {}, number: 42,
      })
    })
  })

  it('includes template when selected', async () => {
    const coll = {
      getFirstListItem: vi.fn().mockResolvedValue(mockChannel),
      getList: vi.fn().mockResolvedValue({ items: mockTemplates, page: 1, perPage: 50, totalPages: 1, totalItems: 1 }),
      create: vi.fn().mockResolvedValue({ id: 'ep_new' }),
      update: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(pb.collection).mockReturnValue(coll as any)

    renderPage()
    await waitFor(() => screen.getByText('New Episode'), { timeout: 3000 })

    fireEvent.click(screen.getByText('Regular Episode'))
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'T' } })
    fireEvent.click(screen.getByRole('button', { name: /create episode/i }))

    await waitFor(() => {
      expect(coll.create).toHaveBeenCalled()
      expect(coll.create.mock.calls[0][0].template).toBe('tpl1')
    })
  })
})
