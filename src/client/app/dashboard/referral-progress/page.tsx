"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Target, Lock, CheckCircle2, Clock, TrendingUp, Award, Activity, AlertCircle, RefreshCw, Users, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReferralProgressPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['referralProgress'],
    queryFn: async () => {
      const res = await api.get('/referral-progress');
      return res.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-8 w-64 bg-secondary/50 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary/20 rounded-2xl border border-border"></div>
          ))}
        </div>
        <div className="h-[400px] bg-secondary/10 rounded-2xl border border-border mt-8"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Unable to Load Progress</h2>
          <p className="text-muted-foreground mt-2">There was an issue fetching your referral progress data.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const progressData = data?.progress || [];
  const summary = data?.summary || {
    totalQualifiedLevels: 3,
    currentActiveLevel: 3,
    currentActiveLevelName: 'Levels 1 to 3',
    overallBusinessVolume: 0,
    overallProgressPercentage: 25,
    directReferralsCount: 0,
    isOverridden: false,
    nextUnlockTarget: 6,
    nextTargetLevelRange: 'Levels 4 to 6',
    additionalDirectsNeeded: 1,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-7xl mx-auto space-y-6 pb-12 font-outfit"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Dynamic Referral Unlock (L1–L12)
            </h1>
            <span className="badge-brand">
              Product 360
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Levels unlock dynamically based on your direct referral count: 1 Direct → L1-L3, 2 Directs → L1-L6, 3 Directs → L1-L9, 4 Directs → L1-L12.
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-success-500" />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {summary.isOverridden ? 'Admin Level Override Active' : 'Dynamic Unlock Engine Active'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-5 space-y-1.5">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Unlocked Levels</span>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">
            L1 to L{summary.totalQualifiedLevels}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Of 12 Total Levels</p>
        </div>

        <div className="app-card p-5 space-y-1.5">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Direct Referrals</span>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {summary.directReferralsCount}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            {summary.directReferralsCount >= 4 ? 'Maximum tier achieved!' : `${summary.additionalDirectsNeeded} more needed for next tier`}
          </p>
        </div>

        <div className="app-card p-5 space-y-1.5">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Downline Business Volume</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₹{summary.overallBusinessVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Cumulative Approved Funds</p>
        </div>

        <div className="app-card p-5 space-y-1.5">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Next Unlock Target</span>
          <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
            {summary.nextTargetLevelRange || 'Max (L12)'}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            {summary.additionalDirectsNeeded > 0 ? `Sponsor ${summary.additionalDirectsNeeded} more member(s)` : 'Fully Unlocked'}
          </p>
        </div>
      </div>

      {/* Dynamic Levels Table */}
      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Gratitude Rate</th>
                <th className="px-6 py-4">Directs Required</th>
                <th className="px-6 py-4">Network Members</th>
                <th className="px-6 py-4">Downline Volume</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200 font-medium">
              {progressData.map((level: any) => {
                const isUnlocked = level.status === 'UNLOCKED';
                return (
                  <tr key={level.level} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isUnlocked ? 'bg-success-50 dark:bg-success-500/15 text-success-600 dark:text-success-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {isUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <span className="text-gray-900 dark:text-white">Level {level.level}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">
                      {level.profitPercentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {level.requiredDirects} Direct Referral{level.requiredDirects > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {level.membersCount} member{level.membersCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      ₹{level.currentVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        isUnlocked
                          ? 'badge-success'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}>
                        {level.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
