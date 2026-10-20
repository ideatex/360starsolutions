const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Packaging Hostinger deployment zip...');

const projectRoot = path.join(__dirname, '..');

// 1. Ensure dist/server/main.js exists
const distServerMain = path.join(projectRoot, 'dist', 'server', 'main.js');
if (!fs.existsSync(distServerMain)) {
  console.log('dist/server/main.js missing, building server...');
  execSync('npm run build:server', { cwd: projectRoot, stdio: 'inherit' });
}

// 2. Ensure dist/client is populated
const distClientDir = path.join(projectRoot, 'dist', 'client');
const clientOutDir = path.join(projectRoot, 'src', 'client', 'out');
const publicDir = path.join(projectRoot, 'public');

if (!fs.existsSync(distClientDir)) {
  fs.mkdirSync(distClientDir, { recursive: true });
}
if (fs.existsSync(clientOutDir)) {
  fs.cpSync(clientOutDir, distClientDir, { recursive: true });
  console.log('✅ Copied src/client/out into dist/client');
}
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distClientDir, { recursive: true });
  console.log('✅ Copied public into dist/client');
}

// 3. Ensure root server/main.js exists as wrapper
const rootServerDir = path.join(projectRoot, 'server');
if (!fs.existsSync(rootServerDir)) {
  fs.mkdirSync(rootServerDir, { recursive: true });
}
const rootServerMain = path.join(rootServerDir, 'main.js');
const rootServerMainContent = `const fs = require('fs');
const path = require('path');

// Automatically load .env if present
if (fs.existsSync('.env')) {
  try {
    process.loadEnvFile?.('.env');
  } catch (e) {}
}

// Sanitize DATABASE_URL
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if (url.startsWith('DATABASE_URL=')) {
    url = url.slice('DATABASE_URL='.length).trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }
  if (url.includes('.pooler.supabase.com:6543')) {
    url = url.replace(':6543', ':5432');
  }
  if (url.includes('supabase.com') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  process.env.DATABASE_URL = url;
}

const distServerMain = path.join(__dirname, '..', 'dist', 'server', 'main.js');
const localDistServerMain = path.join(__dirname, 'dist', 'server', 'main.js');
const rootMain = path.join(__dirname, '..', 'main.js');

if (fs.existsSync(distServerMain)) {
  require(distServerMain);
} else if (fs.existsSync(localDistServerMain)) {
  require(localDistServerMain);
} else if (fs.existsSync(rootMain)) {
  require(rootMain);
} else {
  require('./main.js');
}
`;
fs.writeFileSync(rootServerMain, rootServerMainContent, 'utf8');

// 4. Ensure dist/main.js exists
const distMain = path.join(projectRoot, 'dist', 'main.js');
const distMainContent = `const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
  try {
    process.loadEnvFile?.(path.join(__dirname, '..', '.env'));
  } catch (e) {}
}

if (fs.existsSync(path.join(__dirname, 'server', 'main.js'))) {
  require(path.join(__dirname, 'server', 'main.js'));
} else if (fs.existsSync(path.join(__dirname, '..', 'dist', 'server', 'main.js'))) {
  require(path.join(__dirname, '..', 'dist', 'server', 'main.js'));
} else if (fs.existsSync(path.join(__dirname, '..', 'main.js'))) {
  require(path.join(__dirname, '..', 'main.js'));
}
`;
fs.writeFileSync(distMain, distMainContent, 'utf8');

// Prepare temp folder
const tempDir = path.join(__dirname, 'hostinger-temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

// Items to copy into package
const itemsToInclude = [
  'dist',
  'server',
  'public',
  'prisma',
  'package.json',
  'package-lock.json',
  '.env',
  'main.js',
  'seed.js',
  'seed-config.js'
];

for (const item of itemsToInclude) {
  const src = path.join(projectRoot, item);
  const dest = path.join(tempDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Included ${item}`);
  } else {
    console.warn(`Warning: ${item} not found!`);
  }
}

// Sanity checks on staged files
const criticalFiles = [
  path.join(tempDir, 'dist', 'server', 'main.js'),
  path.join(tempDir, 'server', 'main.js'),
  path.join(tempDir, 'dist', 'main.js'),
  path.join(tempDir, 'main.js'),
  path.join(tempDir, 'dist', 'client', 'index.html'),
  path.join(tempDir, 'prisma', 'schema.prisma')
];

for (const f of criticalFiles) {
  if (!fs.existsSync(f)) {
    console.error(`❌ CRITICAL ERROR: Staged file missing: ${f}`);
    process.exit(1);
  }
}
console.log('✅ All critical entrypoints verified in staging directory!');

const zipOut = path.join(projectRoot, 'hostinger-deploy.zip');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

// Compress
console.log('Compressing into hostinger-deploy.zip...');
const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipOut}' -Force"`;
execSync(psCmd, { stdio: 'inherit' });

// Cleanup tempDir
fs.rmSync(tempDir, { recursive: true, force: true });

const stats = fs.statSync(zipOut);
console.log(`🎉 Successfully created hostinger-deploy.zip (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
