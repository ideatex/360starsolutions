"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Calendar, Play, Loader2, Info, Users, 
  ChevronDown, ChevronUp, Search, CheckCircle, Clock, 
  FileSpreadsheet, FileText, Building, CreditCard, RefreshCw, 
  ShieldCheck, Eye, AlertTriangle, ArrowRight, X, Printer,
  FileCheck2, CheckCircle2, RotateCcw
} from 'lucide-react';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/exportUtils';

export default function AdminPayoutsPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'shareholders' | 'batches'>('shareholders');

  // Selected Cycle for generation / preview
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [batchPage, setBatchPage] = useState(1);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Modals & Drawers state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedStatementDetailId, setSelectedStatementDetailId] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [reconciliationBatchId, setReconciliationBatchId] = useState<string | null>(null);

  // Shareholder Payouts Ledger state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shareholderPage, setShareholderPage] = useState(1);

  // Fetch Available Canonical Cycles
  const { data: availableCycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['adminPayoutCycles'],
    queryFn: async () => {
      const res = await api.get('/admin/payouts/cycles');
      return res.data;
    }
  });

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
  const { data: shareholderPayouts, isLoading: loadingShareholderPayouts } = useQuery({
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

  // Fetch Reconciliation for a batch
  const { data: reconciliationData, isLoading: loadingReconciliation } = useQuery({
    queryKey: ['adminBatchReconciliation', reconciliationBatchId],
    queryFn: async () => {
      if (!reconciliationBatchId) return null;
      const res = await api.get(`/admin/payouts/batches/${reconciliationBatchId}/reconciliation`);
      return res.data;
    },
    enabled: !!reconciliationBatchId,
  });

  // Preview Batch Mutation
  const previewMutation = useMutation({
    mutationFn: async (cycleIdentifier: string) => {
      const res = await api.get('/admin/payouts/preview', {
        params: { cycleIdentifier }
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setIsPreviewOpen(true);
    },
    onError: (err: any) => {
      toast({ title: "Preview Failed", description: err.response?.data?.message || 'Error generating preview', type: "error" });
    }
  });

  // Generate Batch Mutation
  const generateMutation = useMutation({
    mutationFn: async (cycleIdentifier: string) => {
      const res = await api.post('/admin/payouts/batches/generate', { cycleIdentifier });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      queryClient.invalidateQueries({ queryKey: ['adminPayoutCycles'] });
      setIsPreviewOpen(false);
      toast({ 
        title: "Payout Batch Generated", 
        description: `Batch for ${data.cycleIdentifier} generated successfully with ${data.totalBeneficiaries} beneficiaries totaling ₹${Number(data.totalNetPayable || data.totalAmount).toLocaleString('en-IN')}.`, 
        type: "success" 
      });
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
      queryClient.invalidateQueries({ queryKey: ['adminPayoutCycles'] });
      toast({ title: "Batch Approved", description: "Cycle marked as Approved. Ready for fund release.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Approval Failed", description: err.response?.data?.message || 'Error approving batch', type: "error" });
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
      queryClient.invalidateQueries({ queryKey: ['adminPayoutCycles'] });
      if (expandedBatchId) {
        queryClient.invalidateQueries({ queryKey: ['adminBatchDetails', expandedBatchId] });
      }
      toast({ title: "Funds Dispatched", description: "All cycle ledger profits and commissions have been released to shareholders in INR.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Dispatch Failed", description: err.response?.data?.message || 'Error releasing batch', type: "error" });
    },
  });

  // Reverse Batch Mutation (Super Admin Only)
  const reverseBatchMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/admin/payouts/batches/${id}/reverse`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      queryClient.invalidateQueries({ queryKey: ['adminPayoutCycles'] });
      if (expandedBatchId) {
        queryClient.invalidateQueries({ queryKey: ['adminBatchDetails', expandedBatchId] });
      }
      toast({ title: "Batch Reversed", description: "Payout batch and associated ledgers have been marked as REVERSED.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Reversal Failed", description: err.response?.data?.message || 'Error reversing batch', type: "error" });
    },
  });

  const handleOpenStatement = async (detailId: string) => {
    setSelectedStatementDetailId(detailId);
    setIsStatementLoading(true);
    try {
      const res = await api.get(`/admin/payouts/statements/${detailId}`);
      setStatementData(res.data);
    } catch (e: any) {
      toast({ title: "Statement Error", description: e.response?.data?.message || "Could not fetch statement.", type: "error" });
      setSelectedStatementDetailId(null);
    } finally {
      setIsStatementLoading(false);
    }
  };

  const handleReverseBatch = async (id: string) => {
    const ok = await confirm({
      title: "Reverse Payout Batch",
      description: "AUTHORIZED SUPER ADMIN ACTION: You are about to formally reverse this payout batch. All associated earnings will transition to REVERSED state. This action is recorded in the financial audit log. Do you wish to proceed?",
      confirmText: "Confirm Reversal",
      variant: "danger"
    });
    if (ok) {
      reverseBatchMutation.mutate({ id, reason: 'Super Admin initiated manual reversal' });
    }
  };

  const handleApprove = async (id: string) => {
    const ok = await confirm({
      title: "Approve Payout Batch",
      description: "You are about to authorize this cycle's payouts. This transitions the batch to APPROVED status. Do you wish to continue?",
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
      description: "CRITICAL: You are about to initiate final fund release and mark earnings as PAID for all shareholders in this cycle. This action is immutable. Do you wish to proceed?",
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
      "Profit Share (₹)",
      "Gratitude Share (₹)",
      "Withheld (₹)",
      "Net Payout (₹)",
      "Cycle Identifier",
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
      Number(item.grossProfitShare || item.profitAmount || 0).toFixed(2),
      Number(item.grossGratitudeShare || item.commissionAmount || 0).toFixed(2),
      Number(item.withheldAmount || 0).toFixed(2),
      Number(item.netPayable || item.totalAmount || 0).toFixed(2),
      item.batch?.cycleIdentifier || `${new Date(item.batch?.cycleStart).toLocaleDateString()} - ${new Date(item.batch?.cycleEnd).toLocaleDateString()}`,
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

  const handleExportShareholderPayoutsPDF = () => {
    const list = shareholderPayouts?.data || [];
    if (list.length === 0) {
      toast({ title: "No Data", description: "No shareholder payout records available.", type: "warning" });
      return;
    }

    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId', formatter: (_, r) => r.shareholder?.shareholderId || '-' },
      { header: 'Name', key: 'name', formatter: (_, r) => r.shareholder?.name || '-' },
      { header: 'Bank Name', key: 'bankName', formatter: (_, r) => r.shareholder?.bankName || '-' },
      { header: 'Account No.', key: 'bankAccountNumber', formatter: (_, r) => r.shareholder?.bankAccountNumber || '-' },
      { header: 'IFSC Code', key: 'bankIfsc', formatter: (_, r) => r.shareholder?.bankIfsc || '-' },
      { header: 'Profit Share (₹)', key: 'grossProfitShare', formatter: (_, r) => Number(r.grossProfitShare || r.profitAmount || 0).toFixed(2) },
      { header: 'Gratitude (₹)', key: 'grossGratitudeShare', formatter: (_, r) => Number(r.grossGratitudeShare || r.commissionAmount || 0).toFixed(2) },
      { header: 'Net Payout (₹)', key: 'netPayable', formatter: (_, r) => Number(r.netPayable || r.totalAmount || 0).toFixed(2) },
      { header: 'Status', key: 'status' },
    ];

    const totalPayout = list.reduce((acc: number, item: any) => acc + Number(item.netPayable || item.totalAmount || 0), 0);

    exportToPDF(
      'shareholder_payouts_ledger',
      'Shareholder Payouts Ledger Report (INR)',
      `Filter Status: ${statusFilter || 'All Statuses'} | Search: ${search || 'None'}`,
      columns,
      list,
      [
        { label: 'Total Payout Records', value: list.length },
        { label: 'Total Net Dispatched Payout', value: `₹${totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
      ]
    );

    toast({ title: "PDF Report Generated", description: `Opened printable shareholder payout report for ${list.length} records.`, type: "success" });
  };

  const handleExportBatchesCSV = () => {
    const list = batches?.data || [];
    if (list.length === 0) {
      toast({ title: "No Data", description: "No payout batch cycles available.", type: "warning" });
      return;
    }
    const columns: ExportColumn[] = [
      { header: 'Batch ID', key: 'id' },
      { header: 'Cycle Identifier', key: 'cycleIdentifier' },
      { header: 'Cycle Start Date', key: 'cycleStart', formatter: (v) => new Date(v).toLocaleDateString() },
      { header: 'Cycle End Date', key: 'cycleEnd', formatter: (v) => new Date(v).toLocaleDateString() },
      { header: 'Total Net Payable (₹)', key: 'totalNetPayable', formatter: (v, r) => Number(v || r.totalAmount || 0).toFixed(2) },
      { header: 'Status', key: 'status' },
    ];
    exportToCSV('payout_batches_summary', columns, list);
    toast({ title: "CSV Downloaded", description: "Exported payout batches summary to CSV.", type: "success" });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Landmark className="text-brand-primary w-7 h-7" />
            Payout Batches & Financial Statements
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative Product 360 Fortnightly Engine • 5% Monthly Profit Share • L1–L12 Gratitude Share • Payouts on 6th & 21st
          </p>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-2xl border border-border-subtle">
          <button
            onClick={() => setActiveTab('shareholders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'shareholders'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Shareholder Payouts Ledger
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'batches'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fortnightly Batches
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
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Profit Share (5%)</h3>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(shareholderPayouts?.summary?.totalProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Gratitude Share</h3>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              ₹{Number(shareholderPayouts?.summary?.totalCommission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <Landmark size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-xs">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Dispatched Payout</h3>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              ₹{Number(shareholderPayouts?.summary?.totalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Canonical Cycle Engine Generator & Pre-Execution Preview Controls */}
      <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-subtle pb-4 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Authoritative Fortnightly Cycle Engine</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> Idempotent & Concurrency Safe
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border-subtle font-semibold">
              Payouts on 6th & 21st
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              Select Canonical Payout Cycle
            </label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 text-foreground"
            >
              <option value="">-- Choose Canonical Cycle --</option>
              {availableCycles?.map((c: any) => (
                <option key={c.cycleIdentifier} value={c.cycleIdentifier}>
                  {c.label} {c.hasBatch ? `[Generated: ${c.batchStatus}]` : '[Not Generated]'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Preview Button */}
            <button
              onClick={() => selectedCycleId && previewMutation.mutate(selectedCycleId)}
              disabled={!selectedCycleId || previewMutation.isPending}
              className="flex-1 md:flex-initial bg-secondary hover:bg-secondary/80 text-foreground font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 h-[38px] text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 border border-border-subtle"
            >
              {previewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Preview Calculation
            </button>

            {/* Direct Generate Button */}
            <button
              onClick={() => selectedCycleId && generateMutation.mutate(selectedCycleId)}
              disabled={!selectedCycleId || generateMutation.isPending}
              className="flex-1 md:flex-initial bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 h-[38px] text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 select-none shrink-0 shadow-sm"
            >
              {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Generate Batch
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ALL SHAREHOLDER PAYOUTS LEDGER */}
      {activeTab === 'shareholders' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden space-y-4">
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

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setShareholderPage(1); }}
                className="px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSED">PROCESSED</option>
                <option value="PAID">PAID</option>
                <option value="REVERSED">REVERSED</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold bg-white dark:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                CSV Export
              </button>

              <button
                onClick={handleExportShareholderPayoutsPDF}
                className="flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold bg-white dark:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <FileText size={14} className="text-brand-primary" />
                PDF Report
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-muted/20 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Shareholder</th>
                  <th className="py-3 px-4">Bank Details</th>
                  <th className="py-3 px-4 text-right">Profit Share (₹)</th>
                  <th className="py-3 px-4 text-right">Gratitude Share (₹)</th>
                  <th className="py-3 px-4 text-right">Withheld (₹)</th>
                  <th className="py-3 px-4 text-right font-black text-gray-900 dark:text-white">Net Payable (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loadingShareholderPayouts ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary mb-2" />
                      Loading shareholder payouts ledger...
                    </td>
                  </tr>
                ) : shareholderPayouts?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No payout records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  shareholderPayouts?.data?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{p.shareholder?.shareholderId}</div>
                        <div className="text-[11px] text-muted-foreground">{p.shareholder?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{p.shareholder?.bankName || 'N/A'}</div>
                        <div className="text-muted-foreground font-mono">{p.shareholder?.bankAccountNumber || 'No Account'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        ₹{Number(p.grossProfitShare || p.profitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        ₹{Number(p.grossGratitudeShare || p.commissionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        ₹{Number(p.withheldAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-gray-900 dark:text-white">
                        ₹{Number(p.netPayable || p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          p.status === 'PROCESSED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                          p.status === 'REVERSED' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenStatement(p.id)}
                          className="p-1.5 hover:bg-secondary rounded-lg text-brand-primary transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        >
                          <FileText size={14} /> Statement
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {shareholderPayouts?.lastPage > 1 && (
            <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {shareholderPage} of {shareholderPayouts.lastPage}</span>
              <div className="flex gap-2">
                <button
                  disabled={shareholderPage <= 1}
                  onClick={() => setShareholderPage(p => p - 1)}
                  className="px-3 py-1 border border-border-subtle rounded-lg disabled:opacity-40 hover:bg-secondary cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={shareholderPage >= shareholderPayouts.lastPage}
                  onClick={() => setShareholderPage(p => p + 1)}
                  className="px-3 py-1 border border-border-subtle rounded-lg disabled:opacity-40 hover:bg-secondary cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FORTNIGHTLY BATCHES VIEW */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-border-subtle bg-muted/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Twice-Monthly Payout Batch Runs</h3>
            <button
              onClick={handleExportBatchesCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold bg-white dark:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" /> Export Summary CSV
            </button>
          </div>

          <div className="divide-y divide-border-subtle">
            {loadingBatches ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary mb-2" />
                Loading payout batches...
              </div>
            ) : batches?.data?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No payout batches generated yet.</div>
            ) : (
              batches?.data?.map((b: any) => (
                <div key={b.id} className="p-5 hover:bg-muted/5 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-brand-primary">{b.cycleIdentifier || b.id.substring(0, 8)}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          b.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                          b.status === 'REVERSED' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {b.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-semibold">
                          Cycle {b.cycleNumber}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span>Period: {new Date(b.cycleStart).toLocaleDateString()} – {new Date(b.cycleEnd).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Beneficiaries: {b.totalBeneficiaries}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Total Net Payable</div>
                        <div className="text-base font-black text-gray-900 dark:text-white">
                          ₹{Number(b.totalNetPayable || b.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Reconciliation Button */}
                        <button
                          onClick={() => setReconciliationBatchId(b.id)}
                          title="Verify Balance & Reconciliation Checksum"
                          className="px-3 py-1.5 border border-border-subtle bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck size={14} className="text-emerald-600" /> Audit
                        </button>

                        {/* Approve Button (Super Admin Only) */}
                        {b.status === 'REVIEWED' && shareholder?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleApprove(b.id)}
                            disabled={approveMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                        )}

                        {/* Release Button (Super Admin Only) */}
                        {b.status === 'APPROVED' && shareholder?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleRelease(b.id)}
                            disabled={releaseMutation.isPending}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CreditCard size={14} /> Release Funds
                          </button>
                        )}

                        {/* Reverse Button (Super Admin Only) */}
                        {b.status !== 'REVERSED' && shareholder?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleReverseBatch(b.id)}
                            disabled={reverseBatchMutation.isPending}
                            className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw size={14} /> Reverse
                          </button>
                        )}

                        {/* Expand Details Button */}
                        <button
                          onClick={() => setExpandedBatchId(expandedBatchId === b.id ? null : b.id)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          {expandedBatchId === b.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Batch Items Details */}
                  {expandedBatchId === b.id && (
                    <div className="mt-4 pt-4 border-t border-border-subtle bg-muted/10 p-4 rounded-2xl">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                        <Users size={14} /> Batch Beneficiary Breakdown
                      </h4>
                      {loadingBatchDetails ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">Loading details...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-border-subtle text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                                <th className="py-2 px-3">Shareholder</th>
                                <th className="py-2 px-3">Account Type</th>
                                <th className="py-2 px-3 text-right">Profit Share (₹)</th>
                                <th className="py-2 px-3 text-right">Gratitude (₹)</th>
                                <th className="py-2 px-3 text-right">Withheld (₹)</th>
                                <th className="py-2 px-3 text-right font-black text-gray-900 dark:text-white">Net Payable (₹)</th>
                                <th className="py-2 px-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                              {expandedBatchDetails?.map((item: any) => (
                                <tr key={item.id} className="hover:bg-muted/20">
                                  <td className="py-2 px-3 font-semibold">{item.shareholder?.shareholderId} – {item.shareholder?.name}</td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-secondary">
                                      {item.shareholder?.accountType}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                                    ₹{Number(item.grossProfitShare || item.profitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right text-blue-600 font-semibold">
                                    ₹{Number(item.grossGratitudeShare || item.commissionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right text-amber-600 font-semibold">
                                    ₹{Number(item.withheldAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-gray-900 dark:text-white">
                                    ₹{Number(item.netPayable || item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      onClick={() => handleOpenStatement(item.id)}
                                      className="text-brand-primary hover:underline font-bold text-[10px] cursor-pointer"
                                    >
                                      Statement
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PRE-EXECUTION PREVIEW MODAL / DRAWER */}
      <AnimatePresence>
        {isPreviewOpen && previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card border border-border-subtle rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border-subtle pb-4 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="text-brand-primary" size={18} />
                    Pre-Execution Payout Batch Preview
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Canonical Cycle: <span className="font-bold text-foreground">{previewData.cycle?.cycleIdentifier}</span> ({previewData.cycle?.label})
                  </p>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="p-3 bg-secondary/40 rounded-xl border border-border-subtle">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Profit (5%)</span>
                  <div className="text-sm font-black text-emerald-600 mt-0.5">
                    ₹{Number(previewData.summary?.totalGrossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border-subtle">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Gratitude</span>
                  <div className="text-sm font-black text-blue-600 mt-0.5">
                    ₹{Number(previewData.summary?.totalGrossGratitude || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border-subtle">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Withheld (20%)</span>
                  <div className="text-sm font-black text-amber-600 mt-0.5">
                    ₹{Number(previewData.summary?.totalWithheld || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
                  <span className="text-[10px] font-bold text-brand-primary uppercase">Total Net Payable</span>
                  <div className="text-sm font-black text-brand-primary mt-0.5">
                    ₹{Number(previewData.summary?.totalNetPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Beneficiaries Table */}
              <div className="flex-1 overflow-y-auto border border-border-subtle rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-secondary text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Shareholder</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Proration / Active Days</th>
                      <th className="py-2.5 px-3 text-right">Profit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Gratitude (₹)</th>
                      <th className="py-2.5 px-3 text-right">Withheld (₹)</th>
                      <th className="py-2.5 px-3 text-right font-black text-gray-900 dark:text-white">Net Payable (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-[11px]">
                    {previewData.beneficiaries?.map((b: any) => (
                      <tr key={b.shareholderId} className="hover:bg-muted/10">
                        <td className="py-2.5 px-3 font-semibold">
                          <div>{b.shareholderCode}</div>
                          <div className="text-[10px] text-muted-foreground">{b.name}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-secondary">
                            {b.accountType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {b.isFirstPayout ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              First Payout ({b.activeDays} days)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Full Fortnightly (2.5%)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                          ₹{Number(b.grossProfitShare).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-semibold">
                          ₹{Number(b.grossGratitudeShare).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">
                          ₹{Number(b.withheldAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-gray-900 dark:text-white">
                          ₹{Number(b.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Excluded Accounts Notice if any */}
              {previewData.excludedAccounts?.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs shrink-0">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> Excluded Accounts ({previewData.excludedAccounts.length})
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5 max-h-20 overflow-y-auto">
                    {previewData.excludedAccounts.map((ex: any) => (
                      <div key={ex.shareholderId}>
                        • <span className="font-semibold">{ex.shareholderCode} ({ex.name}):</span> {ex.details}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle shrink-0">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateMutation.mutate(previewData.cycle?.cycleIdentifier)}
                  disabled={generateMutation.isPending}
                  className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Confirm & Generate Batch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORMAL FINANCIAL STATEMENT MODAL */}
      <AnimatePresence>
        {selectedStatementDetailId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card border border-border-subtle rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6"
            >
              {isStatementLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-primary mb-2" />
                  Generating official statement...
                </div>
              ) : statementData ? (
                <>
                  <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                    <div>
                      <div className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">360 Star Solutions • Official Payout Statement</div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                        Cycle: {statementData.cycleIdentifier}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedStatementDetailId(null)}
                      className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Shareholder & Bank Details Card */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Beneficiary</span>
                      <div className="font-bold text-gray-900 dark:text-white mt-0.5">{statementData.shareholder?.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{statementData.shareholder?.code}</div>
                      <div className="text-[11px] text-muted-foreground">{statementData.shareholder?.phone}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Verified Bank Details</span>
                      <div className="font-bold text-gray-900 dark:text-white mt-0.5">{statementData.shareholder?.bankName || 'N/A'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">A/C: {statementData.shareholder?.accountNumber || 'N/A'}</div>
                      <div className="text-[11px] text-muted-foreground">IFSC: {statementData.shareholder?.ifsc || 'N/A'} • {statementData.shareholder?.branch || ''}</div>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  <div className="space-y-2 text-xs border border-border-subtle p-4 rounded-2xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Proration Status:</span>
                      <span className="font-bold text-foreground">
                        {statementData.breakdown?.isFirstPayout
                          ? `First Payout (${statementData.breakdown?.activeDays} active days @ ₹${statementData.breakdown?.dailyRate?.toFixed(6)}/day)`
                          : 'Full Fortnightly Share (2.50%)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Gross Profit Share (5%):</span>
                      <span className="font-bold text-emerald-600">
                        ₹{Number(statementData.breakdown?.grossProfitShare).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Gross Gratitude Share:</span>
                      <span className="font-bold text-blue-600">
                        ₹{Number(statementData.breakdown?.grossGratitudeShare).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {statementData.breakdown?.withheldAmount > 0 && (
                      <div className="flex items-center justify-between text-amber-600">
                        <span>Zero-Contribution Withholding (20%):</span>
                        <span className="font-bold">
                          -₹{Number(statementData.breakdown?.withheldAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-sm font-black text-gray-900 dark:text-white">
                      <span>Net Payable Amount:</span>
                      <span className="text-brand-primary text-base">
                        ₹{Number(statementData.breakdown?.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
                    <span>Generated on: {new Date(statementData.generatedAt).toLocaleString()}</span>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-bold text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} /> Print Statement
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECONCILIATION AUDIT MODAL */}
      <AnimatePresence>
        {reconciliationBatchId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card border border-border-subtle rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" size={18} />
                    Financial Reconciliation Audit
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Batch: {reconciliationData?.cycleIdentifier || reconciliationBatchId}
                  </p>
                </div>
                <button
                  onClick={() => setReconciliationBatchId(null)}
                  className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {loadingReconciliation ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary mb-2" />
                  Verifying ledger checksums...
                </div>
              ) : reconciliationData ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    reconciliationData.isBalanced 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                  }`}>
                    {reconciliationData.isBalanced ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    <div>
                      <div className="font-black text-sm">
                        {reconciliationData.isBalanced ? '100% RECONCILED & BALANCED' : 'RECONCILIATION EXCEPTION DETECTED'}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        Discrepancy: ₹{reconciliationData.discrepancy.toFixed(2)} (Threshold &le; ₹0.05)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border border-border-subtle p-4 rounded-2xl">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Summed Gross Profit:</span>
                      <span className="font-bold">₹{reconciliationData.detailsSummed?.grossProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Summed Gross Gratitude:</span>
                      <span className="font-bold">₹{reconciliationData.detailsSummed?.grossGratitude?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Summed Withheld (20%):</span>
                      <span className="font-bold">₹{reconciliationData.detailsSummed?.withheld?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-2 border-t border-border-subtle flex justify-between font-black text-sm text-gray-900 dark:text-white">
                      <span>Batch Net Payable:</span>
                      <span className="text-brand-primary">₹{reconciliationData.batchReported?.totalNetPayable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => setReconciliationBatchId(null)}
                      className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Dismiss Audit
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
