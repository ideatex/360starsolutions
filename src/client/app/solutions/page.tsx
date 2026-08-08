"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { TrendingUp, Shield, Target, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function SolutionsPage() {
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
            <Sparkles className="w-3.5 h-3.5" /> Fortune-Maker Strategic Guidance
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Our Solutions</h1>
          <p className="text-brand-primary font-bold text-lg">A Fortune-Maker, Lighting the Way to Great Futures</p>
        </motion.div>

        {/* Feature Spotlight Card */}
        <div className="bg-slate-900 text-white p-8 sm:p-14 rounded-3xl shadow-xl space-y-8 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4 text-slate-200 text-base sm:text-lg leading-relaxed font-medium relative z-10">
            <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
              "We have been providing visionary financial guidance to individuals for a better tomorrow. What we do is negate concerns."
            </p>
            <p className="text-slate-300 text-sm sm:text-base">
              Life naturally brings worries about the prospects and demands of the future, but we resolve these uncertainties right now.
            </p>
            <p className="text-slate-300 text-sm sm:text-base">
              We formulate long-term, strategic solutions that make your tomorrows highly welcoming. Through our guidance, you can ensure financial stability for your family across generations and control future liabilities with a few smart moves in the present.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10 relative z-10">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-brand-primary font-extrabold text-sm">
                <Shield size={18} /> Family Stability
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Ensure financial stability for your family across generations through strategic capital preservation.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-brand-primary font-extrabold text-sm">
                <Target size={18} /> Proactive Liabilities Control
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Control future liabilities with a few smart moves in the present right now for total peace of mind.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <span className="text-xs text-slate-400 font-medium">
              Start building your generational financial roadmap today.
            </span>
            <Link href="/auth/login">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Sign In to Access Portal <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
