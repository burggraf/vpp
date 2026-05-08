import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { Dashboard } from './pages/Dashboard'
import { ChannelList } from './pages/ChannelList'
import { ChannelDetail } from './pages/ChannelDetail'
import { ChannelSchedule } from './pages/ChannelSchedule'
import { ChannelTemplates } from './pages/ChannelTemplates'
import { NewEpisode } from './pages/NewEpisode'
import { EpisodeWorkspace } from './pages/EpisodeWorkspace'
import { ResearchPage } from './pages/ResearchPage'
import { PersonalityList } from './pages/PersonalityList'
import { PersonalityDetail } from './pages/PersonalityDetail'
import { MediaLibrary } from './pages/MediaLibrary'
import { ScriptPage } from './pages/ScriptPage'
import { Settings } from './pages/Settings'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/channels" element={<ChannelList />} />
              <Route path="/channels/:slug" element={<ChannelDetail />} />
              <Route path="/channels/:slug/schedule" element={<ChannelSchedule />} />
              <Route path="/channels/:slug/templates" element={<ChannelTemplates />} />
              <Route path="/channels/:slug/new" element={<NewEpisode />} />
              <Route path="/episodes/:id" element={<EpisodeWorkspace />} />
              <Route path="/episodes/:id/research" element={<ResearchPage />} />
              <Route path="/episodes/:id/script" element={<ScriptPage />} />
              <Route path="/personalities" element={<PersonalityList />} />
              <Route path="/personalities/:slug" element={<PersonalityDetail />} />
              <Route path="/media-library" element={<MediaLibrary />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
