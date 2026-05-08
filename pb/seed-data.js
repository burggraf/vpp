const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@vpp.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password1234';

async function exists(pb, collection, field, value) {
  const items = await pb.collection(collection).getFullList(100);
  return items.find(i => i[field] === value);
}

async function seed() {
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✓ Authenticated\n');

  console.log('Seeding sample data...\n');

  // 1. Sample channel
  if (!await exists(pb, 'channels', 'slug', 'tech-deep-dive')) {
    const channel = await pb.collection('channels').create({
      name: 'Tech Deep Dive',
      slug: 'tech-deep-dive',
      description: 'A channel that goes deep on developer tools and frameworks.',
      style_dna: {
        primary_font: 'Inter',
        secondary_font: 'JetBrains Mono',
        color_palette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
        title_position: 'center',
        lower_third_style: 'minimal',
        transition_type: 'crossfade',
        background_style: 'gradient',
        logo_url: '',
        intro_duration: 3,
        outro_duration: 5,
        resolution: '1920x1080',
        fps: 30,
        tts_voice: 'am_adam',
        tts_speed: 1.0,
      },
      system_prompt: 'You are a tech explainer. Use clear, direct language. Focus on practical developer value. No fluff, no corporate speak.',
      status: 'active',
      episode_count: 0,
      schedule_enabled: false,
      schedule_auto_advance: false,
    });
    console.log(`  ✓ Created channel: ${channel.name} (${channel.id})`);
  } else {
    console.log('  - Channel already exists: tech-deep-dive');
  }

  // 2. Sample personality
  if (!await exists(pb, 'personalities', 'slug', 'dev-narrator')) {
    const personality = await pb.collection('personalities').create({
      name: 'Dev Narrator',
      slug: 'dev-narrator',
      description: 'Conversational tech explainer, slightly sarcastic, enthusiastic about new tools.',
      voice_profile: {
        tone: 'conversational, slightly sarcastic, enthusiastic about tech',
        pacing: 'fast, energetic',
        vocabulary: 'developer-focused, uses terms like "ship it", "prod", "DX"',
        avoid: ['corporate jargon', 'overly formal language', 'AI-sounding phrases'],
        catchphrases: ["let's dive in", "here's the thing"],
        sentence_style: 'short, punchy sentences. rhetorical questions. direct address ("you").',
        humor_level: 'light, self-deprecating tech humor',
      },
      system_prompt: 'Write as Dev Narrator: conversational, slightly sarcastic, enthusiastic. Short punchy sentences. Use rhetorical questions. Address the viewer directly. No corporate speak.',
      sample_output: "Hey, so here's the thing — a new framework just dropped and everyone's losing their minds. Let me break down why it actually matters for your daily work.",
      status: 'active',
    });
    console.log(`  ✓ Created personality: ${personality.name} (${personality.id})`);
  } else {
    console.log('  - Personality already exists: dev-narrator');
  }

  // 3. Sample media items (metadata only — no file uploads)
  if (!await exists(pb, 'media_library', 'slug', 'lofi-coding-beats')) {
    const media1 = await pb.collection('media_library').create({
      name: 'Lo-Fi Coding Beats',
      slug: 'lofi-coding-beats',
      media_type: 'music',
      category: 'background-music',
      tags: ['lo-fi', 'coding', 'chill', 'background'],
      file_url: '',
      duration: 180,
      license: 'CC BY 4.0 — Free Music Archive',
      usage_count: 0,
      description: 'Lo-fi hip hop background track, 90 BPM. Great for coding content.',
    });
    console.log(`  ✓ Created media: ${media1.name} (music)`);
  } else {
    console.log('  - Media already exists: lofi-coding-beats');
  }

  if (!await exists(pb, 'media_library', 'slug', 'gradient-bg-default')) {
    const media2 = await pb.collection('media_library').create({
      name: 'Default Gradient BG',
      slug: 'gradient-bg-default',
      media_type: 'graphic',
      category: 'background',
      tags: ['gradient', 'dark', 'purple', 'background'],
      file_url: '',
      dimensions: { width: 1920, height: 1080 },
      license: 'Generated — internal use',
      usage_count: 0,
      description: 'Default dark gradient background for content blocks.',
    });
    console.log(`  ✓ Created media: ${media2.name} (graphic)`);
  } else {
    console.log('  - Media already exists: gradient-bg-default');
  }

  console.log('\n✓ Seed data complete');
}

seed().catch((err) => {
  console.error('Fatal:', err.message || err);
  if (err.response) console.error('Response:', JSON.stringify(err.response, null, 2));
  process.exit(1);
});
