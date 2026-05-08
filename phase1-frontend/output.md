# Phase 1 — Frontend Scaffold

**Date:** 2026-05-08
**Status:** ✅ Complete

## Build

```
vite v8.0.11
✓ built in 530ms
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-uElwTzu3.css   17.03 kB │ gzip:   4.31 kB
dist/assets/index-B-J-K8uK.js   393.52 kB │ gzip: 123.30 kB
```

## Project Structure

```
frontend/
├── index.html
├── .env                          → VITE_PB_URL=http://127.0.0.1:8090
├── package.json
├── tailwind.config.js            → content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
├── postcss.config.js
├── vite.config.ts                → @ alias to src/
├── tsconfig.app.json             → path aliases
├── src/
│   ├── main.tsx                  → React entry, imports index.css
│   ├── App.tsx                   → HashRouter + 10 routes + AuthProvider
│   ├── index.css                 → @tailwind directives + dark theme CSS vars
│   ├── types.ts                  → 14 TypeScript interfaces (8 collections + embedded types)
│   ├── lib/
│   │   ├── pocketbase.ts         → pb singleton, login/logout/isAuthenticated/getAuthUser
│   │   └── utils.ts              → cn() helper (clsx + tailwind-merge)
│   ├── contexts/
│   │   └── AuthContext.tsx       → AuthProvider + useAuth hook
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx        → cva variants (default/destructive/outline/secondary/ghost/link)
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx         → cva variants (default/secondary/destructive/outline)
│   │   │   ├── card.tsx          → Card/Header/Footer/Title/Description/Content
│   │   │   ├── select.tsx        → Radix Select wrapper
│   │   │   ├── dialog.tsx        → Radix Dialog wrapper
│   │   │   ├── label.tsx         → Radix Label wrapper
│   │   │   └── table.tsx         → Table/Header/Body/Footer/Head/Row/Cell
│   │   └── layout/
│   │       └── AppLayout.tsx     → Sidebar (dark zinc-950) + Main (zinc-900/50) + User menu
│   └── pages/
│       ├── Dashboard.tsx         → Stats cards, activity placeholder
│       ├── ChannelList.tsx       → Channel grid placeholder
│       ├── ChannelDetail.tsx     → Channel stats, episodes placeholder
│       ├── ChannelSchedule.tsx   → Stub
│       ├── ChannelTemplates.tsx  → Stub
│       ├── NewEpisode.tsx        → Template picker placeholder
│       ├── EpisodeWorkspace.tsx  → Pipeline stepper visualization
│       ├── PersonalityList.tsx   → Stub
│       ├── MediaLibrary.tsx      → Stub
│       └── Settings.tsx          → Stub
```

## Routes

| Route | Component | Status |
|---|---|---|
| `/` | Dashboard | Placeholder with stat cards |
| `/channels` | ChannelList | Placeholder |
| `/channels/:slug` | ChannelDetail | Stats + episodes list |
| `/channels/:slug/schedule` | ChannelSchedule | Stub |
| `/channels/:slug/templates` | ChannelTemplates | Stub |
| `/channels/:slug/new` | NewEpisode | Template picker |
| `/episodes/:id` | EpisodeWorkspace | Pipeline stepper |
| `/personalities` | PersonalityList | Stub |
| `/media-library` | MediaLibrary | Stub |
| `/settings` | Settings | Stub |

## TypeScript Types (8 collections)

1. **Channel** + StyleDNA (embedded)
2. **Episode** + FeedbackEntry (embedded) + EpisodeMetadata (embedded)
3. **Block**
4. **Personality** + VoiceProfile (embedded)
5. **ResearchResult** + ResearchFinding (embedded)
6. **Script** + ScriptSegment (embedded)
7. **MediaLibrary**
8. **EpisodeTemplate**

Plus: AuthUser, PocketBaseResponse<T>

## Dependencies Installed

- tailwindcss@3, postcss, autoprefixer
- @radix-ui/react-dialog, dropdown-menu, select, separator, slot, toast, tooltip, label
- clsx, tailwind-merge
- pocketbase
- react-router-dom
- lucide-react
- class-variance-authority
- tslib (for react-remove-scroll)
- @types/node (for vite.config.ts path alias)

## Notes

- HashRouter used (client-side only, no SSR)
- Dark theme with zinc/slate palette throughout
- Sidebar: zinc-950, Main area: zinc-900/50
- Path alias `@/` resolves to `src/`
- PB autoRefresh enabled
- Shadcn-compatible component API
