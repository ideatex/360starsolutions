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
      className="space-y-6 max-w-7xl mx-auto font-outfit"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Referral Network</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit, zoom, and inspect your downline partner tree node volumes.</p>
      </div>

      {/* Tree Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Downline</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Active</p>
          </div>
        </div>
        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team Volume</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Tracking</p>
          </div>
        </div>
        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-success-50 dark:bg-success-500/15 text-success-600 dark:text-success-400 rounded-xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Network Health</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Healthy</p>
          </div>
        </div>
      </div>

      <div className="app-card p-6 min-h-[500px]">
        <ReferralTree />
      </div>
    </motion.div>
  );
}
