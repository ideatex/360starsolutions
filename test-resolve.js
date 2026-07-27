const fs = require('fs');
const path = require('path');
try {
  const prismaClientPackagePath = require.resolve('@prisma/client/package.json');
  const prismaClientPath = path.dirname(prismaClientPackagePath);
  const dotPrismaPath = path.join(prismaClientPath, '../../.prisma');
  
  console.log('@prisma/client path:', prismaClientPath);
  console.log('.prisma path:', dotPrismaPath);
} catch (e) {
  console.error(e);
}
