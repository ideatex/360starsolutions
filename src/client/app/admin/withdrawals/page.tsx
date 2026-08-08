"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Search, Filter, Calendar, FileSpreadsheet, FileText, 
  Plus, Loader2, ArrowRight, ShieldAlert, CheckCircle2, DollarSign, Wallet,
  User, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/exportUtils';

export default function AdminWithdrawalsPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Modal States
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [targetShareholderInput, setTargetShareholderInput] = useState('');
  const [activeFundData, setActiveFundData] = useState<any>(null);
  const [isFetchingFund, setIsFetchingFund] = useState(false);

  const [withdrawalType, setWithdrawalType] = useState<'PARTIAL' | 'FULL'>('PARTIAL');
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('');
  const [remarksInput, setRemarksInput] = useState('');

  // Fetch Paginated Withdrawal History
  const { data: withdrawalsResponse, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['adminWithdrawals', page, search, typeFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/admin/withdrawals', {
        params: {
          page,
          limit: 15,
          search: search || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res.data;
    },
  });

  // Fetch Active Contribution Fund for Target Shareholder
  const handleCheckShareholderFund = async () => {
    if (!targetShareholderInput.trim()) {
      toast({ title: 'Input Required', description: 'Please enter a Shareholder ID.', type: 'warning' });
      return;
    }
    setIsFetchingFund(true);
    try {
      const res = await api.get(`/admin/withdrawals/active-funds/${targetShareholderInput.trim()}`);
      setActiveFundData(res.data);
      if (withdrawalType === 'FULL') {
        setWithdrawalAmountInput(String(res.data.activeContributionFund));
      }
      toast({
        title: 'Active Fund Loaded',
        description: `Active Contribution Fund for ${res.data.shareholder.name} (${res.data.shareholder.shareholderId}): ₹${res.data.activeContributionFund.toLocaleString()}`,
        type: 'success',
      });
    } catch (err: any) {
      setActiveFundData(null);
      toast({
        title: 'Shareholder Not Found',
        description: err.response?.data?.message || 'Could not locate shareholder or active funds.',
        type: 'error',
      });
    } finally {
      setIsFetchingFund(false);
    }
  };

  // Process Withdrawal Mutation
  const processMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        shareholderId: activeFundData?.shareholder?.id || targetShareholderInput.trim(),
        type: withdrawalType,
        remarks: remarksInput,
      };
      if (withdrawalType === 'PARTIAL') {
        payload.amount = Number(withdrawalAmountInput);
      }
      const res = await api.post('/admin/withdrawals/process', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminShareholderPayouts'] });
      
      setIsProcessModalOpen(false);
      resetModalForm();

      toast({
        title: `${withdrawalType === 'FULL' ? 'Full' : 'Partial'} Withdrawal Processed`,
        description: `Successfully processed withdrawal ${data.withdrawalId}. Remaining Active Fund: ₹${Number(data.remainingActiveFund).toLocaleString()}`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Processing Failed',
        description: err.response?.data?.message || 'Failed to process withdrawal transaction.',
        type: 'error',
      });
    },
  });

  const resetModalForm = () => {
    setTargetShareholderInput('');
    setActiveFundData(null);
    setWithdrawalType('PARTIAL');
    setWithdrawalAmountInput('');
    setRemarksInput('');
  };

  const handleOpenProcessModal = () => {
    resetModalForm();
    setIsProcessModalOpen(true);
  };

  const handleTypeChange = (newType: 'PARTIAL' | 'FULL') => {
    setWithdrawalType(newType);
    if (newType === 'FULL' && activeFundData) {
      setWithdrawalAmountInput(String(activeFundData.activeContributionFund));
    }
  };

  const handleConfirmProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFundData) {
      toast({ title: 'Validation Error', description: 'Please load and verify shareholder active fund details first.', type: 'warning' });
      return;
    }
    const currentActive = Number(activeFundData.activeContributionFund || 0);
    if (currentActive <= 0) {
      toast({ title: 'Insufficient Fund', description: 'Selected shareholder has zero active Contribution Fund balance.', type: 'error' });
      return;
    }

    let numericAmount = withdrawalType === 'FULL' ? currentActive : Number(withdrawalAmountInput);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount greater than zero.', type: 'warning' });
      return;
    }
    if (numericAmount > currentActive) {
      toast({ title: 'Exceeds Active Fund', description: `Withdrawal amount cannot exceed available active Contribution Fund (₹${currentActive.toLocaleString()}).`, type: 'error' });
      return;
    }

    const remaining = currentActive - numericAmount;
    const ok = await confirm({
      title: `Confirm ${withdrawalType === 'FULL' ? 'FULL' : 'PARTIAL'} Withdrawal?`,
      description: `You are about to withdraw ₹${numericAmount.toLocaleString()} from ${activeFundData.shareholder.name} (${activeFundData.shareholder.shareholderId}). Remaining Active Contribution Fund will become ₹${remaining.toLocaleString()}. Do you wish to proceed?`,
      confirmText: 'Execute Withdrawal',
      variant: withdrawalType === 'FULL' ? 'danger' : 'info',
    });

    if (ok) {
      processMutation.mutate();
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/admin/withdrawals/export', {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      const { csv } = res.data;
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `withdrawals_history_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'CSV Exported',
        description: 'Exported withdrawal transaction history to CSV.',
        type: 'success',
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'Could not export withdrawal history CSV.',
        type: 'error',
      });
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      const res = await api.get('/admin/withdrawals/export', {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      const { withdrawals } = res.data;
      const columns: ExportColumn[] = [
        { header: 'Withdrawal ID', key: 'withdrawalId' },
        { header: 'Shareholder ID', key: 'shareholderId', formatter: (_, r) => r.shareholder?.shareholderId || '-' },
        { header: 'Name', key: 'name', formatter: (_, r) => r.shareholder?.name || '-' },
        { header: 'Type', key: 'type' },
        { header: 'Amount (₹)', key: 'amount', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
        { header: 'Remaining Active Fund (₹)', key: 'remainingActiveFund', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
        { header: 'Date', key: 'createdAt', formatter: (v) => new Date(v).toLocaleString('en-IN') },
        { header: 'Remarks', key: 'remarks', formatter: (v) => v || '-' },
      ];

      const totalWithdrawn = (withdrawals || []).reduce((acc: number, w: any) => acc + Number(w.amount || 0), 0);

      exportToPDF(
        'withdrawals_history',
        'Shareholder Contribution Fund Withdrawal Report',
        `Filters - Type: ${typeFilter || 'All Types'} | Search: ${search || 'None'}`,
        columns,
        withdrawals || [],
        [
          { label: 'Total Withdrawal Transactions', value: (withdrawals || []).length },
          { label: 'Total Capital Withdrawn', value: `₹${totalWithdrawn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        ]
      );

      toast({
        title: 'PDF Exported',
        description: 'Opened printable withdrawal history report.',
        type: 'success',
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'Could not export withdrawal history PDF.',
        type: 'error',
      });
    }
  };

  const withdrawalsList = withdrawalsResponse?.data || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-brand-primary" /> Contribution Fund Withdrawal Module
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
            Process shareholder Partial or Full Withdrawals with automatic adjustments to Active Contribution Funds, Profit Sharing, and Business Volume.
          </p>
        </div>

        <button
          onClick={handleOpenProcessModal}
          className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider shrink-0"
        >
          <Plus size={16} /> Process Withdrawal
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Transactions</h3>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {withdrawalsResponse?.total || 0}
            </p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <ArrowRightLeft size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Capital Withdrawn</h3>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(withdrawalsResponse?.summary?.totalWithdrawnAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Wallet size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Partial Withdrawals</h3>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {withdrawalsList.filter((w: any) => w.type === 'PARTIAL').length}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <RefreshCw size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-5 rounded-2xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Withdrawals</h3>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {withdrawalsList.filter((w: any) => w.type === 'FULL').length}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Export */}
      <div className="bg-white dark:bg-card p-4 rounded-3xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between select-none">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search Withdrawal ID, Shareholder ID, Name, or Remarks..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-border-subtle focus:outline-none focus:ring-1 focus:ring-brand-primary text-xs font-semibold dark:bg-secondary/35"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
          >
            <option value="">All Withdrawal Types</option>
            <option value="PARTIAL">Partial Withdrawal</option>
            <option value="FULL">Full Withdrawal</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-semibold text-muted-foreground focus:outline-none"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-semibold text-muted-foreground focus:outline-none"
            title="End Date"
          />

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
          >
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Withdrawal History Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border-subtle bg-muted/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Withdrawal History Ledger
          </h3>
          <span className="text-[10px] text-muted-foreground font-semibold">
            Showing {withdrawalsList.length} of {withdrawalsResponse?.total || 0} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Withdrawal ID</th>
                <th className="px-6 py-4">Shareholder</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Withdrawal Amount</th>
                <th className="px-6 py-4 text-right">Remaining Active Fund</th>
                <th className="px-6 py-4">Withdrawal Date</th>
                <th className="px-6 py-4">Processed By</th>
                <th className="px-6 py-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
              {loadingWithdrawals ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-muted-foreground">
                    <Loader2 size={20} className="animate-spin text-brand-primary mx-auto" />
                  </td>
                </tr>
              ) : withdrawalsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-muted-foreground">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-primary" />
                    <p className="text-xs font-bold">No Withdrawal Records Found</p>
                    <p className="text-[10px] text-muted-foreground/75 mt-0.5">
                      No withdrawal transactions recorded matching current filters.
                    </p>
                  </td>
                </tr>
              ) : (
                withdrawalsList.map((w: any) => (
                  <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[11px] text-brand-primary">
                      {w.withdrawalId}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-[11px] text-gray-900 dark:text-white">
                        {w.shareholder?.shareholderId || '-'}
                      </div>
                      <div className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                        {w.shareholder?.name || 'Shareholder'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border tracking-wider ${
                        w.type === 'FULL'
                          ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/40'
                          : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                      }`}>
                        {w.type === 'FULL' ? 'Full Withdrawal' : 'Partial Withdrawal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                      ₹{Number(w.remainingActiveFund).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-muted-foreground">
                      {new Date(w.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium">
                      {w.processedBy?.name || w.processedBy?.shareholderId || 'Super Admin'}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-muted-foreground max-w-xs truncate" title={w.remarks}>
                      {w.remarks || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {withdrawalsResponse?.lastPage > 1 && (
          <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle select-none">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
            >
              Previous
            </button>
            <span className="text-[11px] font-bold text-muted-foreground">
              Page {page} of {withdrawalsResponse.lastPage}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(withdrawalsResponse.lastPage, p + 1))}
              disabled={page >= withdrawalsResponse.lastPage}
              className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* PROCESS WITHDRAWAL MODAL */}
      <AnimatePresence>
        {isProcessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card text-card-foreground border border-border-subtle w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-6 relative"
            >
              <button
                onClick={() => setIsProcessModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:bg-muted dark:hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="border-b border-border-subtle pb-4">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-brand-primary" /> Process Shareholder Withdrawal
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Withdraw partial or full capital from an active Contribution Fund with automatic system balances adjustment.
                </p>
              </div>

              <form onSubmit={handleConfirmProcess} className="space-y-5">
                {/* Step 1: Target Shareholder Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Shareholder ID / Identifier
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        value={targetShareholderInput}
                        onChange={(e) => setTargetShareholderInput(e.target.value)}
                        placeholder="e.g. USR000001 or SH100001"
                        className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckShareholderFund}
                      disabled={isFetchingFund || !targetShareholderInput.trim()}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isFetchingFund ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Verify Active Fund
                    </button>
                  </div>
                </div>

                {/* Active Fund Details Preview Card */}
                {activeFundData && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
                      <span>{activeFundData.shareholder.name} ({activeFundData.shareholder.shareholderId})</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-extrabold uppercase">
                        {activeFundData.shareholder.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-brand-primary/10 text-xs">
                      <span className="text-muted-foreground font-semibold">Available Active Contribution Fund:</span>
                      <span className="text-base font-black text-brand-primary">
                        ₹{Number(activeFundData.activeContributionFund).toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Withdrawal Type Radio Switch */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Withdrawal Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('PARTIAL')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        withdrawalType === 'PARTIAL'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-border-subtle bg-muted/20 text-muted-foreground font-semibold hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs uppercase font-extrabold tracking-wider">Partial Withdrawal</span>
                        {withdrawalType === 'PARTIAL' && <CheckCircle2 size={16} className="text-blue-500" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-snug">
                        Withdraw specific amount. Remaining fund balance continues profit sharing.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeChange('FULL')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        withdrawalType === 'FULL'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-border-subtle bg-muted/20 text-muted-foreground font-semibold hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs uppercase font-extrabold tracking-wider">Full Withdrawal</span>
                        {withdrawalType === 'FULL' && <CheckCircle2 size={16} className="text-purple-500" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-snug">
                        Withdraw entire active fund. Fund marked Fully Withdrawn; future ROI stops.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Step 3: Amount Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Withdrawal Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={withdrawalType === 'FULL'}
                    value={withdrawalAmountInput}
                    onChange={(e) => setWithdrawalAmountInput(e.target.value)}
                    placeholder="e.g. 30000"
                    className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40 disabled:opacity-75"
                  />
                  {activeFundData && (
                    <p className="text-[10px] text-muted-foreground">
                      Maximum available to withdraw: <strong className="text-foreground">₹{Number(activeFundData.activeContributionFund).toLocaleString()}</strong>
                    </p>
                  )}
                </div>

                {/* Step 4: Real-time Calculation Preview */}
                {activeFundData && (
                  <div className="p-4 rounded-2xl bg-secondary/40 border border-border-subtle space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Previous Active Fund:</span>
                      <span className="font-bold text-foreground">₹{Number(activeFundData.activeContributionFund).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Withdrawal Amount:</span>
                      <span className="font-bold">- ₹{Number(withdrawalType === 'FULL' ? activeFundData.activeContributionFund : (withdrawalAmountInput || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border-subtle font-extrabold text-gray-900 dark:text-white">
                      <span>Remaining Active Contribution Fund:</span>
                      <span className="text-brand-primary">
                        ₹{Math.max(0, Number(activeFundData.activeContributionFund) - Number(withdrawalType === 'FULL' ? activeFundData.activeContributionFund : (withdrawalAmountInput || 0))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Remarks Field */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Remarks / Operator Notes
                  </label>
                  <textarea
                    rows={2}
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    placeholder="Enter reason or reference notes for this withdrawal..."
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/40"
                  />
                </div>

                {/* Submit Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setIsProcessModalOpen(false)}
                    className="px-5 py-2.5 border border-border-subtle rounded-xl text-xs font-bold hover:bg-muted dark:hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processMutation.isPending || !activeFundData}
                    className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {processMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={14} /> Process {withdrawalType === 'FULL' ? 'Full' : 'Partial'} Withdrawal
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
