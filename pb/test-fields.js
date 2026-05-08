const PB = require('pocketbase/cjs');
const pb = new PB('http://127.0.0.1:8090');

async function main() {
  await pb.collection('_superusers').authWithPassword('admin@vpp.local', 'password1234');

  // Test with 'fields' key via raw API
  const result = await pb.send('/api/collections', {
    method: 'POST',
    body: {
      name: 'test_fields2',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'title', type: 'text', required: true, options: { max: 255 } },
        { name: 'body', type: 'text', required: false, options: { max: 5000 } },
      ]
    }
  });
  console.log('Fields count:', result.fields.length);
  console.log('Field names:', result.fields.map(f => f.name).join(', '));

  // Create record
  const record = await pb.send('/api/collections/test_fields2/records', {
    method: 'POST',
    body: { title: 'Hello', body: 'World' }
  });
  console.log('Record:', JSON.stringify(record, null, 2));

  // Cleanup
  await pb.send('/api/collections/test_fields2', { method: 'DELETE' });
  console.log('Cleaned up');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
