"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { BookOpen, Sparkles, ArrowRight, HeartHandshake, CheckCircle2 } from 'lucide-react';

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      <PublicHeader />

      <main className="relative z-10 space-y-16 py-12 max-w-5xl mx-auto px-6 w-full">
        {/* Banner Header */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-extrabold px-4 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-wider select-none">
            <BookOpen className="w-3.5 h-3.5" /> Founding Narrative
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Our Story</h1>
          <p className="text-brand-primary text-xl font-bold">The Genesis</p>
        </motion.div>

        {/* Narrative Feature Card */}
        <div className="bg-gradient-to-br from-brand-primary/10 via-white to-white border border-brand-primary/20 p-8 sm:p-14 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6 text-slate-700 text-base sm:text-lg leading-relaxed font-medium">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              "It all began when a financial planning professional discovered the wondrous, far-reaching possibilities of his service."
            </p>
            <p>
              Recognizing that these opportunities held the power to uplift everyone, the mission became clear: this knowledge had to be shared.
            </p>
            <p className="text-sm text-slate-600">
              What started as a single professional insight grew into a dedicated organization committed to structuring wealth creation and securing futures for individuals and families across generations.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-primary">
              <CheckCircle2 size={16} /> Knowledge Sharing & Visionary Empowerment
            </div>
            <Link href="/about">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-6 py-3 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Discover How It Started <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
