const fs = require('fs');
const path = require('path');

const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));

const mergedPkg = {
  name: "360-star-solutions",
  version: "1.0.0",
  private: true,
  scripts: {
    "dev:next": "next dev src/client",
    "dev:nest": "nest start --watch",
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:nest\"",
    "build:client": "next build",
    "build:server": "nest build",
    "build": "npm run build:client && npm run build:server",
    "start": "node dist/server/main.js"
  },
  dependencies: {
    ...frontendPkg.dependencies,
    ...backendPkg.dependencies,
    "concurrently": "^8.2.2"
  },
  devDependencies: {
    ...frontendPkg.devDependencies,
    ...backendPkg.devDependencies
  }
};

fs.writeFileSync('package.json', JSON.stringify(mergedPkg, null, 2));
console.log('Merged package.json written to root');
