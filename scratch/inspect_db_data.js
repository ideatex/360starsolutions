const { Client } = require('pg');
require('dotenv').config();
const { parse } = require('pg-connection-string');

let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=')) {
  connectionString = connectionString.replace(/sslmode=[^&]+&?/, '');
}
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };

const client = new Client(config);

async function main() {
  await client.connect();
  console.log('Connected to Supabase.');

  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('\n--- Current Database Table Counts ---');
  for (const row of tables.rows) {
    const t = row.table_name;
    try {
      const c = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`${t}: ${c.rows[0].count}`);
    } catch (e) {
      console.log(`${t}: Error reading count (${e.message})`);
    }
  }

  const users = await client.query(`SELECT id, "shareholderId", name, role, phone FROM "User" LIMIT 10;`);
  console.log('\n--- Sample Users in "User" table ---');
  console.table(users.rows);

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
