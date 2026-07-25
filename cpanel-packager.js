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
  'seed.js'
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

console.log('\n🎉 cPanel build complete!');
console.log('----------------------------------------------------');
console.log('To deploy to cPanel:');
console.log('1. Zip the contents of the "cpanel-deploy" folder (not the folder itself).');
console.log('2. Upload and extract it to your cPanel File Manager.');
console.log('3. In cPanel, go to "Setup Node.js App".');
console.log('4. Create a new app:');
console.log('   - Application root: [your uploaded folder]');
console.log('   - Application startup file: server.js');
console.log('5. Copy .env.example to .env and configure your database credentials.');
console.log('6. Run NPM Install from the cPanel Node.js interface.');
console.log('7. Start the application!');
console.log('----------------------------------------------------');
