import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding / Resetting Super Admin Accounts...');
  
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  
  // 1. Ensure 360SS001 is active with known password
  const user0 = await prisma.shareholder.upsert({
    where: { shareholderId: '360SS001' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: '360SS001',
    },
    create: {
      shareholderId: '360SS001',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'Super Admin',
      referralCode: '360SS001',
      phone: '9000000000',
    },
  });

  // 2. Ensure SH100001 (form placeholder) is active with known password
  const user1 = await prisma.shareholder.upsert({
    where: { shareholderId: 'SH100001' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'SH100001',
    },
    create: {
      shareholderId: 'SH100001',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'Super Admin',
      referralCode: 'SH100001',
      phone: '9000000001',
    },
  });

  const allAdmins = await prisma.shareholder.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
    },
    select: {
      id: true,
      shareholderId: true,
      name: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  console.log('\n=============================================');
  console.log('✅ SUPER ADMIN ACCOUNTS READY FOR LOGIN:');
  console.log('=============================================');
  for (const adm of allAdmins) {
    console.log(`- Shareholder ID: ${adm.shareholderId} | Role: ${adm.role} | Status: ${adm.status}`);
  }
  console.log('\nDefault Password for SH000000 & SH100001:');
  console.log('Password: TestPassword123!');
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
