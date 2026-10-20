const fs = require('fs');
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
