#!/usr/bin/env node
// Create a new user in the 'users' auth collection
// Usage: node create-user.js email password [name]
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@vpp.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password1234';

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.log('Usage: node create-user.js <email> <password> [name]');
  console.log('Example: node create-user.js user@example.com secret123 John');
  process.exit(1);
}

async function main() {
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

  try {
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: name || email.split('@')[0],
      emailVisibility: true,
      verified: true,
    });
    console.log(`✓ Created user: ${user.email} (${user.id})`);
  } catch (e) {
    if (e.response?.data?.email?.code === 'validation_not_unique') {
      console.log(`✗ User already exists: ${email}`);
    } else {
      console.error('✗ Failed:', e.message);
      if (e.data) console.error(JSON.stringify(e.data, null, 2));
      process.exit(1);
    }
  }
}

main();
