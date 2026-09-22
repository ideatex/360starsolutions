const { PrismaClient } = require('@prisma/client');
const url = 'postgresql://postgres.yxxcpheitoflmdxvknzm:eQwUF7sgwnaC5bsz@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require&connect_timeout=30';
const p = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const count = await p.founderArticle.count();
  console.log('Founder articles count:', count);
  const ranks = await p.rankConfiguration.count();
  console.log('RankConfiguration count:', ranks);
  const biz = await p.businessConfiguration.findFirst();
  console.log('BusinessConfiguration:', biz ? 'found' : 'none');
  await p.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
