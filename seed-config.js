const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.profitConfiguration.findFirst({ where: { status: 'ACTIVE' } });
  if (!existing) {
    await prisma.profitConfiguration.create({
      data: {
        maxReferralLevels: 7,
        levelOpeningVolumes: { "1": 10000, "2": 25000, "3": 50000, "4": 100000, "5": 200000, "6": 500000, "7": 1000000 },
        levelPercentages: { "1": 0.05, "2": 0.03, "3": 0.02, "4": 0.01, "5": 0.01, "6": 0.005, "7": 0.005 },
        status: 'ACTIVE'
      }
    });
    console.log("✅ ProfitConfiguration seeded successfully on the live database!");
  } else {
    console.log("ProfitConfiguration already exists.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
