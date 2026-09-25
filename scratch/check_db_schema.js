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
  
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'public."User"'::regclass;
  `);
  console.log('Constraints on "User" table:');
  console.table(constraints.rows);

  const indexes = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'User';
  `);
  console.log('\nIndexes on "User" table:');
  console.table(indexes.rows);

  // Check admin account
  const admin = await client.query(`
    SELECT id, "shareholderId", name, role, status 
    FROM "User" 
    WHERE role = 'SUPER_ADMIN' OR "shareholderId" = '360SS001';
  `);
  console.log('\nSuper Admin in Database:');
  console.table(admin.rows);

  await client.end();
}

main().catch(err => {
  console.error('Database check error:', err);
  process.exit(1);
});
