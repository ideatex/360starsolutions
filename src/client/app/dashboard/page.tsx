"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, PieChart, Coins, Calendar, Banknote, Landmark, ShieldCheck, ArrowRight, Download, Network, UserCircle } from 'lucide-react';

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
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-8 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome, {name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              ID: {customId}
            </span>
            <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border ${
              accountType === 'Investor' 
                ? 'bg-brand-success/10 text-brand-success border-brand-success/20' 
                : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
            }`}>
              {accountType === 'Investor' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              {accountType}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/referral-tree" className="bg-card hover:bg-secondary/60 transition-colors p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-brand-accent/10 text-brand-accent rounded-xl shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-foreground">Referral Tree</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
        </Link>

        <Link href="/dashboard/profile" className="bg-card hover:bg-secondary/60 transition-colors p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-brand-info/10 text-brand-info rounded-xl shrink-0">
              <UserCircle className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-foreground">My Profile</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-info group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      <h2 className="text-xl font-bold text-foreground pb-2 border-b border-border">Financial Overview</h2>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Total Contribution */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Approved Contribution Fund</h3>
            <p className="text-3xl font-bold text-foreground mt-1">₹{totalApprovedContribution.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Total Profit Received */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-brand-success/10 rounded-xl text-brand-success shrink-0">
            <Banknote className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Profit Sharing Received</h3>
            <p className="text-3xl font-bold text-foreground mt-1">₹{totalProfitReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Profit From Own */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-brand-info/10 rounded-xl text-brand-info shrink-0">
            <PieChart className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profit Sharing From Own Investment</h3>
            <p className="text-2xl font-bold text-foreground mt-1">₹{profitSharingOwn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Profit From Referral */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-brand-accent/10 rounded-xl text-brand-accent shrink-0">
            <Coins className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profit Sharing From Referral Network</h3>
            <p className="text-2xl font-bold text-foreground mt-1">₹{profitSharingReferral.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Distribution Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <div className="bg-secondary/40 p-6 rounded-2xl border border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Last Distribution Date</h3>
            <p className="text-xl font-bold text-foreground mt-1">{formatDate(lastDistributionDate)}</p>
          </div>
          <Calendar className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div className="bg-secondary/40 p-6 rounded-2xl border border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Next Distribution Date</h3>
            <p className="text-xl font-bold text-foreground mt-1">{formatDate(nextDistributionDate)}</p>
          </div>
          <Calendar className="w-8 h-8 text-brand-primary/40" />
        </div>
      </div>
    </motion.div>
  );
}
