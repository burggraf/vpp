const PB = require('pocketbase/cjs');
const pb = new PB('http://127.0.0.1:8090');

async function main() {
  await pb.collection('_superusers').authWithPassword('admin@vpp.local', 'password1234');
  console.log('auth ok');

  // Test filter
  const r = await pb.collection('media_library').getFullList(100, { filter: 'slug="lofi" || slug="gradient"' });
  console.log('filter ok, found:', r.length);

  // Test create
  const m = await pb.collection('media_library').create({
    name: 'LoFi',
    slug: 'lofi-coding-beats',
    media_type: 'music',
    category: 'background-music',
    tags: ['lo-fi', 'coding'],
    file_url: '',
    duration: 180,
    license: 'CC BY 4.0',
    usage_count: 0,
    description: 'Test track',
  });
  console.log('created:', m.id);
  await pb.collection('media_library').delete(m.id);
  console.log('deleted');
}

main().catch(e => {
  console.error('ERROR:', e);
  console.error('data:', e.response);
  process.exit(1);
});
