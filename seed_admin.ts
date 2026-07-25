import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Studio@123', 10);
  const superAdmin = await prisma.shareholder.create({
    data: {
      shareholderId: 'SH100001',
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'ADMIN01',
      phone: '9999999999',
    },
  });
  console.log('Created Super Admin:', superAdmin.shareholderId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
