const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('pg-connection-string');

const connectionString = 'postgresql://postgres.yxxcpheitoflmdxvknzm:eQwUF7sgwnaC5bsz@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require';

const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };
config.max = 5;
config.connectionTimeoutMillis = 10000;

const pool = new Pool(config);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Testing Prisma with @prisma/adapter-pg (pure JS pg driver)...');
  const count = await prisma.founderArticle.count();
  console.log('Founder articles count:', count);
  const ranks = await prisma.rankConfiguration.count();
  console.log('RankConfiguration count:', ranks);
  const user = await prisma.shareholder.findFirst({
    where: { shareholderId: 'SH000000' }
  });
  console.log('SH000000 found:', user ? user.name : 'none');
  await prisma.$disconnect();
  await pool.end();
  console.log('SUCCESS! All queries executed through JavaScript pg driver!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
