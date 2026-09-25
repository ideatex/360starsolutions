const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Packaging Hostinger deployment zip...');

// Target files & folders to include in hostinger-deploy.zip
const itemsToInclude = [
  'dist',
  'public',
  'prisma',
  'package.json',
  'package-lock.json',
  '.env',
  'main.js',
  'seed.js',
  'seed-config.js'
];

const tempDir = path.join(__dirname, 'hostinger-temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

// Guarantee dist/client exists and is fully populated
const distClientDir = path.join(__dirname, '..', 'dist', 'client');
const clientOutDir = path.join(__dirname, '..', 'src', 'client', 'out');
const publicDir = path.join(__dirname, '..', 'public');

if (fs.existsSync(clientOutDir)) {
  if (!fs.existsSync(distClientDir)) {
    fs.mkdirSync(distClientDir, { recursive: true });
  }
  fs.cpSync(clientOutDir, distClientDir, { recursive: true });
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distClientDir, { recursive: true });
  }
  console.log('✅ Verified and populated dist/client from src/client/out');
}

for (const item of itemsToInclude) {
  const src = path.join(__dirname, '..', item);
  const dest = path.join(tempDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Included ${item}`);
  } else {
    console.warn(`Warning: ${item} not found!`);
  }
}

// Ensure dist/main.js also exists
if (fs.existsSync(path.join(__dirname, '..', 'main.js'))) {
  fs.copyFileSync(path.join(__dirname, '..', 'main.js'), path.join(tempDir, 'dist', 'main.js'));
}

const zipOut = path.join(__dirname, '..', 'hostinger-deploy.zip');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

// Use powershell Compress-Archive to zip the contents of tempDir
const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipOut}' -Force"`;
console.log('Compressing into hostinger-deploy.zip...');
execSync(psCmd, { stdio: 'inherit' });

// Cleanup tempDir
fs.rmSync(tempDir, { recursive: true, force: true });

const stats = fs.statSync(zipOut);
console.log(`Successfully created hostinger-deploy.zip (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
