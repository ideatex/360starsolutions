"use client";

import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 py-12 relative z-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Brand Summary */}
        <div className="md:col-span-4 space-y-4">
          <img src="/logo-360.png" alt="360 Star Logo" className="h-10 w-auto object-contain" />
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Visionary financial guidance, strategic planning, and wealth architecting for long-term stability across generations.
          </p>
          <div className="pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Managing Director</span>
            <p className="text-xs font-black text-slate-900">RAGUL SIDDARTH</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="md:col-span-4 space-y-3 text-xs text-slate-600 font-medium">
          <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Corporate Office</h4>
          
          <div className="flex items-start gap-2 text-slate-600">
            <MapPin size={15} className="text-brand-primary shrink-0 mt-0.5" />
            <span>Raheja Towers, 10th Upper Floor, MG Road, Bengaluru - 560001</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone size={15} className="text-brand-primary shrink-0" />
            <div className="space-x-2">
              <a href="tel:+919164191641" className="hover:text-brand-primary font-bold">+91 91641 91641</a>
              <span>•</span>
              <a href="tel:+919364000360" className="hover:text-brand-primary font-bold">+91 93640 00360</a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Mail size={15} className="text-brand-primary shrink-0" />
            <a href="mailto:360starsolutions@gmail.com" className="hover:text-brand-primary font-bold">360starsolutions@gmail.com</a>
          </div>
        </div>

        {/* Quick Links & Socials */}
        <div className="md:col-span-4 space-y-3">
          <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Quick Navigation</h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
            <Link href="/" className="hover:text-brand-primary transition-colors">Home</Link>
            <Link href="/story" className="hover:text-brand-primary transition-colors">Our Story</Link>
            <Link href="/about" className="hover:text-brand-primary transition-colors">How It Started</Link>
            <Link href="/founder" className="hover:text-brand-primary transition-colors">Founder's Journey</Link>
            <Link href="/pillars" className="hover:text-brand-primary transition-colors">Core Pillars</Link>
            <Link href="/solutions" className="hover:text-brand-primary transition-colors">Our Solutions</Link>
            <Link href="/contact" className="hover:text-brand-primary transition-colors">Contact Us</Link>
            <Link href="/auth/login" className="hover:text-brand-primary transition-colors text-brand-primary">Portal Login</Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <a href="https://360starsolutions.com/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors" title="Website"><Globe size={15} /></a>
            <a href="https://in.linkedin.com/company/360starsolutions" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors" title="LinkedIn"><LinkedinIcon size={15} /></a>
            <a href="https://www.instagram.com/360starsolution/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors" title="Instagram"><InstagramIcon size={15} /></a>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 font-medium gap-2">
        <p>© {new Date().getFullYear()} 360 Star Solutions. All rights reserved.</p>
        <p>Raheja Towers, MG Road, Bengaluru - 560001</p>
      </div>
    </footer>
  );
}

function LinkedinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}
