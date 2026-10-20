const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const clientAppDir = path.join(baseDir, 'src', 'client', 'app');
const backupDir = path.join(baseDir, 'src', 'client', 'preserved_360_pages');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const pages = ['story', 'about', 'founder', 'pillars', 'solutions', 'contact'];

pages.forEach((p) => {
  const pageFile = path.join(clientAppDir, p, 'page.tsx');
  const backupFile = path.join(backupDir, `${p}.page.tsx`);
  
  if (fs.existsSync(pageFile) && !fs.existsSync(backupFile)) {
    fs.copyFileSync(pageFile, backupFile);
    console.log(`Backed up ${p} to ${backupFile}`);
  }

  // Write clean redirect
  const redirectCode = `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 360 Star Solutions page temporarily hidden (Full original code preserved in src/client/preserved_360_pages/${p}.page.tsx)
export default function Hidden${p.charAt(0).toUpperCase() + p.slice(1)}Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-sans">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold">Redirecting to 369portfolio.com...</p>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync(pageFile, redirectCode, 'utf8');
  console.log(`Wrote clean redirect for ${p}`);
});

// Also backup original home page
if (fs.existsSync(path.join(baseDir, 'orig_files', 'page.tsx.orig'))) {
  fs.copyFileSync(
    path.join(baseDir, 'orig_files', 'page.tsx.orig'),
    path.join(backupDir, 'home.page.tsx')
  );
  console.log(`Backed up original home page to ${path.join(backupDir, 'home.page.tsx')}`);
}
