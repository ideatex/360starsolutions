"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Calendar, Activity, X, Coins, Loader2 } from 'lucide-react';

export default function InvestmentsPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [page, setPage] = useState(1);

  const { data: investments, isLoading } = useQuery({
    queryKey: ['userInvestments', page],
    queryFn: async () => {
      const res = await api.get('/investments', {
        params: { page, limit: 10 },
      });
      return res.data;
    },
    enabled: !!shareholder,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/investments', {
        shareholderId: shareholder?.id,
        amount: Number(amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInvestments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setIsModalOpen(false);
      setAmount('');
      toast({ 
        title: "Capital Placement Initialized", 
        description: `Successfully placed ₹${Number(amount).toLocaleString('en-IN')} into the ROI cycle.`, 
        type: "success" 
      });
    },
    onError: (err: any) => {
      toast({ 
        title: "Transaction Failed", 
        description: err.response?.data?.message || 'Error processing investment deposit.', 
        type: "error" 
      });
    },
  });

  const activeInvestments = investments?.data?.filter((i: any) => i.status === 'ACTIVE') || [];
  const totalVolume = activeInvestments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount greater than ₹0.", type: "warning" });
      return;
    }

    const ok = await confirm({
      title: "Confirm Capital Placement",
      description: `You are about to authorize an active capital placement of ₹${Number(amount).toLocaleString('en-IN')}. This amount will be locked in the sequential ROI cycle. Do you wish to proceed?`,
      confirmText: "Confirm & Invest",
      variant: "success"
    });

    if (ok) {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-outfit">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Investments</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage and track your active capital placements</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-theme-xs flex items-center gap-2 cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" /> New Investment
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Capital</h3>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Portfolios</h3>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{activeInvestments.length}</p>
          </div>
        </div>

        <div className="app-card p-5 flex items-center gap-4">
          <div className="p-3 bg-warning-50 dark:bg-warning-500/15 text-warning-600 dark:text-warning-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Cycle</h3>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">Fortnightly Cycle</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="app-card overflow-hidden">
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Your Portfolios</h2>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Loading portfolios...</p>
          </div>
        ) : investments?.data?.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No investments found.</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Click "New Investment" to create your first placement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Portfolio ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Daily Profit Rate</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200 text-xs">
                {investments?.data?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4.5 font-mono text-gray-400 dark:text-gray-500">{inv.id}</td>
                    <td className="px-6 py-4.5 font-bold text-gray-900 dark:text-white">₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4.5 font-semibold text-brand-600 dark:text-brand-400">{(Number(inv.dailyProfitRate) * 100).toFixed(2)}% / day</td>
                    <td className="px-6 py-4.5 font-medium">{new Date(inv.startDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider 
                        ${inv.status === 'ACTIVE' 
                          ? 'badge-success' 
                          : inv.status === 'PENDING' 
                          ? 'badge-warning' 
                          : 'badge-error'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {investments?.lastPage > 1 && (
        <div className="flex justify-between items-center app-card p-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Page {page} of {investments?.lastPage || 1}</span>
          <button
            onClick={() => setPage(p => Math.min(investments?.lastPage || 1, p + 1))}
            disabled={page >= (investments?.lastPage || 1)}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none text-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}

      {/* New Investment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-theme-xl relative overflow-hidden border border-gray-200 dark:border-gray-800 font-outfit"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
                <div className="flex gap-3 items-center">
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Create Capital Placement</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fund your active portfolio sequence</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Investment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount (e.g. 50000)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500 bg-gray-50 dark:bg-gray-800/60 font-bold text-sm text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Placed capital begins daily profit calculations in the fortnightly cycle.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-theme-xs text-xs cursor-pointer"
                >
                  Continue
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
