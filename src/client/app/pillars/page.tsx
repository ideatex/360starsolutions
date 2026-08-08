"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ShieldCheck, TrendingUp, Users, ArrowRight, CheckCircle2, Award } from 'lucide-react';

export default function PillarsPage() {
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
            <ShieldCheck className="w-3.5 h-3.5" /> Foundation of Excellence
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Our Core Pillars</h1>
          <p className="text-slate-600 text-sm font-medium">Built on optimal value, rigorous analysis, and elite professional management</p>
        </motion.div>

        {/* 3 Pillars In-Depth */}
        <div className="space-y-8">
          
          {/* Pillar 1 */}
          <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 shrink-0">
                <TagIcon size={26} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Pillar 01</span>
                <h2 className="text-2xl font-extrabold text-slate-900">Best Price Guaranteed</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              We provide custom-tailored solutions backed by a commitment to optimal value. Our pricing strategy ensures that every client receives maximal returns and transparent fee structures without hidden costs.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-primary pt-2">
              <CheckCircle2 size={16} /> Transparent Pricing & Custom Tailored Values
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 shrink-0">
                <TrendingUp size={26} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Pillar 02</span>
                <h2 className="text-2xl font-extrabold text-slate-900">Finance Analysis</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              We meticulously analyze your unique needs and wants to architect the perfect plan. Through detailed cash flow evaluations, risk assessment, and growth modeling, we design strategies tailored to your exact life goals.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-primary pt-2">
              <CheckCircle2 size={16} /> Precision Need & Want Architecture
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 shrink-0">
                <Users size={26} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Pillar 03</span>
                <h2 className="text-2xl font-extrabold text-slate-900">Professional Team</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              You are supported by an elite group of expert financial planners and managers. Our seasoned professionals bring decades of market experience to guide your portfolio and protect your assets.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-primary pt-2">
              <CheckCircle2 size={16} /> Elite Financial Planners & Managers
            </div>
          </div>

        </div>

        <div className="text-center pt-4">
          <Link href="/solutions">
            <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
              Explore Our Solutions <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function TagIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
