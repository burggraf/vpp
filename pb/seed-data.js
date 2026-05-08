const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@vpp.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123456';

async function seed() {
  const pb = new PocketBase(PB_URL);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    console.error('Failed to authenticate as admin:', err.message);
    process.exit(1);
  }

  console.log('Seeding sample data...');

  // --- 1 Channel ---
  let channel;
  try {
    const existing = await pb.collection('channels').getList(1, 1, { filter: 'slug="tech-nexus"' });
    if (existing.totalItems > 0) {
      channel = existing.items[0];
      console.log('  - Channel already exists: tech-nexus');
    }
  } catch {
    // collection might not exist yet
  }

  if (!channel) {
    try {
      channel = await pb.collection('channels').create({
        name: 'Tech Nexus',
        slug: 'tech-nexus',
        description: 'A channel exploring emerging technology and its impact on society.',
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
        system_prompt: 'You are a technology analyst. Explain complex tech topics in accessible language. Use real-world examples and maintain an objective, informative tone.',
        status: 'active',
        episode_count: 0,
        schedule_enabled: false,
        schedule_auto_advance: false,
      });
      console.log('  ✓ Created channel: Tech Nexus');
    } catch (err) {
      console.error('  ✗ Failed to create channel:', err.message);
    }
  }

  // --- 1 Personality ---
  let personality;
  if (!personality) {
    try {
      const existing = await pb.collection('personalities').getList(1, 1, { filter: 'slug="narrator-alex"' });
      if (existing.totalItems > 0) {
        personality = existing.items[0];
        console.log('  - Personality already exists: narrator-alex');
      }
    } catch {}
  }

  if (!personality) {
    try {
      personality = await pb.collection('personalities').create({
        name: 'Narrator Alex',
        slug: 'narrator-alex',
        description: 'Calm, authoritative voice with a measured pace. Ideal for documentary-style content.',
        voice_profile: {
          voice_id: 'am_adam',
          pitch: 0,
          speed: 1.0,
          stability: 0.75,
          clarity: 0.8,
          style: 0.2,
        },
        training_sources: [
          { source: 'documentary-scripts', url: 'https://example.com/training/docs' },
        ],
        system_prompt: 'Speak in a calm, measured tone. Use clear enunciation. Pace delivery for comprehension. Emphasize key terms naturally.',
        sample_output: 'Today we explore the fascinating world of artificial intelligence and its transformative potential.',
        status: 'active',
      });
      console.log('  ✓ Created personality: Narrator Alex');
    } catch (err) {
      console.error('  ✗ Failed to create personality:', err.message);
    }
  }

  // --- 1 Episode (depends on channel) ---
  let episode;
  if (channel) {
    try {
      const existing = await pb.collection('episodes').getList(1, 1, { filter: `slug="introduction-to-quantum-computing" && channel="${channel.id}"` });
      if (existing.totalItems > 0) {
        episode = existing.items[0];
        console.log('  - Episode already exists: introduction-to-quantum-computing');
      }
    } catch {}

    if (!episode) {
      try {
        episode = await pb.collection('episodes').create({
          channel: channel.id,
          title: 'Introduction to Quantum Computing',
          slug: 'introduction-to-quantum-computing',
          number: 1,
          topic: 'quantum computing basics',
          status: 'draft',
          block_count: 0,
          total_duration: 0,
          feedback_log: [],
          metadata: {},
        });
        console.log('  ✓ Created episode: Introduction to Quantum Computing');
      } catch (err) {
        console.error('  ✗ Failed to create episode:', err.message);
      }
    }
  }

  // --- 1 Episode Template (depends on channel) ---
  if (channel) {
    try {
      const existing = await pb.collection('episode_templates').getList(1, 1, { filter: 'slug="standard-tech-episode"' });
      if (existing.totalItems === 0) {
        await pb.collection('episode_templates').create({
          name: 'Standard Tech Episode',
          slug: 'standard-tech-episode',
          channel: channel.id,
          description: 'Default template for tech explainer episodes.',
          block_structure: [
            { type: 'intro', order: 0, duration: 10 },
            { type: 'title', order: 1, duration: 5 },
            { type: 'content', order: 2, duration: 300 },
            { type: 'lower_third', order: 3, duration: 8 },
            { type: 'content', order: 4, duration: 300 },
            { type: 'transition', order: 5, duration: 3 },
            { type: 'content', order: 6, duration: 300 },
            { type: 'outro', order: 7, duration: 15 },
          ],
          composition_files: ['base_template.aep', 'lower_third_template.aep'],
          default_research_depth: { web_search: true, depth: 'medium', max_sources: 10 },
          default_duration: 900,
          variables: {},
          usage_count: 0,
          status: 'active',
        });
        console.log('  ✓ Created template: Standard Tech Episode');
      } else {
        console.log('  - Template already exists: standard-tech-episode');
      }
    } catch (err) {
      console.error('  ✗ Failed to create template:', err.message);
    }
  }

  // --- 2 Media Library items (using file_url since actual files need uploads) ---
  const mediaItems = [
    {
      name: 'Quantum Chip Background',
      slug: 'quantum-chip-bg',
      media_type: 'image',
      category: 'backgrounds',
      tags: ['quantum', 'technology', 'chip'],
      file_url: 'https://example.com/media/quantum-chip-bg.jpg',
      dimensions: { width: 1920, height: 1080 },
      license: 'CC BY 4.0',
      description: 'High-resolution image of a quantum processor chip.',
    },
    {
      name: 'Transition Swipe SFX',
      slug: 'transition-swipe-sfx',
      media_type: 'sfx',
      category: 'transitions',
      tags: ['transition', 'swipe', 'clean'],
      file_url: 'https://example.com/media/transition-swipe.mp3',
      duration: 1.5,
      license: 'MIT',
      description: 'Clean swipe sound effect for scene transitions.',
    },
  ];

  for (const item of mediaItems) {
    try {
      const existing = await pb.collection('media_library').getList(1, 1, { filter: `slug="${item.slug}"` });
      if (existing.totalItems > 0) {
        console.log(`  - Media already exists: ${item.slug}`);
        continue;
      }
      // Note: file is required but we only have file_url; create with a placeholder approach
      // For seeding, we skip file upload and just note it
      console.log(`  ⚠ Skipping media "${item.name}" — requires actual file upload (use file_url: ${item.file_url})`);
    } catch (err) {
      console.error(`  ✗ Failed to seed media "${item.name}":`, err.message);
    }
  }

  console.log('\n✅ Seed data complete.');
}

seed().catch(console.error);
