"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      <PublicHeader />

      <main className="relative z-10 space-y-16 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary text-[11px] font-extrabold px-4 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-wider select-none">
              <Sparkles className="w-3.5 h-3.5" /> Enterprise Financial CRM & Referral Platform
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Secure Capital Routing & <br />
              <span className="text-brand-primary">Downline Tree Logistics</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              Redefining portfolio yield proration, multi-level commission logs, and secure ledger audits for corporate referrers and shareholders.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap justify-center gap-4 select-none pt-2"
          >
            <Link href="/auth/login">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-md shadow-brand-primary/20 text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Access Workspace <ArrowRight size={14} />
              </span>
            </Link>
            <Link href="/solutions">
              <span className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-extrabold px-7 py-3.5 rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Explore Solutions
              </span>
            </Link>
          </motion.div>
        </section>

        {/* Core Pillars / Feature Highlights Grid */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
              Core Pillars
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Built on Value, Analysis & Elite Management
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              Formulating long-term strategic solutions that empower generational stability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Optimal Value Structuring</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Custom-tailored financial solutions backed by transparent fee structures and maximized returns.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary pt-2">
                <CheckCircle2 size={14} /> Transparent Pricing
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Finance Analysis & Growth</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Meticulous need-and-want architecture, cash flow evaluations, and predictive risk assessment.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary pt-2">
                <CheckCircle2 size={14} /> Strategic Growth Modeling
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20">
                <Users size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Professional Advisory Team</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Supported by seasoned financial planners and managers with decades of collective experience.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary pt-2">
                <CheckCircle2 size={14} /> Elite Management Support
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="bg-slate-900 text-white p-8 sm:p-12 rounded-3xl shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10 text-center sm:text-left max-w-xl">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E2B774] bg-[#E2B774]/10 px-3 py-1 rounded-full border border-[#E2B774]/20">
              Get Started
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ready to Access Your Portal?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              Log in to manage your shareholder portfolio, track referral progress, and review live payouts.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <Link href="/auth/login">
              <span className="bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold px-6 py-3.5 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2">
                Sign In Now <ArrowRight size={14} />
              </span>
            </Link>
            <Link href="/contact">
              <span className="bg-white/10 hover:bg-white/15 text-white font-extrabold px-6 py-3.5 rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-2 border border-white/10">
                Contact Us
              </span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
