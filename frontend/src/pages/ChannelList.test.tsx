import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ChannelList } from '@/pages/ChannelList'
import { pb } from '@/lib/pocketbase'

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({ user: { id: 'test', email: 'test@test.com' }, authenticated: true }),
}))

const mockChannels = [
  {
    id: 'ch1', slug: 'tech-channel', name: 'Tech Channel', description: 'Tech stuff',
    style_dna: { primary_font: 'Inter', secondary_font: 'JetBrains Mono', color_palette: ['#1a1a2e'], title_position: 'center', lower_third_style: 'minimal', transition_type: 'crossfade', background_style: 'gradient', logo_url: '', intro_duration: 3, outro_duration: 5, resolution: '1920x1080', fps: 30 },
    intro_video: '', outro_video: '', system_prompt: 'Be techy',
    status: 'active', episode_count: 2, schedule: '', schedule_enabled: false,
    schedule_template: '', schedule_auto_advance: false,
    created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z',
    collectionId: 'ch_coll', collectionName: 'channels',
  },
]

const makeColl = (channels: any[] = []) => ({
  getList: vi.fn().mockResolvedValue({ items: channels, page: 1, perPage: 50, totalPages: 1, totalItems: channels.length }),
  create: vi.fn().mockResolvedValue({ id: 'new_ch' }),
  delete: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue({}),
  getFirstListItem: vi.fn().mockResolvedValue(mockChannels[0]),
})

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/channels']}>
      <Routes>
        <Route path="/channels" element={<ChannelList />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ChannelList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('lists channels', async () => {
    vi.mocked(pb.collection).mockReturnValue(makeColl(mockChannels) as any)
    renderPage()

    await waitFor(() => screen.getByText('Tech Channel'), { timeout: 3000 })
    expect(screen.getByText('Tech Channel')).toBeTruthy()
  })

  it('creates channel on submit', async () => {
    const coll = makeColl([])
    vi.mocked(pb.collection).mockReturnValue(coll as any)
    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /new channel/i }), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: /new channel/i }))

    await waitFor(() => screen.getByLabelText(/name/i), { timeout: 1000 })
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Channel' } })
    fireEvent.change(screen.getByLabelText(/system prompt/i), { target: { value: 'Test prompt' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(coll.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Channel',
        system_prompt: 'Test prompt',
        status: 'active',
      }))
    })
  })
})
