const fs = require('fs');

// Automatically load .env if present
if (fs.existsSync('.env')) {
  try {
    process.loadEnvFile?.('.env');
  } catch (e) {}
}

// Sanitize DATABASE_URL in case of accidental quotes or prefix
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

if (fs.existsSync('./dist/server/main.js')) {
  require('./dist/server/main.js');
} else if (fs.existsSync('./server/main.js')) {
  require('./server/main.js');
} else {
  require(__dirname + '/dist/server/main.js');
}
