"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Calendar, Activity, X, CircleDollarSign, Loader2 } from 'lucide-react';

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
        description: `Successfully placed $${Number(amount).toLocaleString()} into the ROI cycle.`, 
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
      toast({ title: "Invalid Amount", description: "Please enter a valid amount greater than $0.", type: "warning" });
      return;
    }

    const ok = await confirm({
      title: "Confirm Capital Placement",
      description: `You are about to authorize an active capital placement of $${Number(amount).toLocaleString()}. This amount will be locked in the sequential ROI cycle. Do you wish to proceed?`,
      confirmText: "Confirm & Invest",
      variant: "success"
    });

    if (ok) {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Investments</h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Manage and track your active capital</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> New Investment
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle flex items-center gap-4 hover:shadow-premium transition-shadow">
          <div className="p-3.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Capital</h3>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle flex items-center gap-4 hover:shadow-premium transition-shadow">
          <div className="p-3.5 bg-brand-accent/10 rounded-2xl text-brand-accent">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Portfolios</h3>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">{activeInvestments.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle flex items-center gap-4 hover:shadow-premium transition-shadow">
          <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-555">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Cycle</h3>
            <p className="text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">1st - 14th of Month</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border-subtle bg-muted/10">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">Your Portfolios</h2>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
            <p className="text-xs font-semibold">Loading portfolios...</p>
          </div>
        ) : investments?.data?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-xs font-bold">No investments found.</p>
            <p className="text-[10px] text-muted-foreground/75 mt-0.5">Click "New Investment" to create your first placement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Portfolio ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Daily Profit Rate</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-gray-700 dark:text-gray-300 text-xs">
                {investments?.data?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-400 dark:text-gray-500">{inv.id}</td>
                    <td className="px-6 py-4 font-extrabold text-gray-950 dark:text-white">${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-semibold text-brand-primary">{(Number(inv.dailyProfitRate) * 100).toFixed(2)}% / day</td>
                    <td className="px-6 py-4 font-medium">{new Date(inv.startDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border 
                        ${inv.status === 'ACTIVE' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' 
                          : inv.status === 'PENDING' 
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40' 
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/40'
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
        <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border-subtle mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Page {page} of {investments?.lastPage || 1}</span>
          <button
            onClick={() => setPage(p => Math.min(investments?.lastPage || 1, p + 1))}
            disabled={page >= (investments?.lastPage || 1)}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}

      {/* New Investment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden border border-border-subtle"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleCreateSubmit} className="space-y-5 mt-2">
                <div className="flex gap-3 items-center">
                  <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shrink-0">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Create Capital Placement</h3>
                    <p className="text-[10px] text-muted-foreground dark:text-gray-400 mt-0.5">Fund your active portfolio sequence</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Investment Amount (USD) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount (e.g. 5000)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border-subtle focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 font-extrabold text-sm dark:text-white placeholder-gray-400"
                  />
                  <p className="text-[9px] text-muted-foreground">Placed capital begins daily ROI accruals starting next calendar cycle.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer"
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
