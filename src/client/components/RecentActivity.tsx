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
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-4 items-center animate-pulse">
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3"></div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/3"></div>
            </div>
            <div className="w-12 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
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
      description: `Daily Profit Distribution (${p.eligibleDays} days)`,
      status: 'completed',
    });
  });

  commissions?.data?.forEach((c: any) => {
    list.push({
      id: `c-${c.id}`,
      type: 'commission',
      amount: Number(c.amount),
      date: c.createdAt,
      description: `Level ${c.level} Gratitude Share`,
      status: 'completed',
    });
  });

  const sortedActivities = list
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  if (sortedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 select-none">
        <RefreshCcw className="w-7 h-7 text-gray-300 dark:text-gray-700 mb-2" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No Transactions Found</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Your earnings ledger is currently empty.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return <Gift className="w-4 h-4 text-brand-500" />;
      case 'profit':
        return <TrendingUp className="w-4 h-4 text-success-500" />;
      default:
        return <RefreshCcw className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    return type === 'profit' 
      ? 'bg-success-50 dark:bg-success-500/15' 
      : 'bg-brand-50 dark:bg-brand-500/15';
  };

  return (
    <div className="space-y-3 font-outfit">
      {sortedActivities.map((activity) => (
        <div 
          key={activity.id} 
          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-2 rounded-lg shrink-0 ${getBadgeStyle(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug truncate">{activity.description}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-xs font-bold ${activity.type === 'profit' ? 'text-success-600 dark:text-success-400' : 'text-brand-600 dark:text-brand-400'}`}>
              +₹{activity.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full badge-success mt-1 inline-block">
              {activity.status}
            </span>
          </div>
        </div>
      ))}
      <Link href="/dashboard/profit-history">
        <span className="block text-center w-full py-2.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-brand-50/50 dark:bg-brand-500/10 hover:bg-brand-50 dark:hover:bg-brand-500/20 rounded-xl transition-all mt-2 cursor-pointer">
          View Earnings Ledger
        </span>
      </Link>
    </div>
  );
}
