const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('hostinger-deploy.zip').Entries | ForEach-Object { $_.FullName }"`;
const output = execSync(psCmd, { encoding: 'utf8' });
const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
console.log('Total entries in zip:', lines.length);
console.log('Sample entries matching main.js or server:');
lines.filter(l => l.includes('main.js') || l.startsWith('dist/server') || l.startsWith('server')).forEach(l => console.log(' -', l));
