import * as fs from 'fs';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  try {
    if (typeof (process as any).loadEnvFile === 'function') {
      (process as any).loadEnvFile(path.join(__dirname, '.env'));
    } else if (fs.existsSync(path.join(__dirname, '.env'))) {
      const envConfig = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      for (const line of envConfig.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const val = valueParts.join('=').replace(/^["']|["']$/g, '');
            process.env[key.trim()] = val;
          }
        }
      }
    }
  } catch (e) {
    // fallback
  }
}

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding User Panel (Shareholder) Credentials...');
  
  const passwordHash = await bcrypt.hash('UserPassword123!', 10);
  
  // Create or update standard shareholder for User Panel
  const user = await prisma.shareholder.upsert({
    where: { shareholderId: 'USR000001' },
    update: {
      role: 'SHAREHOLDER',
      status: 'ACTIVE',
      passwordHash,
    },
    create: {
      shareholderId: 'USR000001',
      name: 'Standard Shareholder',
      passwordHash,
      role: 'SHAREHOLDER',
      status: 'ACTIVE',
      referralCode: 'USERCODE001',
      phone: '9876543210',
    },
  });

  // Ensure Super Admin also exists for comparison
  const adminPasswordHash = await bcrypt.hash('TestPassword123!', 10);
  const admin = await prisma.shareholder.upsert({
    where: { shareholderId: 'SH000000' },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
    },
    create: {
      shareholderId: 'SH000000',
      name: 'Super Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'SUPERADMINCODE',
      phone: '9999999999',
    },
  });

  console.log('----------------------------------------------------');
  console.log('✅ User Panel Credentials Created Successfully:');
  console.log(`Role           : ${user.role}`);
  console.log(`Name           : ${user.name}`);
  console.log(`Shareholder ID : ${user.shareholderId}`);
  console.log(`Password       : UserPassword123!`);
  console.log('----------------------------------------------------');
  console.log('✅ Admin Panel Credentials Available:');
  console.log(`Role           : ${admin.role}`);
  console.log(`Shareholder ID : ${admin.shareholderId}`);
  console.log(`Password       : TestPassword123!`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error seeding user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
