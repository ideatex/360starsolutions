const { PrismaService } = require('../dist/server/prisma/prisma.service.js');

async function test() {
  const s = new PrismaService();
  await s.onModuleInit();
  const u = await s.shareholder.findFirst({ where: { shareholderId: 'SH000000' } });
  console.log('SUCCESS! Found user via PrismaService:', u ? u.name : 'null');
  await s.onModuleDestroy();
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
