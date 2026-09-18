"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Wallet, TrendingUp, Users, ShieldAlert, ArrowUpRight, CheckCircle2, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PayoutsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ['myPayouts', page],
    queryFn: async () => {
      const res = await api.get(`/shareholders/me/payouts?page=${page}&limit=${limit}`);
      return res.data;
    },
  });

  const { data: userMetrics } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me');
      return res.data;
    },
  });

  const payouts = payoutsData?.data || [];
  const totalRecords = payoutsData?.total || 0;
  const lastPage = payoutsData?.lastPage || 1;

  // Aggregate stats from current payouts or metrics
  const totalProfitShare = payouts.reduce((acc: number, item: any) => acc + Number(item.grossProfitShare || item.profitAmount || 0), 0);
  const totalGratitudeShare = payouts.reduce((acc: number, item: any) => acc + Number(item.grossGratitudeShare || item.commissionAmount || 0), 0);
  const totalWithheld = payouts.reduce((acc: number, item: any) => acc + Number(item.withheldAmount || 0), 0);
  const totalNet = payouts.reduce((acc: number, item: any) => acc + Number(item.netPayable || item.totalAmount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto space-y-6 pb-12 font-outfit"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Fortnightly Payouts</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Consolidated statement of your profit distributions, gratitude shares, and net settled payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-brand flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Approved Batches Only
          </span>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-success-50 dark:bg-success-500/15 text-success-600 dark:text-success-400 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Profit Share</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              ₹{(userMetrics?.metrics?.totalProfitReceived || totalProfitShare).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gratitude Share</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              ₹{(userMetrics?.metrics?.totalCommissionReceived || totalGratitudeShare).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-warning-50 dark:bg-warning-500/15 text-warning-600 dark:text-warning-400 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Withheld / Deductions</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              ₹{totalWithheld.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Disbursed</p>
            <p className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              ₹{((userMetrics?.metrics?.totalProfitReceived || 0) + (userMetrics?.metrics?.totalCommissionReceived || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Consolidated Payouts Table */}
      <div className="app-card overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Fortnightly Statement History</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {totalRecords} record{totalRecords === 1 ? '' : 's'} recorded
          </p>
        </div>

        <div className="overflow-x-auto min-h-[360px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Wallet className="w-8 h-8 animate-spin text-brand-500 opacity-50 mb-4" />
              <p className="text-xs font-semibold">Loading payout statements...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Wallet className="w-12 h-12 opacity-20 mb-4" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No approved payout records available yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm text-center">
                Payout statements appear here automatically once the Super Admin approves and releases the fortnightly cycle.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4">Date / Cycle</th>
                  <th className="px-6 py-4 text-right">Profit Share (₹)</th>
                  <th className="px-6 py-4 text-right">Gratitude Share (₹)</th>
                  <th className="px-6 py-4 text-right">Withheld (₹)</th>
                  <th className="px-6 py-4 text-right">Net Payable (₹)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                {payouts.map((record: any) => {
                  const profit = Number(record.grossProfitShare || record.profitAmount || 0);
                  const gratitude = Number(record.grossGratitudeShare || record.commissionAmount || 0);
                  const withheld = Number(record.withheldAmount || 0);
                  const net = Number(record.netPayable || record.totalAmount || (profit + gratitude - withheld));
                  const cycleDate = record.batch?.cycleEnd 
                    ? new Date(record.batch.cycleEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <tr key={record.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-gray-900 dark:text-white">{cycleDate}</div>
                        {record.batch?.batchNumber && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Batch #{record.batch.batchNumber}
                            {record.batch.cycleStart && (
                              <span> ({new Date(record.batch.cycleStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(record.batch.cycleEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-right font-semibold text-success-600 dark:text-success-400">
                        ₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4.5 text-right font-semibold text-brand-600 dark:text-brand-400">
                        ₹{gratitude.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4.5 text-right font-semibold text-warning-600 dark:text-warning-400">
                        {withheld > 0 ? `-₹${withheld.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                      </td>
                      <td className="px-6 py-4.5 text-right font-bold text-gray-900 dark:text-white text-sm">
                        ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          record.status === 'PAID' || record.batch?.status === 'RELEASED'
                            ? 'badge-success'
                            : 'badge-brand'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {record.status === 'PAID' || record.batch?.status === 'RELEASED' ? 'Disbursed' : 'Approved'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 flex items-center justify-between text-xs">
            <p className="text-gray-500 dark:text-gray-400">
              Page {page} of {lastPage}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
