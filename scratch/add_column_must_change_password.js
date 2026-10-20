const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding mustChangePassword column to "User" table if not exists...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" 
    ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log('✅ mustChangePassword column successfully added to "User" table!');
  
  const sample = await prisma.shareholder.findFirst({ select: { id: true, shareholderId: true, name: true } });
  console.log('Sample record queried:', sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
