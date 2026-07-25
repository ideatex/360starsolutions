"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion } from 'framer-motion';
import { Landmark, Calendar, DollarSign, Play, Loader2, Info } from 'lucide-react';

export default function AdminPayoutsPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [cycleStart, setCycleStart] = useState('');
  const [cycleEnd, setCycleEnd] = useState('');
  const [page, setPage] = useState(1);

  const { data: batches, isLoading } = useQuery({
    queryKey: ['adminBatches', page],
    queryFn: async () => {
      const res = await api.get('/admin/payouts/batches', {
        params: { page, limit: 10 },
      });
      return res.data;
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/payouts/batches/generate', { cycleStart, cycleEnd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      setCycleStart('');
      setCycleEnd('');
      toast({ title: "Cycle Batch Generated", description: "Payout parameters analyzed and cycle created.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Generation Error", description: err.response?.data?.message || 'Error generating batch', type: "error" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/payouts/batches/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      toast({ title: "Batch Approved", description: "Cycle marked as Approved. Ready for fund release.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.response?.data?.message || 'Error approving batch', type: "error" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/payouts/batches/${id}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      toast({ title: "Funds Dispatched", description: "All cycle ledger profits and commissions have been released.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Dispatch Failed", description: err.response?.data?.message || 'Error releasing batch', type: "error" });
    },
  });

  const handleApprove = async (id: string) => {
    const ok = await confirm({
      title: "Approve Payout Batch",
      description: "You are about to authorize this cycle's payouts. This action transitions the batch to approved status. Do you wish to continue?",
      confirmText: "Approve Batch",
      variant: "success"
    });
    if (ok) {
      approveMutation.mutate(id);
    }
  };

  const handleRelease = async (id: string) => {
    const ok = await confirm({
      title: "Release Payout Funds",
      description: "CRITICAL: You are about to initiate final bank transfers and credit ledger transactions for all investors in this cycle. This action is immutable. Do you wish to proceed?",
      confirmText: "Release Funds",
      variant: "danger"
    });
    if (ok) {
      releaseMutation.mutate(id);
    }
  };

  const isSuperAdmin = shareholder?.role === 'SUPER_ADMIN';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Title */}
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Landmark className="w-7 h-7 text-brand-primary" /> Payout Batches
        </h1>
        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Configure, audit, and release twice-monthly financial cycles.</p>
      </div>

      {/* Warning banner */}
      <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 text-xs text-brand-primary flex gap-2.5 items-start leading-normal">
        <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold block">Financial Safety Protocol</span>
          <p className="mt-0.5">Payout generation runs scan all active investments and referrals in the date range. Released payouts automatically calculate and dispatch values to shareholder ledger records.</p>
        </div>
      </div>

      {/* Date Picker Actions Panel */}
      <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle flex flex-col md:flex-row items-end gap-4 shadow-sm">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> Cycle Start Date</label>
          <input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> Cycle End Date</label>
          <input type="date" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 text-muted-foreground" />
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={!cycleStart || !cycleEnd || generateMutation.isPending}
          className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 h-[38px] text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1 select-none shrink-0"
        >
          {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Generate Batch
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Batch ID</th>
              <th className="px-6 py-4">Cycle Range</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-20 text-muted-foreground"><Loader2 size={20} className="animate-spin text-brand-primary mx-auto" /></td></tr>
            ) : batches?.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-20 text-muted-foreground">
                  <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-primary" />
                  <p className="text-xs font-bold">No Batches Logged</p>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5">Please generate a batch range to start a payout cycle.</p>
                </td>
              </tr>
            ) : (
              batches?.data?.map((batch: any) => (
                <tr key={batch.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{batch.id}</td>
                  <td className="px-6 py-4 font-semibold">
                    {new Date(batch.cycleStart).toLocaleDateString()} - {new Date(batch.cycleEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-gray-950 dark:text-white">${Number(batch.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border tracking-wider
                      ${batch.status === 'PENDING' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/40' : ''}
                      ${batch.status === 'REVIEWED' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/40' : ''}
                      ${batch.status === 'APPROVED' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/40' : ''}
                      ${batch.status === 'RELEASED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' : ''}
                    `}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 select-none">
                    {batch.status === 'REVIEWED' && isSuperAdmin && (
                      <button 
                        onClick={() => handleApprove(batch.id)}
                        disabled={approveMutation.isPending}
                        className="bg-brand-accent hover:bg-brand-accent/95 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {approveMutation.isPending ? 'Verifying...' : 'Approve'}
                      </button>
                    )}
                    {batch.status === 'APPROVED' && isSuperAdmin && (
                      <button 
                        onClick={() => handleRelease(batch.id)}
                        disabled={releaseMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {releaseMutation.isPending ? 'Releasing...' : 'Release Funds'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {batches?.lastPage > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-border-subtle mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Page {page} of {batches.lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(batches.lastPage, p + 1))}
            disabled={page >= batches.lastPage}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
