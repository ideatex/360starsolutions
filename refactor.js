const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src'),
  path.join(__dirname, 'prisma')
];

const extensions = ['.ts', '.tsx', '.prisma', '.json', '.css'];

const replacements = [
  { regex: /\buserId\b/g, to: 'shareholderId' },
  { regex: /\bUserId\b/g, to: 'ShareholderId' },
  { regex: /\btotalUsers\b/g, to: 'totalShareholders' },
  { regex: /\bTotalUsers\b/g, to: 'TotalShareholders' },
  { regex: /\bactiveUsers\b/g, to: 'activeShareholders' },
  { regex: /\bActiveUsers\b/g, to: 'ActiveShareholders' },
  { regex: /\bUSERS\b/g, to: 'SHAREHOLDERS' },
  { regex: /\bUSER\b/g, to: 'SHAREHOLDER' },
  { regex: /\bUsers\b/g, to: 'Shareholders' },
  { regex: /\bUser\b/g, to: 'Shareholder' },
  { regex: /\busers\b/g, to: 'shareholders' },
  { regex: /\buser\b/g, to: 'shareholder' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  for (const {regex, to} of replacements) {
    content = content.replace(regex, to);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

function traverseAndProcess(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseAndProcess(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

targetDirs.forEach(dir => traverseAndProcess(dir));

// Renaming directories and files
function renamePaths(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      renamePaths(fullPath); // Bottom up
    }
    
    let newItem = item;
    
    // We only replace 'users' to 'shareholders' and 'user' to 'shareholder'
    if (newItem.includes('users')) {
      newItem = newItem.replace(/users/g, 'shareholders');
    } else if (newItem.includes('user')) {
      newItem = newItem.replace(/user/g, 'shareholder');
    }
    
    if (newItem !== item) {
      const newPath = path.join(dir, newItem);
      fs.renameSync(fullPath, newPath);
    }
  }
}

targetDirs.forEach(dir => renamePaths(dir));

console.log("Refactoring complete.");
