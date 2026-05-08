const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@vpp.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123456';

const AUTH_RULE = "@request.auth.id != ''";

async function createCollection(pb, config) {
  const { name, type, schema, listRule, viewRule, createRule, updateRule, deleteRule } = config;
  try {
    const existing = await pb.admins.getAuthMethods();
    await pb.collections.create({
      name,
      type,
      schema,
      listRule: listRule ?? AUTH_RULE,
      viewRule: viewRule ?? AUTH_RULE,
      createRule: createRule ?? AUTH_RULE,
      updateRule: updateRule ?? AUTH_RULE,
      deleteRule: deleteRule ?? AUTH_RULE,
    });
    console.log(`  ✓ Created collection: ${name}`);
  } catch (err) {
    if (err.status === 400 && err.response?.message?.includes('already exists')) {
      console.log(`  - Collection already exists, skipping: ${name}`);
    } else {
      console.error(`  ✗ Failed to create collection: ${name}`, err.message || err);
    }
  }
}

async function init() {
  const pb = new PocketBase(PB_URL);

  // Admin auth required for collection management
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    console.error('Failed to authenticate as admin:', err.message);
    process.exit(1);
  }

  console.log('Creating collections...');

  // 1. channels
  await createCollection(pb, {
    name: 'channels',
    type: 'base',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
      {
        name: 'style_dna',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
        default: JSON.stringify({
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
        }),
      },
      {
        name: 'intro_video',
        type: 'file',
        required: false,
        options: { maxSelect: 1, maxSize: 104857600, mimeTypes: [] },
      },
      {
        name: 'outro_video',
        type: 'file',
        required: false,
        options: { maxSelect: 1, maxSize: 104857600, mimeTypes: [] },
      },
      {
        name: 'system_prompt',
        type: 'text',
        required: true,
        options: { max: 10000, pattern: '' },
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['active', 'paused', 'archived'],
        },
        default: 'active',
      },
      {
        name: 'episode_count',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
        default: '0',
      },
      {
        name: 'schedule',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'schedule_enabled',
        type: 'bool',
        required: false,
        default: false,
      },
      {
        name: 'schedule_auto_advance',
        type: 'bool',
        required: false,
        default: false,
      },
    ],
  });

  // 2. personalities
  await createCollection(pb, {
    name: 'personalities',
    type: 'base',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
      {
        name: 'voice_profile',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
      },
      {
        name: 'training_sources',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '[]',
      },
      {
        name: 'system_prompt',
        type: 'text',
        required: true,
        options: { max: 10000, pattern: '' },
      },
      {
        name: 'sample_output',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['active', 'draft', 'archived'],
        },
        default: 'draft',
      },
    ],
  });

  // 3. episodes
  await createCollection(pb, {
    name: 'episodes',
    type: 'base',
    schema: [
      {
        name: 'channel',
        type: 'relation',
        required: true,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name'],
        },
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'number',
        type: 'number',
        required: false,
        options: { min: null, max: null },
      },
      {
        name: 'topic',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['draft', 'generating', 'preview', 'reviewing', 'rendering', 'complete', 'failed'],
        },
        default: 'draft',
      },
      {
        name: 'composition_path',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'preview_url',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'block_count',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
        default: '0',
      },
      {
        name: 'total_duration',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
        default: '0',
      },
      {
        name: 'feedback_log',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '[]',
      },
      {
        name: 'video_file',
        type: 'file',
        required: false,
        options: { maxSelect: 1, maxSize: 524288000, mimeTypes: [] },
      },
      {
        name: 'video_url',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'thumbnail',
        type: 'file',
        required: false,
        options: { maxSelect: 1, maxSize: 10485760, mimeTypes: [] },
      },
      {
        name: 'metadata',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '{}',
      },
    ],
  });

  // 4. blocks
  await createCollection(pb, {
    name: 'blocks',
    type: 'base',
    schema: [
      {
        name: 'episode',
        type: 'relation',
        required: true,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['title'],
        },
      },
      {
        name: 'block_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['intro', 'title', 'content', 'lower_third', 'transition', 'outro', 'caption'],
        },
      },
      {
        name: 'order',
        type: 'number',
        required: true,
        options: { min: 0, max: null },
      },
      {
        name: 'script',
        type: 'text',
        required: false,
        options: { max: 10000, pattern: '' },
      },
      {
        name: 'composition_src',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'start_time',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'duration',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'track_index',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'variables',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '{}',
      },
      {
        name: 'assets',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '{}',
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['pending', 'generated', 'approved', 'needs_revision'],
        },
        default: 'pending',
      },
    ],
  });

  // 5. research_results
  await createCollection(pb, {
    name: 'research_results',
    type: 'base',
    schema: [
      {
        name: 'episode',
        type: 'relation',
        required: true,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['title'],
        },
      },
      {
        name: 'query',
        type: 'text',
        required: true,
        options: { max: 5000, pattern: '' },
      },
      {
        name: 'results',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
      },
      {
        name: 'summary',
        type: 'text',
        required: false,
        options: { max: 10000, pattern: '' },
      },
      {
        name: 'sources',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '[]',
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['pending', 'in_progress', 'complete', 'failed'],
        },
        default: 'pending',
      },
    ],
  });

  // 6. scripts
  await createCollection(pb, {
    name: 'scripts',
    type: 'base',
    schema: [
      {
        name: 'episode',
        type: 'relation',
        required: true,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['title'],
        },
      },
      {
        name: 'personality',
        type: 'relation',
        required: false,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name'],
        },
      },
      {
        name: 'research',
        type: 'relation',
        required: false,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['query'],
        },
      },
      {
        name: 'content',
        type: 'text',
        required: true,
        options: { max: 50000, pattern: '' },
      },
      {
        name: 'segments',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
      },
      {
        name: 'word_count',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'estimated_duration',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['draft', 'generated', 'approved', 'needs_revision'],
        },
        default: 'draft',
      },
      {
        name: 'revision_notes',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
    ],
  });

  // 7. media_library
  await createCollection(pb, {
    name: 'media_library',
    type: 'base',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'media_type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['image', 'video', 'audio', 'music', 'sfx', 'font', 'graphic'],
        },
      },
      {
        name: 'category',
        type: 'text',
        required: false,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'tags',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '[]',
      },
      {
        name: 'file',
        type: 'file',
        required: true,
        options: { maxSelect: 1, maxSize: 104857600, mimeTypes: [] },
      },
      {
        name: 'file_url',
        type: 'text',
        required: false,
        options: { max: 500, pattern: '' },
      },
      {
        name: 'duration',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'dimensions',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
      },
      {
        name: 'license',
        type: 'text',
        required: false,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'usage_count',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
        default: '0',
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
    ],
  });

  // 8. episode_templates
  await createCollection(pb, {
    name: 'episode_templates',
    type: 'base',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        options: { max: 255, pattern: '' },
      },
      {
        name: 'channel',
        type: 'relation',
        required: true,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name'],
        },
      },
      {
        name: 'source_episode',
        type: 'relation',
        required: false,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['title'],
        },
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: { max: 5000, pattern: '' },
      },
      {
        name: 'block_structure',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
      },
      {
        name: 'composition_files',
        type: 'json',
        required: true,
        options: { maxSize: 0 },
      },
      {
        name: 'default_personality',
        type: 'relation',
        required: false,
        options: {
          collectionId: '',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name'],
        },
      },
      {
        name: 'default_research_depth',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
      },
      {
        name: 'default_duration',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
      },
      {
        name: 'variables',
        type: 'json',
        required: false,
        options: { maxSize: 0 },
        default: '{}',
      },
      {
        name: 'usage_count',
        type: 'number',
        required: false,
        options: { min: 0, max: null },
        default: '0',
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        options: {
          maxSelect: 1,
          values: ['active', 'archived'],
        },
        default: 'active',
      },
    ],
  });

  // Fix relation collectionIds after all collections created
  console.log('\nFixing relation references...');
  const collections = await pb.collections.getList(1, 50, { filter: 'type="base"' });

  const collectionMap = {};
  for (const c of collections.items) {
    collectionMap[c.name] = c.id;
  }

  const relationFixes = [
    { collection: 'episodes', field: 'channel', ref: 'channels' },
    { collection: 'blocks', field: 'episode', ref: 'episodes' },
    { collection: 'research_results', field: 'episode', ref: 'episodes' },
    { collection: 'scripts', field: 'episode', ref: 'episodes' },
    { collection: 'scripts', field: 'personality', ref: 'personalities' },
    { collection: 'scripts', field: 'research', ref: 'research_results' },
    { collection: 'episode_templates', field: 'channel', ref: 'channels' },
    { collection: 'episode_templates', field: 'source_episode', ref: 'episodes' },
    { collection: 'episode_templates', field: 'default_personality', ref: 'personalities' },
  ];

  for (const fix of relationFixes) {
    const coll = await pb.collections.getOneByName(fix.collection);
    const schema = [...coll.schema];
    const fieldIdx = schema.findIndex(f => f.name === fix.field);
    if (fieldIdx >= 0) {
      schema[fieldIdx].options = {
        ...schema[fieldIdx].options,
        collectionId: collectionMap[fix.ref] || '',
      };
      try {
        await pb.collections.update(coll.id, { schema });
        console.log(`  ✓ Fixed relation: ${fix.collection}.${fieldIdx} → ${fix.ref}`);
      } catch (err) {
        console.error(`  ✗ Failed to fix ${fix.collection}.${fix.field}:`, err.message);
      }
    }
  }

  // Add unique constraints for name + slug fields
  console.log('\nAdding unique constraints...');
  const uniqueConstraints = [
    { collection: 'channels', fields: ['name'] },
    { collection: 'channels', fields: ['slug'] },
    { collection: 'personalities', fields: ['name'] },
    { collection: 'personalities', fields: ['slug'] },
    { collection: 'episodes', fields: ['slug'] },
    { collection: 'media_library', fields: ['name'] },
    { collection: 'media_library', fields: ['slug'] },
    { collection: 'episode_templates', fields: ['slug'] },
  ];

  for (const constraint of uniqueConstraints) {
    const coll = await pb.collections.getOneByName(constraint.collection);
    const schema = [...coll.schema];
    for (const field of constraint.fields) {
      const fieldIdx = schema.findIndex(f => f.name === field);
      if (fieldIdx >= 0) {
        schema[fieldIdx].options = {
          ...schema[fieldIdx].options,
          unique: true,
        };
      }
    }
    try {
      await pb.collections.update(coll.id, { schema });
      console.log(`  ✓ Unique constraint: ${constraint.collection} [${constraint.fields.join(', ')}]`);
    } catch (err) {
      console.error(`  ✗ Failed unique constraint on ${constraint.collection}:`, err.message);
    }
  }

  console.log('\n✅ All collections initialized.');
}

init().catch(console.error);
