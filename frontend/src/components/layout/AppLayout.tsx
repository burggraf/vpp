import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Radio,
  RadioTower,
  Calendar,
  FileText,
  Plus,
  Clapperboard,
  Users,
  Image,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Channels', icon: Radio, href: '/channels' },
  { label: 'Personalities', icon: Users, href: '/personalities' },
  { label: 'Media Library', icon: Image, href: '/media-library' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logoutFn, authenticated } = useAuth()

  const handleLogout = () => {
    logoutFn()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-zinc-950 text-zinc-100">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-zinc-800 p-4">
          <RadioTower className="h-6 w-6 text-purple-400" />
          <span className="text-lg font-bold tracking-tight">VPP</span>
          <span className="text-xs text-zinc-500">Video Production Platform</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="border-t border-zinc-800 px-3 py-4">
          <Link
            to="/channels"
            className="flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Episode
          </Link>
        </div>

        {/* User Menu */}
        <div className="border-t border-zinc-800 px-3 py-3">
          {authenticated ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-800/50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <span className="flex-1 truncate text-left text-zinc-300">{user?.email}</span>
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={4}
                  className="z-50 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-800 p-1 shadow-lg"
                >
                  <DropdownMenu.Item
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-zinc-300 outline-none cursor-pointer hover:bg-zinc-700"
                    onSelect={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/50 transition-colors"
            >
              Not signed in
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-900/50">
        <div className="mx-auto max-w-7xl p-6"><Outlet /></div>
      </main>
    </div>
  )
}
