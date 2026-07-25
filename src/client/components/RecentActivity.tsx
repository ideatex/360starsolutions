"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Gift, TrendingUp, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function RecentActivity() {
  const shareholder = useAuthStore((state) => state.shareholder);

  // Fetch profits
  const { data: profits, isLoading: loadingProfits } = useQuery({
    queryKey: ['recentProfits'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/profits', { params: { limit: 5 } });
      return res.data;
    },
    enabled: !!shareholder,
  });

  // Fetch commissions
  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ['recentCommissions'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/commissions', { params: { limit: 5 } });
      return res.data;
    },
    enabled: !!shareholder,
  });

  if (loadingProfits || loadingCommissions) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-4 items-center animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-2/3"></div>
              <div className="h-2 bg-muted rounded w-1/3"></div>
            </div>
            <div className="w-12 h-4 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Combine and sort by date desc
  const list: any[] = [];
  
  profits?.data?.forEach((p: any) => {
    list.push({
      id: `p-${p.id}`,
      type: 'profit',
      amount: Number(p.amount),
      date: p.createdAt,
      description: `Daily ROI distribution (${p.eligibleDays} active days)`,
      status: 'completed',
    });
  });

  commissions?.data?.forEach((c: any) => {
    list.push({
      id: `c-${c.id}`,
      type: 'commission',
      amount: Number(c.amount),
      date: c.createdAt,
      description: `Level ${c.level} Referral Reward`,
      status: 'completed',
    });
  });

  const sortedActivities = list
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  if (sortedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground select-none">
        <RefreshCcw className="w-8 h-8 text-muted-foreground/30 animate-spin-slow mb-2" />
        <p className="text-xs font-bold">No Transactions Found</p>
        <p className="text-[10px] text-muted-foreground/75 mt-0.5">Your earnings ledger is currently empty.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return <Gift className="w-4 h-4 text-brand-accent animate-pulse" />;
      case 'profit':
        return <TrendingUp className="w-4 h-4 text-brand-primary" />;
      default:
        return <RefreshCcw className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    return type === 'profit' 
      ? 'bg-brand-primary/10 text-brand-primary' 
      : 'bg-brand-accent/10 text-brand-accent';
  };

  return (
    <div className="space-y-4">
      {sortedActivities.map((activity) => (
        <div 
          key={activity.id} 
          className="flex items-center justify-between p-3.5 rounded-2xl border border-border-subtle bg-muted/20 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className={`p-2.5 rounded-xl shrink-0 ${getBadgeStyle(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug truncate">{activity.description}</p>
              <p className="text-[9px] text-muted-foreground dark:text-gray-400 mt-1 font-semibold">
                {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-xs font-extrabold ${activity.type === 'profit' ? 'text-brand-primary' : 'text-brand-accent'}`}>
              +${activity.amount.toFixed(2)}
            </p>
            <span className="text-[8px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 mt-1 inline-block">
              {activity.status}
            </span>
          </div>
        </div>
      ))}
      <Link href="/dashboard/profit-history">
        <span className="block text-center w-full py-3 text-xs font-extrabold text-brand-primary hover:text-brand-primary/90 bg-brand-primary/5 hover:bg-brand-primary/10 rounded-2xl transition-all mt-3 cursor-pointer">
          View Earnings Ledger
        </span>
      </Link>
    </div>
  );
}
