"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { 
  Award, Globe, MapPin, Briefcase, TrendingUp, Sparkles, 
  Quote, ArrowRight, CheckCircle2, ShieldCheck, Heart, UserCheck, Users
} from 'lucide-react';

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      <PublicHeader />

      <main className="relative z-10 space-y-16 py-12 max-w-5xl mx-auto px-6 w-full">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-extrabold px-4 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-wider select-none">
            <Award className="w-3.5 h-3.5" /> Founder & Visionary Architect
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Founder’s Journey</h1>
          <p className="text-brand-primary font-bold text-xl">Ragul Siddarth</p>
          <p className="text-slate-600 text-sm font-medium">Founder of Guru of the Universe | 36,000+ Empowered Clients | 50+ Financial Team Members</p>
        </motion.div>

        {/* Highlight Quote Box */}
        <div className="bg-gradient-to-r from-brand-primary/15 via-brand-primary/10 to-brand-primary/5 p-8 sm:p-12 rounded-3xl border border-brand-primary/20 shadow-xs relative overflow-hidden">
          <Quote className="w-16 h-16 text-brand-primary/20 absolute top-4 left-4 pointer-events-none" />
          <div className="relative z-10 space-y-4 text-center max-w-3xl mx-auto">
            <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug italic">
              "There are many financial companies and even more offerings. At the end of the day, the customers should be the ones who get the justice. We make sure of that."
            </p>
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand-primary">— Ragul Siddarth</p>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-8">
          
          {/* Section 1: The Origin */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Phase 01</span>
                <h2 className="text-2xl font-extrabold text-slate-900">The Origin</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Born in Krishnagiri and raised dynamically across Tamil Nadu, Ragul Siddarth developed an early adaptability that would define his future. Chennai became the launching ground for his illustrious career.
            </p>
          </div>

          {/* Section 2: Professional Ascent */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Phase 02</span>
                <h2 className="text-2xl font-extrabold text-slate-900">Professional Ascent</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Beginning in 2005 as a Territory Sales Leader at American Express Bank, his trajectory accelerated rapidly during a six-year tenure at Max New York Life Insurance. Rising to Associate Vice President by 2010, he demonstrated exceptional leadership by mentoring and managing teams of over 30 financial managers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-primary shrink-0" /> American Express Bank Territory Sales Leader (2005)
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-primary shrink-0" /> Max New York Life AVP (2010) — 30+ Financial Managers
              </div>
            </div>
          </div>

          {/* Section 3: The Visionary Leap */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Phase 03</span>
                <h2 className="text-2xl font-extrabold text-slate-900">The Visionary Leap</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              In 2011, recognizing the profound possibilities of merging financial strategy with spiritual guidance, he founded Guru of the Universe. Driven by immense gratitude and a desire to bring these opportunities to everyone, he has since empowered more than 36,000 clients while leading a dedicated 50+ member team of financial managers and support staff.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 text-xs font-bold text-brand-primary flex items-center gap-2">
                <UserCheck size={18} /> 36,000+ Empowered Clients
              </div>
              <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 text-xs font-bold text-brand-primary flex items-center gap-2">
                <Users size={18} /> 50+ Expert Team Members
              </div>
            </div>
          </div>

          {/* Section 4: Global Impact & Expertise */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Phase 04</span>
                <h2 className="text-2xl font-extrabold text-slate-900">Global Impact & Expertise</h2>
              </div>
            </div>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              His authority in the field is widely recognized, from being featured in India Today for his investment insights to receiving multiple invites to the prestigious Million Dollar Round Table and Court of the Table in the US and Canada. As a dual-certified Advance NLP Practitioner, Life Coach, and Level 3 Kriya Yoga practitioner, his holistic approach spans diverse industries including healthcare, real estate, and banking.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs font-extrabold bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200">Featured in India Today</span>
              <span className="text-xs font-extrabold bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200">Million Dollar Round Table (MDRT)</span>
              <span className="text-xs font-extrabold bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200">Court of the Table (US & Canada)</span>
              <span className="text-xs font-extrabold bg-brand-primary/10 text-brand-primary px-3.5 py-1.5 rounded-full border border-brand-primary/20">Advance NLP Practitioner</span>
              <span className="text-xs font-extrabold bg-brand-primary/10 text-brand-primary px-3.5 py-1.5 rounded-full border border-brand-primary/20">Certified Life Coach</span>
              <span className="text-xs font-extrabold bg-brand-primary/10 text-brand-primary px-3.5 py-1.5 rounded-full border border-brand-primary/20">Level 3 Kriya Yoga Practitioner</span>
            </div>
          </div>

          {/* Section 5: The Ultimate Mission */}
          <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/20 text-brand-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">Final Mission</span>
                <h2 className="text-2xl font-extrabold text-white">The Ultimate Mission</h2>
              </div>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
              He goes beyond traditional financial planning to help individuals discover a life of true abundance. By aligning powerful goal-setting with tax-favored financial security, he bridges the gap between material wealth and spiritual self-realization.
            </p>
          </div>

        </div>

        {/* CTA Banner */}
        <div className="text-center pt-4">
          <Link href="/auth/login">
            <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
              Sign In to Portal <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
