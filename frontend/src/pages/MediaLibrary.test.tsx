import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MediaLibrary } from './MediaLibrary'

// Mock PocketBase
const mockItems = [
  {
    id: '1',
    collectionId: 'abc',
    collectionName: 'media_library',
    name: 'Test Image',
    slug: 'test-image',
    media_type: 'image',
    category: 'background',
    tags: ['tech', 'modern'],
    file: 'test.jpg',
    file_url: '',
    duration: 0,
    dimensions: { width: 1920, height: 1080 },
    license: 'CC-BY',
    usage_count: 0,
    description: 'A test image',
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    collectionId: 'abc',
    collectionName: 'media_library',
    name: 'Music Track',
    slug: 'music-track',
    media_type: 'music',
    category: 'background-music',
    tags: ['upbeat'],
    file: '',
    file_url: 'https://example.com/music.mp3',
    duration: 120,
    dimensions: { width: 0, height: 0 },
    license: 'Public Domain',
    usage_count: 3,
    description: '',
    created: '2026-01-02T00:00:00Z',
    updated: '2026-01-02T00:00:00Z',
  },
]

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn().mockResolvedValue({
        items: mockItems,
        totalItems: 2,
        page: 1,
        perPage: 24,
        totalPages: 1,
      }),
      getOne: vi.fn().mockResolvedValue(mockItems[0]),
      create: vi.fn().mockResolvedValue({ id: 'new' }),
      update: vi.fn().mockResolvedValue(mockItems[0]),
      delete: vi.fn().mockResolvedValue(true),
    })),
    files: {
      getUrl: vi.fn().mockReturnValue('https://example.com/file.jpg'),
    },
    authStore: { isValid: true, model: null },
  },
}))

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  )
}

describe('MediaLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      expect(screen.getByText('Media Library')).toBeTruthy()
    })
  })

  it('shows upload button', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload/i })).toBeTruthy()
    })
  })

  it('displays media items in grid', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeTruthy()
      expect(screen.getByText('Music Track')).toBeTruthy()
    })
  })

  it('shows media type badges', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      expect(screen.getByText('image')).toBeTruthy()
      expect(screen.getByText('music')).toBeTruthy()
    })
  })

  it('shows usage count for used items', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      expect(screen.getByText('3 uses')).toBeTruthy()
    })
  })

  it('filters by search term', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search by name or tags/i)
      fireEvent.change(searchInput, { target: { value: 'Music' } })
    })
    // Search triggers re-filter on client side
    await waitFor(() => {
      // Music Track still visible after filter
      expect(screen.getByText('Music Track')).toBeTruthy()
    })
  })

  it('shows empty state when no items match', async () => {
    renderWithRouter(<MediaLibrary />)
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search by name or tags/i)
      fireEvent.change(searchInput, { target: { value: 'nonexistent-xyz' } })
    })
    await waitFor(() => {
      expect(screen.getByText('No media items found')).toBeTruthy()
    })
  })
})
