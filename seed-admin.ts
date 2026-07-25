import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Super Admin...');
  
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  
  const user = await prisma.shareholder.upsert({
    where: { shareholderId: 'SH000000' },
    update: {},
    create: {
      shareholderId: 'SH000000',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'Super Admin',
      referralCode: 'SUPERADMINCODE'
    },
  });

  console.log('Super Admin seeded successfully:');
  console.log(`Shareholder ID: ${user.shareholderId}`);
  console.log('Password: TestPassword123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
