/**
 * Block Generation Pipeline — creates hyperframes composition files for each block.
 * Uses pi SDK to generate composition HTML based on style DNA, script, media, and TTS.
 */
import { pbGetOne, pbList, pbCreate, pbUpdate } from '../pocketbase'
import { createBaseAgentSession, collectResponseWithEvents } from '../agent'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export interface GeneratedBlock {
  type: string
  order: number
  compositionSrc: string
  startTime: number
  duration: number
  trackIndex: number
  variables: Record<string, unknown>
  assets: string[]
}

export interface GenerationResult {
  blocks: GeneratedBlock[]
  compositionPath: string
  indexHtml: string
}

export async function generateBlocks(
  episodeId: string,
  options?: { skipExisting?: boolean }
): Promise<GenerationResult> {
  const episode = await pbGetOne('episodes', episodeId)
  const channel = await pbGetOne('channels', episode.channel)
  const styleDna = channel.style_dna || {}

  // Get approved script
  const scriptList = await pbList('scripts', {
    filter: `episode="${episodeId}"`,
  })
  if (!scriptList.items?.length) {
    throw new Error('No approved script found')
  }
  const script = scriptList.items[0]

  // Get existing blocks
  const blockList = await pbList('blocks', {
    filter: `episode="${episodeId}"`,
    sort: 'order',
  })
  const existingBlocks = blockList.items || []

  // Composition directory
  const compPath = `compositions/${channel.slug}/${episodeId}`
  const compDir = resolve(process.cwd(), compPath, 'compositions')

  // Get TTS file paths from script metadata
  const ttsFiles = script.segments?.map((seg: any, i: number) => ({
    index: i,
    path: seg.tts_path || `renders/tts_${episodeId}_seg${i}.wav`,
    text: seg.text || '',
  })) || []

  // Get selected media assets
  const selectedAssets = episode.metadata?.selected_assets || []
  const musicAsset = episode.metadata?.music_id ? await pbGetOne('media_library', episode.metadata.music_id) : null

  // Generate each block composition
  const blocks: GeneratedBlock[] = []
  let currentTime = 0
  let order = 0

  // Intro block
  order++
  const introHtml = generateIntroBlock(styleDna, channel)
  const introPath = `${compDir}/intro.html`
  await writeCompositionFile(introPath, introHtml)
  blocks.push({
    type: 'intro',
    order,
    compositionSrc: `compositions/intro.html`,
    startTime: 0,
    duration: styleDna.intro_duration || 3,
    trackIndex: 0,
    variables: { channel_name: channel.name },
    assets: [],
  })
  currentTime += styleDna.intro_duration || 3

  // Title block
  order++
  const titleHtml = generateTitleBlock(styleDna, episode)
  const titlePath = `${compDir}/title.html`
  await writeCompositionFile(titlePath, titleHtml)
  blocks.push({
    type: 'title',
    order,
    compositionSrc: `compositions/title.html`,
    startTime: currentTime,
    duration: 5,
    trackIndex: 0,
    variables: { episode_title: episode.title },
    assets: [],
  })
  currentTime += 5

  // Content blocks (one per script segment)
  const segments = script.segments || []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    order++

    const contentHtml = await generateContentBlockWithAI(
      styleDna,
      seg,
      ttsFiles[i],
      selectedAssets,
      i,
      segments.length
    )
    const contentPath = `${compDir}/content-${i + 1}.html`
    await writeCompositionFile(contentPath, contentHtml)

    const duration = seg.estimated_duration || Math.ceil((seg.text || '').split(/\s+/).length / 2.5)
    blocks.push({
      type: 'content',
      order,
      compositionSrc: `compositions/content-${i + 1}.html`,
      startTime: currentTime,
      duration,
      trackIndex: 0,
      variables: {
        segment_index: i,
        segment_text: (seg.text || '').substring(0, 200),
      },
      assets: [],
    })
    currentTime += duration
  }

  // Outro block
  order++
  const outroHtml = generateOutroBlock(styleDna, channel)
  const outroPath = `${compDir}/outro.html`
  await writeCompositionFile(outroPath, outroHtml)
  blocks.push({
    type: 'outro',
    order,
    compositionSrc: `compositions/outro.html`,
    startTime: currentTime,
    duration: styleDna.outro_duration || 3,
    trackIndex: 0,
    variables: { channel_name: channel.name },
    assets: [],
  })
  currentTime += styleDna.outro_duration || 3

  // Assemble index.html
  const indexHtml = assembleIndexHtml(blocks, styleDna, musicAsset)
  await writeCompositionFile(`${compPath}/index.html`, indexHtml)

  // Create/update block records
  for (const block of blocks) {
    const existing = existingBlocks.find((b: any) => b.order === block.order && b.block_type === block.type)
    if (existing) {
      await pbUpdate('blocks', existing.id, {
        composition_src: block.compositionSrc,
        start_time: block.startTime,
        duration: block.duration,
        track_index: block.trackIndex,
        variables: block.variables,
        assets: block.assets,
        status: 'generated',
      })
    } else {
      await pbCreate('blocks', {
        episode: episodeId,
        block_type: block.type,
        order: block.order,
        script: '',
        composition_src: block.compositionSrc,
        start_time: block.startTime,
        duration: block.duration,
        track_index: block.trackIndex,
        variables: block.variables,
        assets: block.assets,
        status: 'generated',
      })
    }
  }

  // Update episode
  await pbUpdate('episodes', episodeId, {
    composition_path: `${compPath}/index.html`,
    block_count: blocks.length,
    total_duration: currentTime,
    status: 'generating',
  })

  return { blocks, compositionPath: compPath, indexHtml }
}

async function writeCompositionFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
}

function generateIntroBlock(styleDna: any, channel: any): string {
  const fonts = styleDna.primary_font || 'Inter'
  const colors = styleDna.color_palette || ['#8B5CF6', '#6366F1', '#1E293B']
  const duration = styleDna.intro_duration || 3

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fonts}:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1920px; height: 1080px;
      background: linear-gradient(135deg, ${colors[2]}, ${colors[0]});
      font-family: '${fonts}', sans-serif;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .intro-container { text-align: center; }
    .channel-name {
      font-size: 72px; font-weight: 700; color: white;
      opacity: 0; transform: translateY(40px);
    }
    .tagline {
      font-size: 28px; color: rgba(255,255,255,0.7); margin-top: 16px;
      opacity: 0; transform: translateY(20px);
    }
  </style>
</head>
<body>
  <div class="intro-container">
    <div class="channel-name" data-composition-id="intro-title">${channel.name}</div>
    <div class="tagline" data-composition-id="intro-tagline">Welcome to the channel</div>
  </div>
  <script>
    window.__hfIntro = function() {
      const el = document.querySelector('[data-composition-id="intro-title"]');
      const tag = document.querySelector('[data-composition-id="intro-tagline"]');
      if (el) { el.style.transition = 'all 0.8s ease-out'; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
      if (tag) { setTimeout(() => { tag.style.transition = 'all 0.6s ease-out'; tag.style.opacity = '1'; tag.style.transform = 'translateY(0)'; }, 400); }
    };
    document.addEventListener('hf-seek', (e) => {
      const t = e.detail?.time ?? 0;
      if (t >= 0.5) { const el = document.querySelector('[data-composition-id="intro-title"]'); if (el) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; } }
      if (t >= 1) { const tag = document.querySelector('[data-composition-id="intro-tagline"]'); if (tag) { tag.style.opacity = '1'; tag.style.transform = 'translateY(0)'; } }
    });
  </script>
</body>
</html>`
}

function generateTitleBlock(styleDna: any, episode: any): string {
  const fonts = styleDna.primary_font || 'Inter'
  const colors = styleDna.color_palette || ['#8B5CF6', '#6366F1', '#1E293B']

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fonts}:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1920px; height: 1080px;
      background: ${colors[2]};
      font-family: '${fonts}', sans-serif;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .title-card { text-align: center; max-width: 1200px; padding: 40px; }
    .title-text {
      font-size: 64px; font-weight: 700; color: white;
      opacity: 0; transform: scale(0.9);
    }
    .accent-line {
      width: 120px; height: 4px; background: ${colors[0]};
      margin: 24px auto; opacity: 0; transform: scaleX(0);
    }
  </style>
</head>
<body>
  <div class="title-card">
    <div class="title-text" data-composition-id="title-text">${episode.title || 'Episode Title'}</div>
    <div class="accent-line" data-composition-id="title-accent"></div>
  </div>
  <script>
    document.addEventListener('hf-seek', (e) => {
      const t = e.detail?.time ?? 0;
      const title = document.querySelector('[data-composition-id="title-text"]');
      const accent = document.querySelector('[data-composition-id="title-accent"]');
      if (t >= 0.3 && title) { title.style.transition = 'all 0.6s ease-out'; title.style.opacity = '1'; title.style.transform = 'scale(1)'; }
      if (t >= 0.8 && accent) { accent.style.transition = 'all 0.4s ease-out'; accent.style.opacity = '1'; accent.style.transform = 'scaleX(1)'; }
    });
  </script>
</body>
</html>`
}

async function generateContentBlockWithAI(
  styleDna: any,
  segment: any,
  ttsFile: any,
  assets: any[],
  segmentIndex: number,
  totalSegments: number
): Promise<string> {
  const fonts = styleDna.primary_font || 'Inter'
  const colors = styleDna.color_palette || ['#8B5CF6', '#6366F1', '#1E293B']
  const text = segment.text || ''
  const duration = segment.estimated_duration || Math.ceil(text.split(/\s+/).length / 2.5)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fonts}:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1920px; height: 1080px;
      background: ${colors[2]};
      font-family: '${fonts}', sans-serif;
      overflow: hidden;
      position: relative;
    }
    .content-area {
      position: absolute; bottom: 80px; left: 120px; right: 120px;
      color: white;
    }
    .caption-text {
      font-size: 36px; line-height: 1.4;
      opacity: 0;
    }
    .word { display: inline-block; opacity: 0; transition: opacity 0.1s; }
    .word.active { opacity: 1; }
  </style>
</head>
<body>
  ${ttsFile ? `<audio src="${ttsFile.path}" preload="auto"></audio>` : ''}
  <div class="content-area">
    <div class="caption-text" data-composition-id="content-${segmentIndex}">
      ${text.split(' ').map((word: string, i: number) => `<span class="word" data-word-index="${i}">${word}</span>`).join(' ')}
    </div>
  </div>
  <script>
    (function() {
      const words = document.querySelectorAll('.word');
      const totalWords = words.length;
      document.addEventListener('hf-seek', (e) => {
        const t = e.detail?.time ?? 0;
        const progress = Math.min(1, t / ${duration});
        const activeIndex = Math.floor(progress * totalWords);
        words.forEach((w, i) => { w.classList.toggle('active', i <= activeIndex); });
      });
    })();
  </script>
</body>
</html>`
}

function generateOutroBlock(styleDna: any, channel: any): string {
  const fonts = styleDna.primary_font || 'Inter'
  const colors = styleDna.color_palette || ['#8B5CF6', '#6366F1', '#1E293B']

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fonts}:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1920px; height: 1080px;
      background: linear-gradient(135deg, ${colors[0]}, ${colors[2]});
      font-family: '${fonts}', sans-serif;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .outro-container { text-align: center; }
    .channel-name {
      font-size: 48px; font-weight: 700; color: white;
      opacity: 0;
    }
    .subscribe {
      font-size: 24px; color: rgba(255,255,255,0.6); margin-top: 16px;
      opacity: 0;
    }
  </style>
</head>
<body>
  <div class="outro-container">
    <div class="channel-name" data-composition-id="outro-title">${channel.name}</div>
    <div class="subscribe" data-composition-id="outro-subscribe">Thanks for watching</div>
  </div>
  <script>
    document.addEventListener('hf-seek', (e) => {
      const t = e.detail?.time ?? 0;
      const title = document.querySelector('[data-composition-id="outro-title"]');
      const sub = document.querySelector('[data-composition-id="outro-subscribe"]');
      if (t >= 0.5 && title) { title.style.transition = 'all 0.6s ease-out'; title.style.opacity = '1'; }
      if (t >= 1.2 && sub) { sub.style.transition = 'all 0.5s ease-out'; sub.style.opacity = '1'; }
    });
  </script>
</body>
</html>`
}

export function assembleIndexHtml(
  blocks: GeneratedBlock[],
  styleDna: any,
  musicAsset?: any
): string {
  const fonts = styleDna.primary_font || 'Inter'
  const totalDuration = blocks.reduce((sum, b) => Math.max(sum, b.startTime + b.duration), 0)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Episode Composition</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fonts}:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; font-family: '${fonts}', sans-serif; }
    .composition-root { position: relative; width: 1920px; height: 1080px; }
    [data-composition-src] { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; }
    [data-composition-src].active { display: block; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"><\/script>
</head>
<body>
  <div class="composition-root" data-composition-id="root">
${blocks.map((b) => `    <div data-composition-src="compositions/${b.compositionSrc}" data-composition-id="${b.type}-${b.order}" data-start="${b.startTime}" data-duration="${b.duration}" data-track-index="${b.trackIndex}"></div>`).join('\n')}
  </div>
  ${musicAsset ? `<audio id="bg-music" src="${musicAsset.file_url || ''}" loop preload="auto"></audio>` : ''}
  <script>
    (function() {
      const blocks = document.querySelectorAll('[data-composition-src]');
      let currentTime = 0;
      const totalDuration = ${totalDuration};

      function dispatchSeek(time) {
        document.dispatchEvent(new CustomEvent('hf-seek', { detail: { time } }));
        blocks.forEach(block => {
          const start = parseFloat(block.dataset.start);
          const duration = parseFloat(block.dataset.duration);
          block.classList.toggle('active', time >= start && time < start + duration);
        });
      }

      // Simulate timeline for preview
      let playing = false;
      let lastTimestamp = null;
      function tick(timestamp) {
        if (!playing) return;
        if (lastTimestamp) {
          currentTime += (timestamp - lastTimestamp) / 1000;
          if (currentTime >= totalDuration) currentTime = 0;
        }
        lastTimestamp = timestamp;
        dispatchSeek(currentTime);
        requestAnimationFrame(tick);
      }

      window.__hfPlay = function() { playing = true; lastTimestamp = null; requestAnimationFrame(tick); };
      window.__hfPause = function() { playing = false; };
      window.__hfSeek = function(t) { currentTime = t; dispatchSeek(t); };
      window.__hfDuration = totalDuration;
      window.__hfCurrentTime = function() { return currentTime; };

      // Initial state
      dispatchSeek(0);
    })();
  <\/script>
</body>
</html>`
}
