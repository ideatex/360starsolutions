"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { motion } from 'framer-motion';
import { 
  FileText, Search, Filter, Calendar, FileSpreadsheet, Download, 
  ArrowUpDown, Loader2, Users, ArrowRightLeft, Landmark, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, User, RefreshCw
} from 'lucide-react';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/exportUtils';

export default function AdminReportsPage() {
  const { toast } = useToast();

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<'shareholders' | 'transactions' | 'payouts'>('shareholders');

  // Universal Filter States
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('shareholderId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Specific Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [agreementFilter, setAgreementFilter] = useState('');
  const [chequeFilter, setChequeFilter] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Fetch Payout Batches for filter dropdown in Payout Report
  const { data: batchesList } = useQuery({
    queryKey: ['payoutBatchesForFilter'],
    queryFn: async () => {
      const res = await api.get('/admin/payouts/batches', { params: { page: 1, limit: 100 } });
      return res.data.data || [];
    },
    enabled: activeTab === 'payouts',
  });

  // Query 1: Shareholder Report
  const { data: shareholdersData, isLoading: loadingShareholders } = useQuery({
    queryKey: ['reportShareholders', search, sortBy, sortOrder, statusFilter, agreementFilter, chequeFilter],
    queryFn: async () => {
      const res = await api.get('/admin/reports/shareholder-summary', {
        params: {
          search: search || undefined,
          sortBy,
          sortOrder,
          status: statusFilter || undefined,
          agreementIssued: agreementFilter || undefined,
          chequeIssued: chequeFilter || undefined,
        },
      });
      return res.data || [];
    },
    enabled: activeTab === 'shareholders',
  });

  // Query 2: Transaction Report
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['reportTransactions', search, sortBy, sortOrder, transactionTypeFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/admin/reports/transactions', {
        params: {
          search: search || undefined,
          sortBy,
          sortOrder,
          type: transactionTypeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res.data || [];
    },
    enabled: activeTab === 'transactions',
  });

  // Query 3: Payout Report
  const { data: payoutsData, isLoading: loadingPayouts } = useQuery({
    queryKey: ['reportPayouts', search, sortBy, sortOrder, selectedBatchId],
    queryFn: async () => {
      const res = await api.get('/admin/reports/payout-cycle-summary', {
        params: {
          search: search || undefined,
          sortBy,
          sortOrder,
          batchId: selectedBatchId || undefined,
        },
      });
      return res.data || [];
    },
    enabled: activeTab === 'payouts',
  });

  // Toggle Sorting helper
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Pagination helper
  const getPaginatedData = (dataList: any[]) => {
    const list = dataList || [];
    const startIndex = (page - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(list.length / pageSize) || 1;
    return { paginated, totalPages, total: list.length };
  };

  // CSV Exporters
  const exportShareholdersCSV = () => {
    const data = shareholdersData || [];
    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Shareholder Name', key: 'name' },
      { header: 'Phone', key: 'phone' },
      { header: 'DOB', key: 'dob' },
      { header: 'Address', key: 'address' },
      { header: 'Bank Name', key: 'bankName' },
      { header: 'Account Number', key: 'bankAccountNumber' },
      { header: 'Branch', key: 'bankBranch' },
      { header: 'IFSC Code', key: 'bankIfsc' },
      { header: 'Cheque Issued', key: 'chequeIssued' },
      { header: 'Agreement Issued', key: 'agreementIssued' },
      { header: 'Status', key: 'status' },
      { header: 'Active Fund (₹)', key: 'activeContributionFund', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Overall Profit (₹)', key: 'overallProfit', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Overall Commission (₹)', key: 'overallCommission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Overall Payout (₹)', key: 'overallPayout', formatter: (v) => Number(v || 0).toFixed(2) },
    ];
    exportToCSV('shareholder_summary_report', columns, data);
    toast({ title: 'CSV Exported', description: 'Downloaded Shareholder Summary Report CSV.', type: 'success' });
  };

  const exportTransactionsCSV = () => {
    const data = transactionsData || [];
    const columns: ExportColumn[] = [
      { header: 'Transaction ID', key: 'transactionId' },
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Shareholder Name', key: 'shareholderName' },
      { header: 'Transaction Type', key: 'type' },
      { header: 'Transaction Amount (₹)', key: 'amount', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Transaction Date', key: 'date', formatter: (v) => new Date(v).toLocaleString('en-IN') },
      { header: 'Active Contribution Fund (₹)', key: 'activeContributionFund', formatter: (v) => Number(v || 0).toFixed(2) },
    ];
    exportToCSV('transaction_ledger_report', columns, data);
    toast({ title: 'CSV Exported', description: 'Downloaded Transaction Report CSV.', type: 'success' });
  };

  const exportPayoutsCSV = () => {
    const data = payoutsData || [];
    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Shareholder Name', key: 'shareholderName' },
      { header: 'Payout Cycle', key: 'cycleRange' },
      { header: 'Payout Date', key: 'payoutDate', formatter: (v) => new Date(v).toLocaleString('en-IN') },
      { header: 'Bank Name', key: 'bankName' },
      { header: 'Account Number', key: 'bankAccountNumber' },
      { header: 'IFSC Code', key: 'bankIfsc' },
      { header: 'Profits (₹)', key: 'profitAmount', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L1 Commission (₹)', key: 'l1Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L2 Commission (₹)', key: 'l2Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L3 Commission (₹)', key: 'l3Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L4 Commission (₹)', key: 'l4Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L5 Commission (₹)', key: 'l5Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L6 Commission (₹)', key: 'l6Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L7 Commission (₹)', key: 'l7Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Total Commissions (₹)', key: 'totalCommission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Total Payout (₹)', key: 'totalPayout', formatter: (v) => Number(v || 0).toFixed(2) },
    ];
    exportToCSV('payout_cycle_report', columns, data);
    toast({ title: 'CSV Exported', description: 'Downloaded Payout Report CSV.', type: 'success' });
  };

  // PDF Exporters
  const exportShareholdersPDF = () => {
    const data = shareholdersData || [];
    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Name', key: 'name' },
      { header: 'Phone', key: 'phone' },
      { header: 'Bank Account & IFSC', key: 'bankAccountNumber', formatter: (_, r) => `${r.bankAccountNumber} (${r.bankIfsc})` },
      { header: 'Agreement', key: 'agreementIssued' },
      { header: 'Cheque', key: 'chequeIssued' },
      { header: 'Active Fund (₹)', key: 'activeContributionFund', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
      { header: 'Overall Profit (₹)', key: 'overallProfit', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
      { header: 'Overall Commission (₹)', key: 'overallCommission', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
      { header: 'Overall Payout (₹)', key: 'overallPayout', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    ];
    const totalActive = data.reduce((acc: number, r: any) => acc + Number(r.activeContributionFund || 0), 0);
    const totalPayouts = data.reduce((acc: number, r: any) => acc + Number(r.overallPayout || 0), 0);

    exportToPDF(
      'shareholder_summary_report',
      'Shareholder Operational & Financial Report',
      `Total Shareholders: ${data.length} | Status Filter: ${statusFilter || 'All'}`,
      columns,
      data,
      [
        { label: 'Total Shareholders', value: data.length },
        { label: 'Total Active Capital', value: `₹${totalActive.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { label: 'Total Overall Payouts', value: `₹${totalPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      ]
    );
    toast({ title: 'PDF Exported', description: 'Opened printable Shareholder Summary Report.', type: 'success' });
  };

  const exportTransactionsPDF = () => {
    const data = transactionsData || [];
    const columns: ExportColumn[] = [
      { header: 'Transaction ID', key: 'transactionId' },
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Name', key: 'shareholderName' },
      { header: 'Type', key: 'type' },
      { header: 'Amount (₹)', key: 'amount', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
      { header: 'Date', key: 'date', formatter: (v) => new Date(v).toLocaleString('en-IN') },
      { header: 'Post Active Fund (₹)', key: 'activeContributionFund', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    ];
    const totalAmount = data.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);

    exportToPDF(
      'transaction_ledger_report',
      'Contribution Fund & Withdrawal Transaction Report',
      `Type Filter: ${transactionTypeFilter || 'All Transactions'} | Records: ${data.length}`,
      columns,
      data,
      [
        { label: 'Total Transactions', value: data.length },
        { label: 'Total Transaction Volume', value: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      ]
    );
    toast({ title: 'PDF Exported', description: 'Opened printable Transaction Report.', type: 'success' });
  };

  const exportPayoutsPDF = () => {
    const data = payoutsData || [];
    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Name', key: 'shareholderName' },
      { header: 'Cycle Range', key: 'cycleRange' },
      { header: 'Bank Details', key: 'bankAccountNumber', formatter: (_, r) => `${r.bankName || '-'} / ${r.bankAccountNumber || '-'}` },
      { header: 'Profit (₹)', key: 'profitAmount', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
      { header: 'L1 (₹)', key: 'l1Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L2 (₹)', key: 'l2Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L3 (₹)', key: 'l3Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L4 (₹)', key: 'l4Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L5 (₹)', key: 'l5Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L6 (₹)', key: 'l6Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'L7 (₹)', key: 'l7Commission', formatter: (v) => Number(v || 0).toFixed(2) },
      { header: 'Total Payout (₹)', key: 'totalPayout', formatter: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    ];
    const grandPayout = data.reduce((acc: number, r: any) => acc + Number(r.totalPayout || 0), 0);

    exportToPDF(
      'payout_cycle_report',
      'Payout Cycle Breakdown Report (Profit + L1-L7 Commissions)',
      `Payout Cycle Batch: ${selectedBatchId ? `Batch ${selectedBatchId}` : 'All Cycles'}`,
      columns,
      data,
      [
        { label: 'Total Payout Records', value: data.length },
        { label: 'Grand Total Payout', value: `₹${grandPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      ]
    );
    toast({ title: 'PDF Exported', description: 'Opened printable Payout Report.', type: 'success' });
  };

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
            <FileText className="w-7 h-7 text-brand-primary" /> Reports & Analytics Module
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
            Operational and financial reports for Shareholders, Transactions, and Payout Cycles with CSV & PDF export capabilities.
          </p>
        </div>

        {/* Export Buttons based on active tab */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={
              activeTab === 'shareholders'
                ? exportShareholdersCSV
                : activeTab === 'transactions'
                ? exportTransactionsCSV
                : exportPayoutsCSV
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer select-none"
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button
            onClick={
              activeTab === 'shareholders'
                ? exportShareholdersPDF
                : activeTab === 'transactions'
                ? exportTransactionsPDF
                : exportPayoutsPDF
            }
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer select-none"
          >
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border-subtle gap-2 select-none">
        <button
          onClick={() => { setActiveTab('shareholders'); setPage(1); setSortBy('shareholderId'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'shareholders'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users size={16} /> Report 1 – Shareholder Report
        </button>

        <button
          onClick={() => { setActiveTab('transactions'); setPage(1); setSortBy('date'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowRightLeft size={16} /> Report 2 – Transaction Report
        </button>

        <button
          onClick={() => { setActiveTab('payouts'); setPage(1); setSortBy('shareholderId'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'payouts'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark size={16} /> Report 3 – Payout Report
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-card p-4 rounded-3xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between select-none">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search Shareholder ID, Name, or Reference ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-border-subtle focus:outline-none focus:ring-1 focus:ring-brand-primary text-xs font-semibold dark:bg-secondary/35"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Tab 1 Specific Filters */}
          {activeTab === 'shareholders' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
                <option value="BLOCKED">Blocked</option>
                <option value="AUTO_ARCHIVED">Auto Archived</option>
              </select>

              <select
                value={agreementFilter}
                onChange={(e) => { setAgreementFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
              >
                <option value="">Agreement Status</option>
                <option value="true">Agreement Issued (Yes)</option>
                <option value="false">Agreement Pending (No)</option>
              </select>

              <select
                value={chequeFilter}
                onChange={(e) => { setChequeFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
              >
                <option value="">Cheque Status</option>
                <option value="true">Cheque Issued (Yes)</option>
                <option value="false">Cheque Pending (No)</option>
              </select>
            </>
          )}

          {/* Tab 2 Specific Filters */}
          {activeTab === 'transactions' && (
            <>
              <select
                value={transactionTypeFilter}
                onChange={(e) => { setTransactionTypeFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
              >
                <option value="">All Transaction Types</option>
                <option value="Contribution Fund">Contribution Fund</option>
                <option value="Withdrawal">Withdrawal</option>
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
            </>
          )}

          {/* Tab 3 Specific Filters */}
          {activeTab === 'payouts' && (
            <select
              value={selectedBatchId}
              onChange={(e) => { setSelectedBatchId(e.target.value); setPage(1); }}
              className="px-3.5 py-2.5 rounded-2xl border border-border-subtle text-xs bg-white dark:bg-card font-bold text-muted-foreground focus:outline-none cursor-pointer"
            >
              <option value="">All Payout Cycles</option>
              {batchesList?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  Batch {b.id.substring(0, 8)} ({new Date(b.cycleStart).toLocaleDateString()} - {new Date(b.cycleEnd).toLocaleDateString()}) [{b.status}]
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: SHAREHOLDER REPORT */}
      {activeTab === 'shareholders' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-subtle bg-muted/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Shareholder Summary Data Table
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Total Shareholders: {shareholdersData?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th onClick={() => handleSort('shareholderId')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder ID <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder Name <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Bank Details</th>
                  <th className="px-6 py-4 text-center">Agreement Issued</th>
                  <th className="px-6 py-4 text-center">Cheque Issued</th>
                  <th className="px-6 py-4">Status</th>
                  <th onClick={() => handleSort('activeContributionFund')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Active Contribution Fund <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('overallProfit')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Overall Profit <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('overallCommission')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Overall Commission <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('overallPayout')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Overall Payout <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                {loadingShareholders ? (
                  <tr>
                    <td colSpan={11} className="text-center py-20">
                      <Loader2 size={20} className="animate-spin text-brand-primary mx-auto" />
                    </td>
                  </tr>
                ) : (shareholdersData || []).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-20 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">No Shareholders Found</p>
                    </td>
                  </tr>
                ) : (
                  getPaginatedData(shareholdersData).paginated.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[11px] text-brand-primary">
                        {u.shareholderId}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground">
                        <div>📞 {u.phone}</div>
                        <div className="text-[10px] opacity-75 mt-0.5 truncate max-w-xs" title={u.address}>📍 {u.address}</div>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{u.bankName}</div>
                        <div>Acc: {u.bankAccountNumber}</div>
                        <div className="text-[10px]">IFSC: {u.bankIfsc}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.agreementIssued === 'Yes' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {u.agreementIssued}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.chequeIssued === 'Yes' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {u.chequeIssued}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400">
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                        ₹{Number(u.activeContributionFund).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                        ₹{Number(u.overallProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                        ₹{Number(u.overallCommission).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(u.overallPayout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Shareholder Pagination */}
          {getPaginatedData(shareholdersData).totalPages > 1 && (
            <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle select-none">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                Previous
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">
                Page {page} of {getPaginatedData(shareholdersData).totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(getPaginatedData(shareholdersData).totalPages, p + 1))}
                disabled={page >= getPaginatedData(shareholdersData).totalPages}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTION REPORT */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-subtle bg-muted/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Contribution Fund & Withdrawal Ledger
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Total Transactions: {transactionsData?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th onClick={() => handleSort('transactionId')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Transaction ID <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('shareholderId')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder ID <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('shareholderName')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder Name <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-6 py-4">Transaction Type</th>
                  <th onClick={() => handleSort('amount')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Transaction Amount <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('date')} className="px-6 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Transaction Date <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('activeContributionFund')} className="px-6 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Active Contribution Fund (after transaction) <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <Loader2 size={20} className="animate-spin text-brand-primary mx-auto" />
                    </td>
                  </tr>
                ) : (transactionsData || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-muted-foreground">
                      <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">No Transactions Found</p>
                    </td>
                  </tr>
                ) : (
                  getPaginatedData(transactionsData).paginated.map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[11px] text-brand-primary">
                        {t.transactionId}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[11px] text-gray-900 dark:text-white">
                        {t.shareholderId}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {t.shareholderName}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border tracking-wider ${
                          t.type === 'Withdrawal'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-gray-900 dark:text-white">
                        ₹{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground">
                        {new Date(t.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-brand-primary">
                        ₹{Number(t.activeContributionFund).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Transactions Pagination */}
          {getPaginatedData(transactionsData).totalPages > 1 && (
            <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle select-none">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                Previous
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">
                Page {page} of {getPaginatedData(transactionsData).totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(getPaginatedData(transactionsData).totalPages, p + 1))}
                disabled={page >= getPaginatedData(transactionsData).totalPages}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYOUT REPORT */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-subtle bg-muted/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Payout Cycle Earnings Breakdown (Profit + Level 1 to Level 7 Commissions)
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Total Payout Records: {payoutsData?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th onClick={() => handleSort('shareholderId')} className="px-4 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder ID <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('shareholderName')} className="px-4 py-4 cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center gap-1">Shareholder Name <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-4">Payout Date / Cycle</th>
                  <th className="px-4 py-4">Bank Details</th>
                  <th onClick={() => handleSort('profitAmount')} className="px-4 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Profits <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-3 py-4 text-right font-mono">L1</th>
                  <th className="px-3 py-4 text-right font-mono">L2</th>
                  <th className="px-3 py-4 text-right font-mono">L3</th>
                  <th className="px-3 py-4 text-right font-mono">L4</th>
                  <th className="px-3 py-4 text-right font-mono">L5</th>
                  <th className="px-3 py-4 text-right font-mono">L6</th>
                  <th className="px-3 py-4 text-right font-mono">L7</th>
                  <th onClick={() => handleSort('totalPayout')} className="px-4 py-4 text-right cursor-pointer hover:text-foreground select-none">
                    <div className="flex items-center justify-end gap-1">Total Payout <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                {loadingPayouts ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20">
                      <Loader2 size={20} className="animate-spin text-brand-primary mx-auto" />
                    </td>
                  </tr>
                ) : (payoutsData || []).length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20 text-muted-foreground">
                      <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">No Payout Records Found</p>
                    </td>
                  </tr>
                ) : (
                  getPaginatedData(payoutsData).paginated.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-[11px] text-brand-primary">
                        {p.shareholderId}
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">
                        {p.shareholderName}
                      </td>
                      <td className="px-4 py-4 text-[11px] text-muted-foreground">
                        <div>{p.cycleRange}</div>
                        <div className="text-[10px] opacity-75">{new Date(p.payoutDate).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="px-4 py-4 text-[10px] text-muted-foreground">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{p.bankName}</div>
                        <div>Acc: {p.bankAccountNumber}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        ₹{Number(p.profitAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l1Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l2Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l3Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l4Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l5Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l6Commission).toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-mono text-[11px] text-muted-foreground">₹{Number(p.l7Commission).toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(p.totalPayout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payouts Pagination */}
          {getPaginatedData(payoutsData).totalPages > 1 && (
            <div className="flex justify-between items-center bg-muted/10 p-4 border-t border-border-subtle select-none">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                Previous
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">
                Page {page} of {getPaginatedData(payoutsData).totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(getPaginatedData(payoutsData).totalPages, p + 1))}
                disabled={page >= getPaginatedData(payoutsData).totalPages}
                className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer"
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
