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
      className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 font-sans"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Dynamic Referral Unlock (L1–L12)
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Product 360
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Levels unlock dynamically based on your direct referral count: 1 Direct → L1-L3, 2 Directs → L1-L6, 3 Directs → L1-L9, 4 Directs → L1-L12.
          </p>
        </div>
        <div className="px-4 py-2 bg-secondary/40 backdrop-blur-md rounded-xl border border-border flex items-center gap-2 shadow-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-foreground">
            {summary.isOverridden ? 'Admin Level Override Active' : 'Dynamic Unlock Engine Active'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Unlocked Levels</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            L1 to L{summary.totalQualifiedLevels}
          </p>
          <p className="text-xs text-muted-foreground font-semibold">Of 12 Total Levels</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Direct Referrals</span>
          <p className="text-2xl font-black text-brand-primary">
            {summary.directReferralsCount}
          </p>
          <p className="text-xs text-muted-foreground font-semibold">
            {summary.directReferralsCount >= 4 ? 'Maximum tier achieved!' : `${summary.additionalDirectsNeeded} more needed for next tier`}
          </p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Downline Business Volume</span>
          <p className="text-2xl font-black text-foreground">
            ₹{summary.overallBusinessVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground font-semibold">Cumulative Approved Funds</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Next Unlock Target</span>
          <p className="text-2xl font-black text-amber-500">
            {summary.nextTargetLevelRange || 'Max (L12)'}
          </p>
          <p className="text-xs text-muted-foreground font-semibold">
            {summary.additionalDirectsNeeded > 0 ? `Sponsor ${summary.additionalDirectsNeeded} more member(s)` : 'Fully Unlocked'}
          </p>
        </div>
      </div>

      {/* Dynamic Levels Table */}
      <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead className="bg-muted/40 text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Gratitude Rate</th>
                <th className="px-6 py-4">Directs Required</th>
                <th className="px-6 py-4">Network Members</th>
                <th className="px-6 py-4">Downline Volume</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-medium bg-card">
              {progressData.map((level: any) => {
                const isUnlocked = level.status === 'UNLOCKED';
                return (
                  <tr key={level.level} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isUnlocked ? 'bg-emerald-500/15 text-emerald-600' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {isUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <span>Level {level.level}</span>
                    </td>
                    <td className="px-6 py-4 font-black text-brand-primary">
                      {level.profitPercentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-semibold">
                      {level.requiredDirects} Direct Referral{level.requiredDirects > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {level.membersCount} member{level.membersCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      ₹{level.currentVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isUnlocked
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-secondary text-muted-foreground border-border'
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
