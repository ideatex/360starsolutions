const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting cPanel Build Process...');

// 1. Run the standard build
try {
  console.log('📦 Building frontend and backend...');
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// 2. Create cPanel deployment folder
const deployDir = path.join(__dirname, 'cpanel-deploy');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir);
console.log('📁 Created cpanel-deploy directory.');

// 3. Copy necessary files
const filesToCopy = [
  'package.json',
  'package-lock.json',
  'prisma',
  'dist',
  'seed.js',
  'seed-config.js'
];

filesToCopy.forEach((item) => {
  const src = path.join(__dirname, item);
  const dest = path.join(deployDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✅ Copied ${item}`);
  } else {
    console.warn(`⚠️ Warning: ${item} not found!`);
  }
});

console.log('📦 Backing up generated Prisma client for cPanel...');
const backupDir = path.join(deployDir, 'prisma-backup');
fs.mkdirSync(backupDir, { recursive: true });
if (fs.existsSync(path.join(__dirname, 'node_modules/.prisma'))) {
  fs.cpSync(path.join(__dirname, 'node_modules/.prisma'), path.join(backupDir, '.prisma'), { recursive: true });
}
if (fs.existsSync(path.join(__dirname, 'node_modules/@prisma/client'))) {
  fs.cpSync(path.join(__dirname, 'node_modules/@prisma/client'), path.join(backupDir, '@prisma/client'), { recursive: true });
}
console.log('✅ Prisma client backed up.');

const postinstallScript = `
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('🔄 Generating Prisma client on cPanel server...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Successfully generated Prisma client for server OS');
} catch (err) {
  console.warn('⚠️ npx prisma generate skipped or failed on server:', err.message);
  if (fs.existsSync('prisma-backup')) {
    try {
      const prismaClientPackagePath = require.resolve('@prisma/client/package.json');
      const prismaClientPath = path.dirname(prismaClientPackagePath);
      const dotPrismaPath = path.join(prismaClientPath, '../../.prisma');
      
      fs.cpSync('prisma-backup/.prisma', dotPrismaPath, { recursive: true });
      fs.cpSync('prisma-backup/@prisma/client', prismaClientPath, { recursive: true });
      console.log('✅ Successfully restored Prisma client binaries from backup to:', prismaClientPath);
    } catch(e) {
      console.error('❌ Failed to restore Prisma client:', e);
    }
  }
}
`;
fs.writeFileSync(path.join(deployDir, 'postinstall.js'), postinstallScript);
console.log('✅ Created postinstall.js script for cPanel restore');

// 4. Create an .htaccess if needed (optional for Passenger)
// Passenger (Node.js selector in cPanel) uses the startup file defined in cPanel.
// Let's create a server.js file at the root to make it easier for cPanel's Passenger
const serverJsContent = `// cPanel Passenger entry point
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}
require('./dist/server/main.js');
`;
fs.writeFileSync(path.join(deployDir, 'server.js'), serverJsContent);
console.log(`✅ Created server.js entry point for cPanel Node.js App`);

// 5. Create a template .env file
const envTemplate = `DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
PORT=3000
NODE_ENV="production"
JWT_SECRET="generate_a_strong_secret_here"
`;
fs.writeFileSync(path.join(deployDir, '.env.example'), envTemplate);
console.log(`✅ Created .env.example`);

// 6. Zip the deploy folder into cpanel-deploy.zip
try {
  console.log('🤐 Zipping cpanel-deploy folder into cpanel-deploy.zip...');
  const zipPath = path.join(__dirname, 'cpanel-deploy.zip');
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }
  execSync(`powershell -Command "Compress-Archive -Path '${deployDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  console.log('✅ Created cpanel-deploy.zip successfully!');
} catch (e) {
  console.warn('⚠️ Could not automatically zip cpanel-deploy directory:', e.message);
}

console.log('\n🎉 cPanel build complete!');
console.log('----------------------------------------------------');
console.log('To deploy to cPanel:');
console.log('1. Upload "cpanel-deploy.zip" directly to your cPanel File Manager in your app directory.');
console.log('2. Extract "cpanel-deploy.zip".');
console.log('3. In cPanel, navigate to "Setup Node.js App".');
console.log('4. Create a new app:');
console.log('   - Node.js Version: 18.x or 20.x+');
console.log('   - Application Mode: Production');
console.log('   - Application root: [your uploaded folder]');
console.log('   - Application startup file: server.js');
console.log('5. Copy .env.example to .env and configure your DATABASE_URL, PORT, JWT_SECRET, etc.');
console.log('6. Click "Run NPM Install" from the cPanel Node.js App interface.');
console.log('7. Click "Restart" / "Start Application"!');
console.log('----------------------------------------------------');
