const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let url = process.env.DATABASE_URL.replace(/sslmode=[^&]+&?/, '');
const config = parse(url);
const pool = new Pool({ ...config, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyAuth() {
  console.log('Testing authentication for 360SS001...');
  
  const user = await prisma.shareholder.findFirst({
    where: {
      shareholderId: { equals: '360SS001', mode: 'insensitive' }
    }
  });

  if (!user) {
    throw new Error('User 360SS001 not found!');
  }

  console.log('User found:', {
    id: user.id,
    shareholderId: user.shareholderId,
    name: user.name,
    role: user.role,
    status: user.status
  });

  const isMatch = await bcrypt.compare('TestPassword123!', user.passwordHash);
  console.log('Password match test:', isMatch ? '✅ MATCH' : '❌ MISMATCH');

  if (!isMatch) {
    throw new Error('Password does not match!');
  }

  console.log('✅ Authentication test verified successfully!');
  await pool.end();
}

verifyAuth().catch(err => {
  console.error('Auth verification error:', err);
  pool.end();
  process.exit(1);
});
