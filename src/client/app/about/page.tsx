"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Compass, Award, Sparkles, ArrowRight, CheckCircle2, Quote, UserCheck } from 'lucide-react';

export default function AboutPage() {
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
            <Compass className="w-3.5 h-3.5" /> Founding Philosophy
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">How It Started</h1>
          <p className="text-slate-600 text-sm font-medium">The Vision & Origin of Guru of the Universe</p>
        </motion.div>

        {/* Founder Card */}
        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                Founder Profile
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">Ragul Siddarth</h2>
              <p className="text-xs text-slate-500 font-medium">Founder & Financial Architect</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
              <Award className="w-6 h-6 text-brand-primary" />
              <span className="text-xs font-extrabold text-slate-800">Guru of the Universe</span>
            </div>
          </div>

          <div className="space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
            <p>
              <strong>Guru of the Universe</strong> was founded by <strong>Ragul Siddarth</strong> with a simple, profound objective: to connect seekers to exactly what they are looking for—and often, to something even better!
            </p>
            <p>
              Leveraging an exemplary career in finance, our founder masters the complex permutations and combinations of wealth creation. We brighten futures by seamlessly blending investments, strategic planning, and spiritual guidance.
            </p>
          </div>

          {/* Quote Banner */}
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 p-6 rounded-2xl border border-brand-primary/20 space-y-2 relative">
            <Quote className="w-8 h-8 text-brand-primary/20 absolute top-3 left-3 pointer-events-none" />
            <p className="text-sm font-bold text-slate-900 italic pl-6">
              "There are many financial companies and even more offerings. At the end of the day, the customers should be the ones who get the justice. We make sure of that."
            </p>
            <p className="text-[10px] font-extrabold text-brand-primary uppercase text-right">— Ragul Siddarth</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" /> Wealth Permutations
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Mastering complex financial formulas to optimize returns, manage risk, and architect sustainable long-term portfolios.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" /> Holistic Guidance
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Combining strategic investments and rigorous financial planning with spiritual clarity and purpose.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Link href="/founder" className="text-xs font-extrabold text-brand-primary hover:underline flex items-center gap-1.5">
              <UserCheck size={16} /> Read Full Founder’s Journey Biography
            </Link>
            <Link href="/pillars">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-6 py-3 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Explore Our Core Pillars <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
