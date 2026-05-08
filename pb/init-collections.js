const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';//127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@vpp.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password1234';

const AUTH_RULE = "@request.auth.id != ''";

async function colId(pb, name) {
  const c = await pb.collections.getOne(name);
  return c.id;
}

async function createOrUpdateCollection(pb, config) {
  const { name, type = 'base', fields = [], rules = {} } = config;
  try {
    const existing = await pb.collections.getOne(name);
    await pb.collections.update(existing.id, {
      fields,
      listRule: rules.listRule || AUTH_RULE,
      viewRule: rules.viewRule || AUTH_RULE,
      createRule: rules.createRule || AUTH_RULE,
      updateRule: rules.updateRule || AUTH_RULE,
      deleteRule: rules.deleteRule || AUTH_RULE,
    });
    console.log(`  ✓ Updated: ${name} (${fields.length} custom fields)`);
    return existing;
  } catch (e) {
    if (e.status === 404) {
      const created = await pb.collections.create({
        name, type, fields,
        listRule: rules.listRule || AUTH_RULE,
        viewRule: rules.viewRule || AUTH_RULE,
        createRule: rules.createRule || AUTH_RULE,
        updateRule: rules.updateRule || AUTH_RULE,
        deleteRule: rules.deleteRule || AUTH_RULE,
      });
      console.log(`  ✓ Created: ${name} (${fields.length} custom fields)`);
      return created;
    }
    throw e;
  }
}

// Field helpers — PB 0.38.0 uses flat properties (no options wrapper)
const F = {
  text: (name, opts = {}) => ({ name, type: 'text', required: !!opts.required, min: opts.min || 0, max: opts.max || 0, pattern: opts.pattern || '' }),
  number: (name, opts = {}) => ({ name, type: 'number', min: opts.min != null ? opts.min : null, max: opts.max != null ? opts.max : null }),
  bool: (name) => ({ name, type: 'bool' }),
  email: (name) => ({ name, type: 'email' }),
  url: (name) => ({ name, type: 'url' }),
  json: (name) => ({ name, type: 'json' }),
  select: (name, values, opts = {}) => ({ name, type: 'select', values, maxSelect: opts.maxSelect || 1 }),
  file: (name, opts = {}) => ({ name, type: 'file', maxSelect: opts.maxSelect || 1, maxSize: opts.maxSize || 10485760, mimeTypes: opts.mimeTypes || [] }),
  relation: (name, collectionId, opts = {}) => ({ name, type: 'relation', collectionId, maxSelect: opts.maxSelect || 1, cascadeDelete: !!opts.cascadeDelete }),
  // PB 0.38.0 requires explicit autodate fields
  autodate: () => [
    { name: 'created', type: 'autodate', onCreate: { timestamp: '', timeUnit: '' }, onUpdate: { timestamp: '', timeUnit: '' } },
    { name: 'updated', type: 'autodate', oncreate: { timestamp: '', timeUnit: '' }, onUpdate: { timestamp: '', timeUnit: '' } },
  ],
};

// Helper: add autodate fields to collection field list
function withTimestamps(fields) {
  return [
    ...fields,
    { name: 'created', type: 'autodate' },
    { name: 'updated', type: 'autodate' },
  ];
}

async function init() {
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✓ Authenticated\n');

  console.log('Creating collections...\n');

  // 0. users (auth collection)
  try {
    await pb.collections.getOne('users');
    console.log(`  ✓ Exists: users`);
  } catch {
    await pb.send('/api/collections', {
      method: 'POST',
      body: {
        name: 'users',
        type: 'auth',
        authRule: '',
        manageRule: null,
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '',
        updateRule: '@request.auth.id = id',
        deleteRule: '@request.auth.id = id',
        fields: [
          { name: 'email', type: 'email', required: true, unique: true, exceptDomains: [], onlyDomains: [] },
          { name: 'name', type: 'text', required: false, min: 0, max: 255, pattern: '' },
        ],
        oauth2: { enabled: false, mappedFields: { id: '', name: '', username: '', avatarURL: '' } },
        passwordAuth: { enabled: true, identityFields: ['email'] },
      },
    });
    console.log('  ✓ Created: users (auth)');
  }

  // 1. channels
  await createOrUpdateCollection(pb, {
    name: 'channels',
    fields: withTimestamps([
      F.text('name', { required: true, max: 255 }),
      F.text('slug', { required: true, max: 255 }),
      F.text('description', { max: 5000 }),
      F.json('style_dna', { required: true }),
      F.file('intro_video', { maxSelect: 1, maxSize: 104857600 }),
      F.file('outro_video', { maxSelect: 1, maxSize: 104857600 }),
      F.text('system_prompt', { required: true, max: 10000 }),
      F.select('status', ['active', 'paused', 'archived']),
      F.number('episode_count'),
      F.text('schedule'),
      F.bool('schedule_enabled'),
      F.bool('schedule_auto_advance'),
    ]),
  });

  // 2. personalities
  await createOrUpdateCollection(pb, {
    name: 'personalities',
    fields: withTimestamps([
      F.text('name', { required: true, max: 255 }),
      F.text('slug', { required: true, max: 255 }),
      F.text('description', { max: 2000 }),
      F.json('voice_profile', { required: true }),
      F.json('training_sources'),
      F.text('system_prompt', { required: true, max: 10000 }),
      F.text('sample_output', { max: 5000 }),
      F.select('status', ['active', 'draft', 'archived']),
    ]),
  });

  // 3. episodes
  await createOrUpdateCollection(pb, {
    name: 'episodes',
    fields: withTimestamps([
      F.relation('channel', await colId(pb, 'channels')),
      F.text('title', { required: true, max: 255 }),
      F.text('slug', { required: true, max: 255 }),
      F.number('number'),
      F.text('topic', { max: 2000 }),
      F.select('status', ['draft', 'generating', 'preview', 'reviewing', 'rendering', 'complete', 'failed']),
      F.text('composition_path'),
      F.text('preview_url'),
      F.number('block_count'),
      F.number('total_duration'),
      F.json('feedback_log'),
      F.file('video_file', { maxSelect: 1, maxSize: 524288000 }),
      F.text('video_url'),
      F.file('thumbnail', { maxSelect: 1, maxSize: 10485760 }),
      F.json('metadata'),
    ]),
  });

  // 4. episode_templates
  await createOrUpdateCollection(pb, {
    name: 'episode_templates',
    fields: withTimestamps([
      F.text('name', { required: true, max: 255 }),
      F.text('slug', { required: true, max: 255 }),
      F.relation('channel', await colId(pb, 'channels')),
      F.relation('source_episode', await colId(pb, 'episodes')),
      F.text('description', { max: 2000 }),
      F.json('block_structure', { required: true }),
      F.json('composition_files', { required: true }),
      F.relation('default_personality', await colId(pb, 'personalities')),
      F.json('default_research_depth'),
      F.number('default_duration'),
      F.json('variables'),
      F.number('usage_count'),
      F.select('status', ['active', 'archived']),
    ]),
  });

  // 5. blocks
  await createOrUpdateCollection(pb, {
    name: 'blocks',
    fields: withTimestamps([
      F.relation('episode', await colId(pb, 'episodes')),
      F.select('block_type', ['intro', 'title', 'content', 'lower_third', 'transition', 'outro', 'caption']),
      F.number('order'),
      F.text('script', { max: 5000 }),
      F.text('composition_src'),
      F.number('start_time'),
      F.number('duration'),
      F.number('track_index'),
      F.json('variables'),
      F.json('assets'),
      F.select('status', ['pending', 'generated', 'approved', 'needs_revision']),
    ]),
  });

  // 6. research_results
  await createOrUpdateCollection(pb, {
    name: 'research_results',
    fields: withTimestamps([
      F.relation('episode', await colId(pb, 'episodes')),
      F.text('query', { required: true, max: 1000 }),
      F.json('results', { required: true }),
      F.text('summary', { max: 5000 }),
      F.json('sources'),
      F.select('status', ['pending', 'in_progress', 'complete', 'failed']),
    ]),
  });

  // 7. scripts
  await createOrUpdateCollection(pb, {
    name: 'scripts',
    fields: withTimestamps([
      F.relation('episode', await colId(pb, 'episodes')),
      F.relation('personality', await colId(pb, 'personalities')),
      F.relation('research', await colId(pb, 'research_results')),
      F.text('content', { required: true, max: 50000 }),
      F.json('segments', { required: true }),
      F.number('word_count'),
      F.number('estimated_duration'),
      F.select('status', ['draft', 'generated', 'approved', 'needs_revision']),
      F.text('revision_notes', { max: 2000 }),
    ]),
  });

  // 8. media_library
  await createOrUpdateCollection(pb, {
    name: 'media_library',
    fields: withTimestamps([
      F.text('name', { required: true, max: 255 }),
      F.text('slug', { required: true, max: 255 }),
      F.select('media_type', ['image', 'video', 'audio', 'music', 'sfx', 'font', 'graphic']),
      F.text('category'),
      F.json('tags'),
      F.file('file', { maxSelect: 1, maxSize: 104857600 }),
      F.text('file_url'),
      F.number('duration'),
      F.json('dimensions'),
      F.text('license'),
      F.number('usage_count'),
      F.text('description', { max: 2000 }),
    ]),
  });

  console.log('\n✓ All 8 collections initialized');
}

init().catch((err) => {
  console.error('Fatal:', err.message || err);
  if (err.data) console.error('Data:', JSON.stringify(err.data, null, 2));
  process.exit(1);
});
