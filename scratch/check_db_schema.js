const { Client } = require('pg');
require('dotenv').config();

const { parse } = require('pg-connection-string');

let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=')) {
  connectionString = connectionString.replace(/sslmode=[^&]+&?/, '');
}
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };

console.log('Connecting to database host:', config.host);

const client = new Client(config);

async function main() {
  await client.connect();
  console.log('Connected to Supabase.');
  
  const check = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'previousParentId';
  `);
  
  if (check.rows.length === 0) {
    console.log('Adding previousParentId column to "User" table...');
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "previousParentId" TEXT;
    `);
    console.log('Successfully added previousParentId column to "User" table.');
  } else {
    console.log('Column previousParentId already exists in "User" table.');
  }

  // Also check if any foreign key is needed or indexes
  const checkIndex = await client.query(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'User' AND indexname = 'User_previousParentId_idx';
  `);
  console.log('Done.');

  await client.end();
}

main().catch(err => {
  console.error('Database check error:', err);
  process.exit(1);
});
