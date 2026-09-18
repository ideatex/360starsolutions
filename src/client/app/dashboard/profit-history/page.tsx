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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-outfit">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Earnings Ledger</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit and filter your profit cycles, gratitude shares, and released payouts</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit border border-gray-200 dark:border-gray-700 select-none">
        <button
          onClick={() => handleTabChange('roi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'roi'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-theme-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Profit Share
        </button>
        <button
          onClick={() => handleTabChange('commission')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'commission'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-theme-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Percent className="w-3.5 h-3.5" /> Gratitude Share
        </button>
        <button
          onClick={() => handleTabChange('payout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'payout'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-theme-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" /> Released Payouts
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="app-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Retrieving ledger entries...</p>
          </div>
        ) : activeData?.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <FileSpreadsheet className="w-12 h-12 opacity-30 mb-3" />
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No Records Found</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">No matching distributions are logged in this category.</p>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white tracking-wider uppercase">
                {activeTab === 'roi' && 'Profit Share History'}
                {activeTab === 'commission' && 'Gratitude Share Referral History'}
                {activeTab === 'payout' && 'Released Payout Batches'}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {activeTab === 'roi' && (
                  <>
                    <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Cycle Period</th>
                        <th className="px-6 py-4">Eligible Days</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Dated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                      {profits?.data?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{p.id}</td>
                          <td className="px-6 py-4">
                            {new Date(p.cycleStart).toLocaleDateString()} - {new Date(p.cycleEnd).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold">{p.eligibleDays} days</td>
                          <td className="px-6 py-4 font-bold text-success-600 dark:text-success-400">+₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'commission' && (
                  <>
                    <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Source Contributor</th>
                        <th className="px-6 py-4">Referral Level</th>
                        <th className="px-6 py-4">Placement Size</th>
                        <th className="px-6 py-4">Rate</th>
                        <th className="px-6 py-4">Gratitude Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                      {commissions?.data?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{c.id}</td>
                          <td className="px-6 py-4 truncate max-w-[150px] font-semibold">{c.sourceShareholder?.shareholderId || c.fromInvestment?.shareholder?.shareholderId || 'N/A'}</td>
                          <td className="px-6 py-4 font-semibold">
                            <span className="badge-brand text-[10px]">
                              Level {c.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">₹{Number(c.calculationBase || c.fromInvestment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 font-semibold">{(Number(c.rate) * 100).toFixed(2)}%</td>
                          <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">+₹{Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'payout' && (
                  <>
                    <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Payout ID</th>
                        <th className="px-6 py-4">Cycle Period</th>
                        <th className="px-6 py-4">Profit Share</th>
                        <th className="px-6 py-4">Gratitude Share</th>
                        <th className="px-6 py-4">Total Net Released</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                      {payouts?.data?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{p.id}</td>
                          <td className="px-6 py-4 font-semibold">
                            {new Date(p.batch?.cycleStart).toLocaleDateString()} - {new Date(p.batch?.cycleEnd).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">₹{Number(p.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">₹{Number(p.commissionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 font-bold text-success-600 dark:text-success-400">₹{Number(p.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider 
                              ${p.status === 'PROCESSED' 
                                ? 'badge-success' 
                                : p.status === 'PENDING' 
                                ? 'badge-warning' 
                                : 'badge-error'
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
        <div className="flex justify-between items-center app-card p-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Page {page} of {activeData.lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(activeData.lastPage, p + 1))}
            disabled={page >= activeData.lastPage}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none text-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
