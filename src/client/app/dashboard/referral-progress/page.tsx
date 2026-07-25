"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Target, Lock, CheckCircle2, Clock, TrendingUp, Award, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists for tailwind classes

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
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-secondary/50 rounded-lg"></div>
          <div className="h-4 w-96 bg-secondary/30 rounded-lg"></div>
        </div>
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
          <p className="text-muted-foreground mt-2">There was an issue fetching your referral progress data. Please try again.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const progressData = data?.progress || [];
  const summary = data?.summary || {
    totalQualifiedLevels: 0,
    currentActiveLevel: 0,
    overallBusinessVolume: 0,
    overallProgressPercentage: 0,
    nextUnlockTarget: 1,
    remainingVolumeToNextLevel: 0,
  };

  const isEmpty = progressData.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Referral Progress
          </h1>
          <p className="text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Monitor your hierarchy progression and business volume to unlock highly rewarding referral levels. Data reflects aggregated business volume across your network.
          </p>
        </div>
        <div className="px-4 py-2 bg-secondary/40 backdrop-blur-md rounded-lg border border-border flex items-center gap-2 shadow-sm shrink-0">
          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse"></div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Config v{data?.configurationVersion || 1} Active
          </span>
        </div>
      </div>

      {!isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Qualified Levels"
            value={summary.totalQualifiedLevels}
            subtitle={`Current Active: ${summary.currentActiveLevelName || (summary.currentActiveLevel === 1 ? 'You' : `Level ${summary.currentActiveLevel}`)}`}
            icon={<Award className="w-5 h-5" />}
            colorClass="text-brand-success bg-brand-success/10 border-brand-success/20"
          />
          <SummaryCard
            title="Overall Volume"
            value={`₹${summary.overallBusinessVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Total active network contribution"
            icon={<Activity className="w-5 h-5" />}
            colorClass="text-brand-primary bg-brand-primary/10 border-brand-primary/20"
          />
          <SummaryCard
            title="Overall Progress"
            value={`${summary.overallProgressPercentage}%`}
            subtitle="Of maximum levels unlocked"
            icon={<TrendingUp className="w-5 h-5" />}
            colorClass="text-brand-info bg-brand-info/10 border-brand-info/20"
            progress={summary.overallProgressPercentage}
          />
          <SummaryCard
            title="Next Target Target"
            value={summary.nextUnlockTargetName || (summary.nextUnlockTarget === 1 ? 'You' : `Level ${summary.nextUnlockTarget}`)}
            subtitle={`₹${summary.remainingVolumeToNextLevel.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining`}
            icon={<Target className="w-5 h-5" />}
            colorClass="text-brand-warning bg-brand-warning/10 border-brand-warning/20"
          />
        </div>
      )}

      {isEmpty ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
            <Target className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Referral Levels Configured</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            The referral levels are currently unconfigured or unavailable. Please check back later once the system configuration is published.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-secondary/40 text-muted-foreground text-xs font-bold uppercase tracking-widest border-b border-border sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-6 py-5 whitespace-nowrap">Level</th>
                  <th className="px-6 py-5 whitespace-nowrap">Volume Required</th>
                  <th className="px-6 py-5 whitespace-nowrap">Current Volume</th>
                  <th className="px-6 py-5 whitespace-nowrap">Remaining Volume</th>
                  <th className="px-6 py-5 whitespace-nowrap">Profit %</th>
                  <th className="px-6 py-5 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground font-medium bg-card">
                <AnimatePresence>
                  {progressData.map((level: any, index: number) => {
                    const isUnlocked = level.status === 'UNLOCKED';
                    const isInProgress = level.status === 'IN PROGRESS';
                    const isLocked = level.status === 'LOCKED';

                    const progressPercent = Math.min(100, (level.currentVolume / level.requiredVolume) * 100);

                    return (
                      <motion.tr 
                        key={level.level} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-secondary/20 transition-colors duration-200"
                      >
                        <td className="px-6 py-5 align-middle">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              isUnlocked ? "bg-brand-success/15 text-brand-success" : 
                              isInProgress ? "bg-brand-primary/15 text-brand-primary" : 
                              "bg-secondary/60 text-muted-foreground"
                            )}>
                              {isUnlocked ? <CheckCircle2 className="w-5 h-5" /> : isInProgress ? <Clock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </div>
                            <div>
                              <span className="font-bold text-base block">{level.levelName || (level.level === 1 ? 'You' : `Level ${level.level}`)}</span>
                              {isLocked && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Waiting</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-semibold text-foreground/80 align-middle">
                          ₹{level.requiredVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 font-bold align-middle">
                          ₹{level.currentVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 align-middle w-[200px]">
                          {level.remainingVolume > 0 ? (
                            <div className="space-y-2 group/tooltip relative">
                              <span className="text-brand-warning font-bold block">
                                ₹{level.remainingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                  className={cn(
                                    "h-full rounded-full transition-all relative",
                                    isInProgress ? "bg-brand-primary" : "bg-muted-foreground"
                                  )}
                                >
                                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                </motion.div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-brand-success font-bold">₹0.00</span>
                              {isLocked && <span className="text-xs text-muted-foreground font-normal">(Achieved)</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-secondary text-foreground font-bold border border-border shadow-sm">
                            {level.profitPercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <StatusBadge status={level.status} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SummaryCard({ title, value, subtitle, icon, colorClass, progress }: any) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between z-10 relative">
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm font-medium text-muted-foreground/80 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl border shrink-0", colorClass)}>
          {icon}
        </div>
      </div>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
          <div 
            className="h-full bg-brand-info transition-all duration-1000 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-secondary/50 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isUnlocked = status === 'UNLOCKED';
  const isInProgress = status === 'IN PROGRESS';
  
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-sm transition-all shadow-sm",
      isUnlocked 
        ? "bg-brand-success/15 text-brand-success border-brand-success/30 shadow-brand-success/10" 
        : isInProgress
        ? "bg-brand-primary/15 text-brand-primary border-brand-primary/30 shadow-brand-primary/10"
        : "bg-secondary/80 text-muted-foreground border-border"
    )}>
      {isUnlocked && <CheckCircle2 className="w-3.5 h-3.5" />}
      {isInProgress && <Clock className="w-3.5 h-3.5" />}
      {!isUnlocked && !isInProgress && <Lock className="w-3.5 h-3.5" />}
      {status === 'UNLOCKED' ? 'Unlocked' : status === 'IN PROGRESS' ? 'In Progress' : 'Locked'}
    </div>
  );
}
