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
      className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8"
    >
      {/* Refined Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-white dark:to-gray-900 p-6 sm:p-8 border border-brand-500/20 shadow-theme-xs">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl shadow-theme-xs shrink-0 select-none">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="badge-brand">
                  <Sparkles className="w-3 h-3 mr-1" /> ID: {userCustomId || shareholder.shareholderId}
                </span>

                {/* Account Type Badge */}
                <span className={`badge ${
                  isZeroContribution 
                    ? 'badge-warning'
                    : 'badge-success'
                }`}>
                  {isZeroContribution ? 'Zero Contribution' : 'Standard Contributor'}
                </span>

                {/* Rank Badge */}
                <span className={`badge ${getRankBadgeColor(currentRank)}`}>
                  <Award className="w-3 h-3 mr-1" /> {currentRank}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Welcome back, <span className="text-brand-600 dark:text-brand-400">{displayName}</span>
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                  Unlocked: <strong className="text-gray-900 dark:text-white font-semibold">Levels 1 to {unlockedLevel}</strong> {isLevelOverridden && '(Admin Override)'}
                </span>
                <span>•</span>
                <span>Direct Referrals: <strong className="text-gray-900 dark:text-white font-semibold">{directReferralsCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link 
              href="/dashboard/referral-tree"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all shadow-theme-xs flex items-center gap-1.5 select-none"
            >
              <Network size={14} /> Referral Tree
            </Link>
            <Link 
              href="/dashboard/profile"
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 select-none"
            >
              <UserCircle size={14} /> Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Zero-Contribution Holding Balance Banner */}
      {(isZeroContribution || holdingBalance > 0) && (
        <div className="app-card border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:to-gray-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Holding Balance & Auto-Activation</h3>
                  <span className="badge-warning">
                    20% Gratitude Withholding
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  20% of your Gratitude Share earnings are reserved here until reaching ₹1,00,000 for automatic Contributor Fund activation.
                </p>
              </div>
            </div>

            <div className="text-right sm:shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">Current Holding</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ₹{holdingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>Progress: {holdingProgress}%</span>
              <span>₹{holdingShortfall.toLocaleString('en-IN')} remaining to auto-activate (₹1,00,000 threshold)</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, holdingProgress))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview Title */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Banknote className="w-5 h-5 text-brand-600 dark:text-brand-400" /> Financial Overview (Product 360)
        </h2>
        <span className="badge-neutral">
          INR Currency Ledger
        </span>
      </div>

      {/* Sleek 4-Column Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Approved Capital */}
        <div className="app-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved Capital</span>
            <div className="p-2 bg-brand-50 dark:bg-brand-950/50 rounded-lg text-brand-600 dark:text-brand-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              ₹{totalApprovedContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Active Contribution Fund</p>
          </div>
        </div>

        {/* Total Profit Received */}
        <div className="app-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{totalProfitReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Overall Earnings Disbursed</p>
          </div>
        </div>

        {/* Profit Share (5% Monthly) */}
        <div className="app-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit Share (5%)</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              ₹{profitSharingOwn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">From Active Fund (5% Mo.)</p>
          </div>
        </div>

        {/* Gratitude Share (L1-L12) */}
        <div className="app-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gratitude Share</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
              ₹{profitSharingReferral.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Referral Network (L1-L12)</p>
          </div>
        </div>
      </div>

      {/* Distribution Cycles Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="app-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Last Distribution Date</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(lastDistributionDate)}</span>
            </div>
          </div>
          <span className="badge-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Released
          </span>
        </div>

        <div className="app-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg text-brand-600 dark:text-brand-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Next Distribution Date</span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatDate(nextDistributionDate)}</span>
            </div>
          </div>
          <span className="badge-brand">
            Upcoming (6th / 21st)
          </span>
        </div>
      </div>
    </motion.div>
  );
}
