const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  // Revert component tags
  content = content.replace(/<Shareholders/g, '<Users');
  content = content.replace(/<\/Shareholders>/g, '</Users>');
  content = content.replace(/<Shareholder( |\/|>)/g, '<User$1');
  content = content.replace(/<\/Shareholder>/g, '</User>');
  
  // Revert import lines for lucide-react
  if (content.includes('lucide-react')) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('lucide-react')) {
              lines[i] = lines[i].replace(/\bShareholders\b/g, 'Users');
              lines[i] = lines[i].replace(/\bShareholder\b/g, 'User');
          }
      }
      content = lines.join('\n');
  }

  // Backend unique constraints fixes
  content = content.replace(/announcementId_userId/g, 'announcementId_shareholderId');
  content = content.replace(/userId_level/g, 'shareholderId_level');
  content = content.replace(/parentId_childId/g, 'parentId_childId'); // just in case
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        processFile(fullPath);
      }
    }
  }
}

traverse(path.join(__dirname, 'src'));
console.log("Fixes applied.");
