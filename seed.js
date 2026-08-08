const fs = require('fs');
const path = require('path');

// Auto-load .env file if DATABASE_URL is not set in environment
if (!process.env.DATABASE_URL) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(path.join(__dirname, '.env'));
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
    // fallback ignore
  }
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding on cPanel...');

  // 1. Seed SH000000 (Super Admin)
  console.log('Seeding Super Admin 1 (SH000000)...');
  const adminPassword1 = await bcrypt.hash('TestPassword123!', 10);
  const admin1 = await prisma.shareholder.upsert({
    where: { shareholderId: 'SH000000' },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPassword1,
      referralCode: 'SH000000',
    },
    create: {
      shareholderId: 'SH000000',
      name: 'Super Admin',
      passwordHash: adminPassword1,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'SH000000',
      phone: '9999999999',
    },
  });

  // 2. Seed SH100001 (Super Admin 2)
  console.log('Seeding Super Admin 2 (SH100001)...');
  const adminPassword2 = await bcrypt.hash('Studio@123', 10);
  const admin2 = await prisma.shareholder.upsert({
    where: { shareholderId: 'SH100001' },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPassword2,
      referralCode: 'SH100001',
    },
    create: {
      shareholderId: 'SH100001',
      name: 'Super Admin Studio',
      passwordHash: adminPassword2,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'SH100001',
      phone: '9999999998',
    },
  });

  // 3. Seed USR000001 (User/Shareholder)
  console.log('Seeding User/Shareholder (USR000001)...');
  const userPassword = await bcrypt.hash('UserPassword123!', 10);
  const user = await prisma.shareholder.upsert({
    where: { shareholderId: 'USR000001' },
    update: {
      role: 'SHAREHOLDER',
      status: 'ACTIVE',
      passwordHash: userPassword,
      referralCode: 'USR000001',
    },
    create: {
      shareholderId: 'USR000001',
      name: 'Standard Shareholder',
      passwordHash: userPassword,
      role: 'SHAREHOLDER',
      status: 'ACTIVE',
      referralCode: 'USR000001',
      phone: '9876543210',
    },
  });

  console.log('----------------------------------------------------');
  console.log('✅ Seeding Complete! Credentials available:');
  console.log('----------------------------------------------------');
  console.log(`[Admin 1] ID: ${admin1.shareholderId} | Pass: TestPassword123!`);
  console.log(`[Admin 2] ID: ${admin2.shareholderId} | Pass: Studio@123`);
  console.log(`[User 1]  ID: ${user.shareholderId}  | Pass: UserPassword123!`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
