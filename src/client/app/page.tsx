"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, BarChart3, Users, Landmark, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Background radial gradient glow effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl w-full mx-auto flex justify-between items-center py-4 relative z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary border border-brand-primary/20">
            <ShieldCheck size={20} />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">360 STAR</span>
        </div>
        <Link href="/auth/login">
          <span className="text-xs font-bold text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] backdrop-blur-md px-4 py-2 rounded-xl transition-all cursor-pointer">
            Access Workspace
          </span>
        </Link>
      </header>

      {/* Hero section */}
      <main className="max-w-4xl w-full mx-auto text-center my-auto py-16 relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-brand-primary/20 uppercase tracking-widest inline-block select-none">
            Enterprise Financial CRM
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Secure Capital Routing & <br />
            <span className="text-brand-primary">Downline Tree Logistics</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Redefining portfolio yield proration, multi-level commission logs, and secure ledger audits for corporate referrers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center gap-4 select-none"
        >
          
          <Link href="/auth/login">
            <span className="bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider">
              Operator Sign In
            </span>
          </Link>
        </motion.div>

        {/* Feature Highlights Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left"
        >
          <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary w-fit">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">Prorated ROI sharing</h3>
            <p className="text-[11px] text-gray-400 leading-normal">Accrue prorated capital growth distributed across active client cycles twice monthly.</p>
          </div>

          <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-405 w-fit">
              <Users size={18} />
            </div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">7-Level downlines</h3>
            <p className="text-[11px] text-gray-400 leading-normal">Visualize manager hierarchies, lineage paths, and partner placements dynamically.</p>
          </div>

          <div className="bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-3">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-555 w-fit">
              <Landmark size={18} />
            </div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">Audit compliance</h3>
            <p className="text-[11px] text-gray-400 leading-normal">Secure configuration controls, batch releases, and immutable action audit trails.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto text-center py-4 border-t border-white/5 text-[10px] text-gray-500 select-none">
        © {new Date().getFullYear()} 360 Star Solutions. All rights reserved. Enterprise Gateway v1.0.0.
      </footer>
    </div>
  );
}

