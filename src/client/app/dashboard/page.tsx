"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, PieChart, Coins, Calendar, Banknote, Landmark, ShieldCheck, ArrowRight, Download, Network, UserCircle, Sparkles } from 'lucide-react';

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
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-10 bg-secondary rounded-xl w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 bg-secondary rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const { name, customId, accountType } = data?.shareholder || {};
  const displayName = name || shareholder?.name || shareholder?.shareholderId || 'Shareholder';

  const {
    totalApprovedContribution = 0,
    profitSharingOwn = 0,
    profitSharingReferral = 0,
    totalProfitReceived = 0,
    lastDistributionDate,
    nextDistributionDate
  } = data?.metrics || {};

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-3 py-0.5 rounded-full mb-1 border border-brand-primary/20">
                <Sparkles className="w-3 h-3" /> Shareholder Workspace
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Welcome back, <span className="text-brand-primary">{displayName}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl font-medium">
                Monitor your Contribution Fund investments, profit sharing distributions, and referral growth in real-time.
              </p>
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

      {/* Financial Overview Title */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Banknote className="w-5 h-5 text-brand-primary" /> Financial Overview
        </h2>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/60 px-2.5 py-1 rounded-lg">
          Live Account Ledger
        </span>
      </div>

      {/* Sleek 4-Column Compact Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contribution */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-brand-primary/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Capital</span>
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              ₹{totalApprovedContribution.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Total Approved Contribution</p>
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
              ₹{totalProfitReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Overall Profit Sharing</p>
          </div>
        </div>

        {/* Profit From Own */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Own Profit</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              ₹{profitSharingOwn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">From Own Contribution</p>
          </div>
        </div>

        {/* Profit From Referral */}
        <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Referral Profit</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              ₹{profitSharingReferral.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">From Referral Network</p>
          </div>
        </div>
      </div>

      {/* Distribution Cycles Twin Status Banner */}
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
          <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Processed
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
            Upcoming Cycle
          </span>
        </div>
      </div>
    </motion.div>
  );
}
