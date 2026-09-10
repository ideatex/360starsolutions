"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Wallet, PieChart, Coins, Calendar, Banknote, ShieldCheck, 
  Network, UserCircle, Sparkles, Award, ArrowUpRight, Lock, Unlock,
  Layers, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me');
      return res.data;
    },
    enabled: !!shareholder,
  });

  React.useEffect(() => {
    if (!shareholder) {
      router.push('/auth/login');
    }
  }, [shareholder, router]);

  if (!shareholder) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-28 bg-secondary/50 rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-secondary/40 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const {
    name,
    shareholderId: userCustomId,
    accountType = 'CONTRIBUTION',
    currentRank = 'Unranked',
    holdingBalance = 0,
    unlockedLevel = 3,
    directReferralsCount = 0,
    isLevelOverridden = false,
  } = data?.shareholder || {};

  const displayName = name || shareholder?.name || shareholder?.shareholderId || 'Shareholder';

  const {
    totalApprovedContribution = 0,
    profitSharingOwn = 0,
    profitSharingReferral = 0,
    totalProfitReceived = 0,
    holdingShortfall = 100000,
    holdingProgress = 0,
    isZeroContribution = accountType === 'ZERO_CONTRIBUTION',
    lastDistributionDate,
    nextDistributionDate,
  } = data?.metrics || {};

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRankBadgeColor = (rank: string) => {
    switch (rank?.toLowerCase()) {
      case 'diamond': return 'bg-sky-500/10 text-sky-500 border-sky-500/30';
      case 'gold': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'silver': return 'bg-slate-400/10 text-slate-300 border-slate-400/30';
      case 'bronze': return 'bg-orange-600/10 text-orange-500 border-orange-600/30';
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Refined Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary/15 via-brand-primary/5 to-card p-6 sm:p-8 border border-brand-primary/20 shadow-sm">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shrink-0 select-none">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-3 py-0.5 rounded-full border border-brand-primary/20">
                  <Sparkles className="w-3 h-3" /> User ID: {userCustomId || shareholder.shareholderId}
                </span>

                {/* Account Type Badge */}
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  isZeroContribution 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {isZeroContribution ? 'Zero Contribution' : 'Standard Contributor'}
                </span>

                {/* Rank Badge */}
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getRankBadgeColor(currentRank)}`}>
                  <Award className="w-3 h-3" /> {currentRank}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Welcome back, <span className="text-brand-primary">{displayName}</span>
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                  Unlocked: <strong>Levels 1 to {unlockedLevel}</strong> {isLevelOverridden && '(Admin Override)'}
                </span>
                <span>•</span>
                <span>Direct Referrals: <strong>{directReferralsCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link 
              href="/dashboard/referral-tree"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 select-none"
            >
              <Network size={14} /> Referral Tree
            </Link>
            <Link 
              href="/dashboard/profile"
              className="px-4 py-2 border border-border-subtle bg-card hover:bg-secondary text-foreground rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 select-none"
            >
              <UserCircle size={14} /> Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Zero-Contribution Holding Balance Banner */}
      {(isZeroContribution || holdingBalance > 0) && (
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-foreground">Holding Balance & Auto-Activation</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    20% Gratitude Withholding
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  20% of your Gratitude Share earnings are reserved here until reaching ₹1,00,000 for automatic Contributor Fund activation.
                </p>
              </div>
            </div>

            <div className="text-right sm:shrink-0">
              <span className="text-xs text-muted-foreground font-semibold block">Current Holding</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                ₹{holdingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>Progress: {holdingProgress}%</span>
              <span>₹{holdingShortfall.toLocaleString('en-IN')} remaining to auto-activate (₹1,00,000 threshold)</span>
            </div>
            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden border border-border">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, holdingProgress))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview Title */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Banknote className="w-5 h-5 text-brand-primary" /> Financial Overview (Product 360)
        </h2>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/60 px-2.5 py-1 rounded-lg">
          INR Currency Ledger
        </span>
      </div>

      {/* Sleek 4-Column Compact Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Capital */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-brand-primary/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Capital</span>
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              ₹{totalApprovedContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Active Contribution Fund</p>
          </div>
        </div>

        {/* Total Profit Received */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{totalProfitReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Overall Earnings Disbursed</p>
          </div>
        </div>

        {/* Profit Share (5% Monthly) */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Profit Share (5%)</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              ₹{profitSharingOwn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">From Active Fund (5% Mo.)</p>
          </div>
        </div>

        {/* Gratitude Share (L1-L12) */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gratitude Share</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              ₹{profitSharingReferral.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Referral Network (L1-L12)</p>
          </div>
        </div>
      </div>

      {/* Distribution Cycles Status Banner (6th & 21st Calendar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-xl text-muted-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Last Distribution Date</span>
              <span className="text-sm font-extrabold text-foreground">{formatDate(lastDistributionDate)}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Released
          </span>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Next Distribution Date</span>
              <span className="text-sm font-extrabold text-brand-primary">{formatDate(nextDistributionDate)}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20 animate-pulse">
            Upcoming (6th / 21st)
          </span>
        </div>
      </div>
    </motion.div>
  );
}
