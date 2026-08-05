"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Calendar, DollarSign, Play, Loader2, Info, Users, 
  ChevronDown, ChevronUp, Search, Download, CheckCircle, Clock, 
  FileSpreadsheet, Building, CreditCard, RefreshCw, Layers
} from 'lucide-react';

export default function AdminPayoutsPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'shareholders' | 'batches'>('shareholders');

  // Batches state
  const [cycleStart, setCycleStart] = useState('');
  const [cycleEnd, setCycleEnd] = useState('');
  const [batchPage, setBatchPage] = useState(1);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Shareholder Payouts Ledger state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shareholderPage, setShareholderPage] = useState(1);

  // Fetch Payout Batches
  const { data: batches, isLoading: loadingBatches } = useQuery({
    queryKey: ['adminBatches', batchPage],
    queryFn: async () => {
      const res = await api.get('/admin/payouts/batches', {
        params: { page: batchPage, limit: 10 },
      });
      return res.data;
    }
  });

  // Fetch Master Shareholder Payouts Ledger
  const { data: shareholderPayouts, isLoading: loadingShareholderPayouts, refetch: refetchShareholders } = useQuery({
    queryKey: ['adminShareholderPayouts', search, statusFilter, shareholderPage],
    queryFn: async () => {
      const res = await api.get('/admin/payouts/shareholder-payouts', {
        params: { search, status: statusFilter || undefined, page: shareholderPage, limit: 15 },
      });
      return res.data;
    }
  });

  // Fetch Details for an expanded Batch
  const { data: expandedBatchDetails, isLoading: loadingBatchDetails } = useQuery({
    queryKey: ['adminBatchDetails', expandedBatchId],
    queryFn: async () => {
      if (!expandedBatchId) return [];
      const res = await api.get(`/admin/payouts/batches/${expandedBatchId}`);
      return res.data;
    },
    enabled: !!expandedBatchId,
  });

  // Generate Batch Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/payouts/batches/generate', { cycleStart, cycleEnd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      setCycleStart('');
      setCycleEnd('');
      toast({ title: "Cycle Batch Generated", description: "Payout parameters analyzed and cycle created with shareholder payouts.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Generation Error", description: err.response?.data?.message || 'Error generating batch', type: "error" });
    },
  });

  // Approve Batch Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/payouts/batches/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      toast({ title: "Batch Approved", description: "Cycle marked as Approved. Ready for fund release.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.response?.data?.message || 'Error approving batch', type: "error" });
    },
  });

  // Release Funds Mutation
  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/payouts/batches/${id}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      if (expandedBatchId) {
        queryClient.invalidateQueries({ queryKey: ['adminBatchDetails', expandedBatchId] });
      }
      toast({ title: "Funds Dispatched", description: "All cycle ledger profits and commissions have been released to shareholders.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Dispatch Failed", description: err.response?.data?.message || 'Error releasing batch', type: "error" });
    },
  });

  // Reprocess Batch Mutation (Super Admin Only)
  const reprocessBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/payouts/batches/${id}/reprocess`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      if (expandedBatchId) {
        queryClient.invalidateQueries({ queryKey: ['adminBatchDetails', expandedBatchId] });
      }
      toast({ title: "Batch Reset for Reprocessing", description: "Batch unlinked and commissions reset to pending eligibility.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Reprocess Failed", description: err.response?.data?.message || 'Error reprocessing batch', type: "error" });
    },
  });

  const handleReprocessBatch = async (id: string) => {
    const ok = await confirm({
      title: "Reprocess Payout Batch",
      description: "AUTHORIZED SUPER ADMIN ACTION: You are resetting this payout batch. All linked commissions will be unlinked and restored to PENDING status so they can be re-calculated in future batches. Do you wish to proceed?",
      confirmText: "Reset & Reprocess",
      variant: "warning"
    });
    if (ok) {
      reprocessBatchMutation.mutate(id);
    }
  };

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
      description: "CRITICAL: You are about to initiate final bank transfers and credit ledger transactions for all shareholders in this cycle. This action is immutable. Do you wish to proceed?",
      confirmText: "Release Funds",
      variant: "danger"
    });
    if (ok) {
      releaseMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = shareholderPayouts?.data || [];
    if (dataToExport.length === 0) {
      toast({ title: "Export Failed", description: "No shareholder payouts available to export.", type: "warning" });
      return;
    }

    const headers = [
      "Payout ID",
      "Shareholder ID",
      "Shareholder Name",
      "Phone",
      "Bank Account Name",
      "Bank Account Number",
      "Bank Name",
      "Branch",
      "IFSC Code",
      "Investor Profit ($)",
      "Referral Commission ($)",
      "Total Payout ($)",
      "Cycle Range",
      "Status"
    ];

    const rows = dataToExport.map((item: any) => [
      item.id,
      item.shareholder?.shareholderId || '-',
      item.shareholder?.name || '-',
      item.shareholder?.phone || '-',
      item.shareholder?.bankAccountName || '-',
      item.shareholder?.bankAccountNumber ? `'${item.shareholder.bankAccountNumber}` : '-',
      item.shareholder?.bankName || '-',
      item.shareholder?.bankBranch || '-',
      item.shareholder?.bankIfsc || '-',
      Number(item.profitAmount || 0).toFixed(2),
      Number(item.commissionAmount || 0).toFixed(2),
      Number(item.totalAmount || 0).toFixed(2),
      item.batch ? `${new Date(item.batch.cycleStart).toLocaleDateString()} - ${new Date(item.batch.cycleEnd).toLocaleDateString()}` : '-',
      item.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Shareholder_Payouts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast({ title: "CSV Report Downloaded", description: `Exported ${dataToExport.length} shareholder payout records.`, type: "success" });
  };

  const isSuperAdmin = shareholder?.role === 'SUPER_ADMIN';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* Title Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-7 h-7 text-brand-primary" /> Shareholder Payout Management
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Audit individual shareholder profit payouts, bank accounts, and twice-monthly batch release cycles.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted/40 p-1 rounded-2xl border border-border-subtle select-none">
          <button
            onClick={() => setActiveTab('shareholders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'shareholders'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Users size={14} /> Shareholder Payouts ({shareholderPayouts?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'batches'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Layers size={14} /> Payout Batches ({batches?.total || 0})
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Payouts Logged</h3>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{shareholderPayouts?.total || 0}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Contribution Fund Earnings</h3>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ${Number(shareholderPayouts?.summary?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Referral Earnings</h3>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              ${Number(shareholderPayouts?.summary?.totalCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <Landmark size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Dispatched Payout</h3>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              ${Number(shareholderPayouts?.summary?.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Date Picker & Batch Generator Controls */}
      <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Generate Payout Batch Cycle</h2>
          </div>
          <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border-subtle font-semibold">
            Twice-Monthly Automatic Payout Engine
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Cycle Start Date</label>
            <input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1.5 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Cycle End Date</label>
            <input type="date" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 text-muted-foreground" />
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={!cycleStart || !cycleEnd || generateMutation.isPending}
            className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 h-[38px] text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 select-none shrink-0 shadow-sm"
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Generate Payout Batch
          </button>
        </div>
      </div>

      {/* TAB 1: ALL SHAREHOLDER PAYOUTS LEDGER */}
      {activeTab === 'shareholders' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden space-y-4">
          {/* Table Toolbar & Search Filters */}
          <div className="p-5 border-b border-border-subtle bg-muted/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={search} 
                onChange={e => { setSearch(e.target.value); setShareholderPage(1); }}
                placeholder="Search by Shareholder ID, Name, Bank Acc..." 
                className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <select 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setShareholderPage(1); }}
                className="px-4 py-2 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSED">PROCESSED (RELEASED)</option>
              </select>

              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
              >
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
          </div>

          {/* Master Shareholder Payouts Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Shareholder</th>
                  <th className="px-6 py-4">Bank Account & IFSC</th>
                  <th className="px-6 py-4 text-right">Contribution Fund Earnings</th>
                  <th className="px-6 py-4 text-right">Referral Earnings</th>
                  <th className="px-6 py-4 text-right">Total Earnings</th>
                  <th className="px-6 py-4">Cycle Range</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                {loadingShareholderPayouts ? (
                  <tr><td colSpan={7} className="text-center py-20 text-muted-foreground"><Loader2 size={20} className="animate-spin text-brand-primary mx-auto" /></td></tr>
                ) : shareholderPayouts?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-primary" />
                      <p className="text-xs font-bold">No Shareholder Payouts Found</p>
                      <p className="text-[10px] text-muted-foreground/75 mt-0.5">No payouts recorded for the current search filter.</p>
                    </td>
                  </tr>
                ) : (
                  shareholderPayouts?.data?.map((payout: any) => (
                    <tr key={payout.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-[11px] text-brand-primary">{payout.shareholder?.shareholderId}</div>
                        <div className="font-semibold text-gray-900 dark:text-white mt-0.5">{payout.shareholder?.name || 'Shareholder'}</div>
                        <div className="text-[10px] text-muted-foreground">{payout.shareholder?.phone || '-'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <Building size={12} className="text-muted-foreground shrink-0" />
                          {payout.shareholder?.bankName || 'Bank Not Set'}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          Acc: {payout.shareholder?.bankAccountNumber || '-'}
                        </div>
                        <div className="font-mono text-[9px] text-brand-primary/80 uppercase">
                          IFSC: {payout.shareholder?.bankIfsc || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(payout.profitAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                        ${Number(payout.commissionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-gray-900 dark:text-white text-sm">
                        ${Number(payout.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 font-semibold text-[11px] text-muted-foreground">
                        {payout.batch ? (
                          <>
                            <div>{new Date(payout.batch.cycleStart).toLocaleDateString()} -</div>
                            <div>{new Date(payout.batch.cycleEnd).toLocaleDateString()}</div>
                          </>
                        ) : '-'}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border tracking-wider flex items-center gap-1 w-max
                          ${payout.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40' : ''}
                          ${payout.status === 'PROCESSED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40' : ''}
                        `}>
                          {payout.status === 'PROCESSED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                          {payout.status === 'PROCESSED' ? 'RELEASED' : payout.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Shareholder Pagination */}
          {shareholderPayouts?.lastPage > 1 && (
            <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle">
              <button
                onClick={() => setShareholderPage(p => Math.max(1, p - 1))}
                disabled={shareholderPage === 1}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
              >
                Previous
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">Page {shareholderPage} of {shareholderPayouts.lastPage}</span>
              <button
                onClick={() => setShareholderPage(p => Math.min(shareholderPayouts.lastPage, p + 1))}
                disabled={shareholderPage >= shareholderPayouts.lastPage}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUT BATCHES CYCLES */}
      {activeTab === 'batches' && (
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
              {loadingBatches ? (
                <tr><td colSpan={5} className="text-center py-20 text-muted-foreground"><Loader2 size={20} className="animate-spin text-brand-primary mx-auto" /></td></tr>
              ) : batches?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-muted-foreground">
                    <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-primary" />
                    <p className="text-xs font-bold">No Batches Logged</p>
                    <p className="text-[10px] text-muted-foreground/75 mt-0.5">Please generate a batch range above to start a payout cycle.</p>
                  </td>
                </tr>
              ) : (
                batches?.data?.map((batch: any) => {
                  const isExpanded = expandedBatchId === batch.id;

                  return (
                    <React.Fragment key={batch.id}>
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-2">
                          <button
                            onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                            className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-brand-primary transition-colors cursor-pointer"
                            title="Expand Shareholders Payout List"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {batch.id}
                        </td>
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
                          <button
                            onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                            className="bg-muted hover:bg-secondary text-foreground text-[10px] uppercase font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            {isExpanded ? 'Hide Shareholder List' : 'View Shareholder Payouts'}
                          </button>
                          {batch.status === 'REVIEWED' && isSuperAdmin && (
                            <button 
                              onClick={() => handleApprove(batch.id)}
                              disabled={approveMutation.isPending}
                              className="bg-brand-accent hover:bg-brand-accent/95 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              {approveMutation.isPending ? 'Verifying...' : 'Approve'}
                            </button>
                          )}
                          {batch.status === 'APPROVED' && isSuperAdmin && (
                            <button 
                              onClick={() => handleRelease(batch.id)}
                              disabled={releaseMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              {releaseMutation.isPending ? 'Releasing...' : 'Release Funds'}
                            </button>
                          )}
                          {isSuperAdmin && batch.status !== 'RELEASED' && batch.status !== 'REJECTED' && (
                            <button 
                              onClick={() => handleReprocessBatch(batch.id)}
                              disabled={reprocessBatchMutation.isPending}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                              title="Reset & Reprocess Batch (Super Admin Only)"
                            >
                              {reprocessBatchMutation.isPending ? 'Resetting...' : 'Reprocess Batch'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Shareholders Payout Table */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-brand-primary/5 p-6 border-y border-brand-primary/10">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                                  <Users size={14} /> Itemized Shareholder Payouts for Batch: <span className="font-mono">{batch.id}</span>
                                </h4>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {expandedBatchDetails?.length || 0} Shareholders Included
                                </span>
                              </div>

                              {loadingBatchDetails ? (
                                <div className="py-8 text-center text-muted-foreground"><Loader2 size={16} className="animate-spin mx-auto text-brand-primary" /></div>
                              ) : expandedBatchDetails?.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">No individual shareholder payout items recorded in this batch.</p>
                              ) : (
                                <div className="bg-white dark:bg-card rounded-2xl border border-border-subtle overflow-hidden shadow-xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/30 border-b border-border-subtle text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3">Shareholder</th>
                                        <th className="px-4 py-3">Bank Details</th>
                                        <th className="px-4 py-3 text-right">Contribution Fund Earnings</th>
                                        <th className="px-4 py-3 text-right">Referral Earnings</th>
                                        <th className="px-4 py-3 text-right">Total Earnings</th>
                                        <th className="px-4 py-3">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle font-medium">
                                      {expandedBatchDetails?.map((detail: any) => (
                                        <tr key={detail.id} className="hover:bg-muted/10">
                                          <td className="px-4 py-3">
                                            <div className="font-mono font-bold text-brand-primary text-[10px]">{detail.shareholder?.shareholderId}</div>
                                            <div className="font-semibold text-gray-900 dark:text-white">{detail.shareholder?.name || 'Shareholder'}</div>
                                          </td>
                                          <td className="px-4 py-3 text-[10px]">
                                            <div className="font-semibold text-gray-900 dark:text-white">{detail.shareholder?.bankName || '-'}</div>
                                            <div className="font-mono text-muted-foreground">Acc: {detail.shareholder?.bankAccountNumber || '-'}</div>
                                            <div className="font-mono text-brand-primary/80 uppercase">IFSC: {detail.shareholder?.bankIfsc || '-'}</div>
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                            ${Number(detail.profitAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                                            ${Number(detail.commissionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="px-4 py-3 text-right font-extrabold text-gray-900 dark:text-white">
                                            ${Number(detail.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${detail.status === 'PROCESSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                                              {detail.status === 'PROCESSED' ? 'RELEASED' : detail.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Batch Pagination */}
          {batches?.lastPage > 1 && (
            <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle">
              <button
                onClick={() => setBatchPage(p => Math.max(1, p - 1))}
                disabled={batchPage === 1}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
              >
                Previous
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">Page {batchPage} of {batches.lastPage}</span>
              <button
                onClick={() => setBatchPage(p => Math.min(batches.lastPage, p + 1))}
                disabled={batchPage >= batches.lastPage}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
