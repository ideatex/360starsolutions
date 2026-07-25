"use client";

import React from 'react';
import ReferralTree from '@/components/ReferralTree';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Activity } from 'lucide-react';

export default function ReferralTreePage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Referral Network</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit, zoom, and inspect your downline partner tree node volumes.</p>
      </div>

      {/* Tree Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Downline</p>
            <p className="text-xl font-bold text-foreground mt-0.5">Active</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-brand-accent/10 text-brand-accent rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Team Volume</p>
            <p className="text-xl font-bold text-foreground mt-0.5">Tracking</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-brand-success/10 text-brand-success rounded-xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Health</p>
            <p className="text-xl font-bold text-foreground mt-0.5">Healthy</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm min-h-[500px]">
        <ReferralTree />
      </div>
    </motion.div>
  );
}
