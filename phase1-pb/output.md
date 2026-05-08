# Phase 1: PocketBase Setup

## Status: ✅ COMPLETE

## Summary

PocketBase 0.38.0 configured for VPP project.

## Files Created

| Path | Description |
|------|-------------|
| `pb/pocketbase` | PocketBase 0.38.0 binary (darwin arm64, ~29MB) |
| `pb/package.json` | Node.js project with pocketbase npm package |
| `pb/init-collections.js` | Creates all 8 collections with schemas + access rules |
| `pb/seed-data.js` | Seeds 1 channel, 1 personality, 1 episode, 1 template, 2 media items |

## Collections (8 total)

| # | Collection | Fields | Unique Constraints |
|---|-----------|--------|-------------------|
| 1 | `channels` | 13 fields (name, slug, description, style_dna, intro_video, outro_video, system_prompt, status, episode_count, schedule, schedule_enabled, schedule_auto_advance) | name, slug |
| 2 | `personalities` | 8 fields (name, slug, description, voice_profile, training_sources, system_prompt, sample_output, status) | name, slug |
| 3 | `episodes` | 15 fields (channel→channels, title, slug, number, topic, status, composition_path, preview_url, block_count, total_duration, feedback_log, video_file, video_url, thumbnail, metadata) | slug |
| 4 | `blocks` | 11 fields (episode→episodes, block_type, order, script, composition_src, start_time, duration, track_index, variables, assets, status) | — |
| 5 | `research_results` | 6 fields (episode→episodes, query, results, summary, sources, status) | — |
| 6 | `scripts` | 9 fields (episode→episodes, personality→personalities, research→research_results, content, segments, word_count, estimated_duration, status, revision_notes) | — |
| 7 | `media_library` | 12 fields (name, slug, media_type, category, tags, file, file_url, duration, dimensions, license, usage_count, description) | name, slug |
| 8 | `episode_templates` | 13 fields (name, slug, channel→channels, source_episode→episodes, description, block_structure, composition_files, default_personality→personalities, default_research_depth, default_duration, variables, usage_count, status) | slug |

## Access Rules

All collections: `listRule = viewRule = createRule = updateRule = deleteRule = "@request.auth.id != ''"`
No public read access.

## Usage

```bash
# Start PocketBase (manual)
cd pb && ./pocketbase serve

# Initialize collections (PB must be running)
cd pb && node init-collections.js

# Seed sample data (PB must be running, collections must exist)
cd pb && node seed-data.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PB_URL` | `http://127.0.0.1:8090` | PocketBase server URL |
| `PB_ADMIN_EMAIL` | `admin@vpp.local` | Admin email for authentication |
| `PB_ADMIN_PASSWORD` | `admin123456` | Admin password for authentication |

## Notes

- Relation collectionIds are auto-resolved after collection creation via `pb.collections.update()`
- Unique constraints applied post-creation via schema update
- Seed script skips media_library file entries (requires actual file upload)
- Each collection creation wrapped in try/catch — duplicates silently skipped
- Binary not started. No `pb_data/` directory created.
