"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { motion } from 'framer-motion';
import { TrendingUp, Percent, ArrowDownLeft, FileSpreadsheet, Calendar, Loader2 } from 'lucide-react';

export default function ProfitHistoryPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const [activeTab, setActiveTab] = useState<'roi' | 'commission' | 'payout'>('roi');
  const [page, setPage] = useState(1);

  const handleTabChange = (tab: 'roi' | 'commission' | 'payout') => {
    setActiveTab(tab);
    setPage(1);
  };

  const { data: profits, isLoading: loadingProfits } = useQuery({
    queryKey: ['myProfits', page],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/profits', {
        params: { page, limit: 10 },
      });
      return res.data;
    },
    enabled: !!shareholder && activeTab === 'roi',
  });

  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ['myCommissions', page],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/commissions', {
        params: { page, limit: 10 },
      });
      return res.data;
    },
    enabled: !!shareholder && activeTab === 'commission',
  });

  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ['myPayouts', page],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/payouts', {
        params: { page, limit: 10 },
      });
      return res.data;
    },
    enabled: !!shareholder && activeTab === 'payout',
  });

  const activeData = activeTab === 'roi' ? profits : activeTab === 'commission' ? commissions : payouts;
  const isLoading = activeTab === 'roi' ? loadingProfits : activeTab === 'commission' ? loadingCommissions : loadingPayouts;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Earnings Ledger</h1>
        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Audit and filter your profit cycles and payouts</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-muted/65 dark:bg-secondary/40 p-1 rounded-2xl w-fit border border-border-subtle select-none">
        <button
          onClick={() => handleTabChange('roi')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'roi'
              ? 'bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> ROI Profits
        </button>
        <button
          onClick={() => handleTabChange('commission')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'commission'
              ? 'bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Percent className="w-3.5 h-3.5" /> Commissions
        </button>
        <button
          onClick={() => handleTabChange('payout')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'payout'
              ? 'bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" /> Released Payouts
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
            <p className="text-xs font-semibold">Retrieving ledger entries...</p>
          </div>
        ) : activeData?.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <FileSpreadsheet className="w-12 h-12 opacity-35 mb-3" />
            <p className="text-xs font-bold">No Records Found</p>
            <p className="text-[10px] text-muted-foreground/75 mt-0.5">No matching distributions are logged in this category.</p>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4.5 border-b border-border-subtle bg-muted/10">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white tracking-wider uppercase">
                {activeTab === 'roi' && 'ROI Profit History'}
                {activeTab === 'commission' && 'Referral Commission History'}
                {activeTab === 'payout' && 'Released Payout Batches'}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {activeTab === 'roi' && (
                  <>
                    <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Cycle Period</th>
                        <th className="px-6 py-4">Eligible Days</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Dated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {profits?.data?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{p.id}</td>
                          <td className="px-6 py-4">
                            {new Date(p.cycleStart).toLocaleDateString()} - {new Date(p.cycleEnd).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold">{p.eligibleDays} days</td>
                          <td className="px-6 py-4 font-extrabold text-brand-primary">+${Number(p.amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-muted-foreground font-semibold">{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'commission' && (
                  <>
                    <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Source Investor</th>
                        <th className="px-6 py-4">Referral Level</th>
                        <th className="px-6 py-4">Placement Size</th>
                        <th className="px-6 py-4">Rate</th>
                        <th className="px-6 py-4">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {commissions?.data?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{c.id}</td>
                          <td className="px-6 py-4 truncate max-w-[150px] font-semibold">{c.fromInvestment?.shareholder?.shareholderId || 'N/A'}</td>
                          <td className="px-6 py-4 font-semibold">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-550 border border-indigo-500/20 text-[9px] font-bold uppercase">
                              Level {c.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">${Number(c.fromInvestment?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 font-semibold">{(Number(c.rate) * 100).toFixed(1)}%</td>
                          <td className="px-6 py-4 font-extrabold text-brand-primary">+${Number(c.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'payout' && (
                  <>
                    <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Payout ID</th>
                        <th className="px-6 py-4">Cycle Period</th>
                        <th className="px-6 py-4">ROI Amount</th>
                        <th className="px-6 py-4">Referral Earnings</th>
                        <th className="px-6 py-4">Total Released</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {payouts?.data?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{p.id}</td>
                          <td className="px-6 py-4 font-semibold">
                            {new Date(p.batch?.cycleStart).toLocaleDateString()} - {new Date(p.batch?.cycleEnd).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-250">${Number(p.profitAmount).toFixed(2)}</td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-250">${Number(p.commissionAmount).toFixed(2)}</td>
                          <td className="px-6 py-4 font-extrabold text-gray-950 dark:text-white">${Number(p.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border 
                              ${p.status === 'PROCESSED' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' 
                                : p.status === 'PENDING' 
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/40' 
                                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/40'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && activeData?.lastPage > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border-subtle mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Page {page} of {activeData.lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(activeData.lastPage, p + 1))}
            disabled={page >= activeData.lastPage}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
