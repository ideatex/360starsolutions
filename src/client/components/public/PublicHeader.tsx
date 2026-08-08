"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export function PublicHeader() {
  const pathname = usePathname();

  const links = [
    { name: 'Home', href: '/' },
    { name: 'Our Story', href: '/story' },
    { name: 'How It Started', href: '/about' },
    { name: "Founder's Journey", href: '/founder' },
    { name: 'Core Pillars', href: '/pillars' },
    { name: 'Our Solutions', href: '/solutions' },
    { name: 'Contact Us', href: '/contact' },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 select-none">
      <div className="max-w-7xl w-full mx-auto flex justify-between items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img 
            src="/logo-360.png" 
            alt="360 Star Logo" 
            className="h-10 w-auto object-contain max-h-11" 
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-extrabold text-slate-600">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`transition-colors py-1 ${
                  isActive 
                    ? 'text-brand-primary border-b-2 border-brand-primary' 
                    : 'hover:text-brand-primary'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <Link href="/auth/login">
          <span className="text-xs font-extrabold text-white bg-brand-primary hover:bg-brand-primary/95 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-primary/20 cursor-pointer flex items-center gap-2">
            Access Workspace <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </header>
  );
}
