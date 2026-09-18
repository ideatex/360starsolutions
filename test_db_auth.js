const { Client } = require('pg');

const passwords = ['postgres', 'root', 'admin', 'password', '', '1234', '123456', '12345678', 'system', 'root123', 'admin123', 'crm_db', 'postgres123'];
const users = ['postgres', 'user'];

async function testCredentials() {
  for (const user of users) {
    for (const password of passwords) {
      const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        user,
        password,
        database: 'postgres',
        connectionTimeoutMillis: 1500,
      });

      try {
        await client.connect();
        console.log(`🎉 SUCCESS: user="${user}", password="${password}"`);
        await client.end();
        return { user, password };
      } catch (err) {
        // failed
      }
    }
  }
  console.log('❌ Could not authenticate with common passwords.');
  return null;
}

testCredentials();
