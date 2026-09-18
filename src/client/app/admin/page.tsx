"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { motion } from 'framer-motion';
import { 
  BarChart3, Users, DollarSign, Wallet, FileDown, Database, 
  Loader2, Search, Filter, ArrowUp, ArrowDown, X, FileText, 
  TrendingUp, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { exportToPDF, exportToCSV, ExportColumn } from '@/lib/exportUtils';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'shareholders' | 'investments' | 'profits' | 'commissions'>('shareholders');

  // Filter States
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [month, setMonth] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [status, setStatus] = useState('');
  const [agreementIssued, setAgreementIssued] = useState(false);
  const [chequeIssued, setChequeIssued] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const resetFilters = () => {
    setSearch('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setMonth('');
    setMinAmount('');
    setMaxAmount('');
    setStatus('');
    setAgreementIssued(false);
    setChequeIssued(false);
  };

  // Dashboard Summary Metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['adminDashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/admin/reports/dashboard');
      return res.data;
    }
  });

  // Active Tab Data Queries
  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ['adminReport', activeTab, search, sortBy, sortOrder, month, minAmount, maxAmount, status, agreementIssued, chequeIssued],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      if (month) params.month = month;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      if (status) params.status = status;
      if (agreementIssued) params.agreementIssued = 'true';
      if (chequeIssued) params.chequeIssued = 'true';

      const res = await api.get(`/admin/reports/${activeTab}`, { params });
      return res.data;
    }
  });

  const handleExport = async (type: string) => {
    try {
      const params: any = { type };
      if (search) params.search = search;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      if (month) params.month = month;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      if (status) params.status = status;
      if (agreementIssued) params.agreementIssued = 'true';
      if (chequeIssued) params.chequeIssued = 'true';

      const res = await api.get('/admin/reports/export', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "CSV Report Generated", description: `Successfully exported the latest ${type} ledger database.`, type: "success" });
    } catch (err) {
      toast({ title: "Export Failed", description: "Error generating or downloading the CSV ledger.", type: "error" });
    }
  };

  const handleExportPDF = (type: string) => {
    if (!reportData || reportData.length === 0) {
      toast({ title: "No Data", description: `No ${type} records to export to PDF.`, type: "warning" });
      return;
    }

    let columns: ExportColumn[] = [];
    if (type === 'shareholders') {
      columns = [
        { header: 'Shareholder ID', key: 'shareholderId' },
        { header: 'Name', key: 'name' },
        { header: 'Role', key: 'role' },
        { header: 'Status', key: 'status' },
        { header: 'Joined Date', key: 'createdAt', formatter: (v) => new Date(v).toLocaleDateString() },
      ];
    } else if (type === 'investments') {
      columns = [
        { header: 'Shareholder ID', key: 'shareholderId' },
        { header: 'Name', key: 'name' },
        { header: 'Amount (₹)', key: 'amount', formatter: (v) => Number(v || 0).toFixed(2) },
        { header: 'Mode', key: 'mode' },
        { header: 'Status', key: 'status' },
        { header: 'Date', key: 'date', formatter: (v) => new Date(v).toLocaleDateString() },
      ];
    } else if (type === 'profits') {
      columns = [
        { header: 'Shareholder ID', key: 'shareholderId' },
        { header: 'Name', key: 'name' },
        { header: 'Monthly Profit (₹)', key: 'amount', formatter: (v) => Number(v || 0).toFixed(2) },
        { header: 'Status', key: 'status' },
        { header: 'Date', key: 'createdAt', formatter: (v) => new Date(v).toLocaleDateString() },
      ];
    } else if (type === 'commissions') {
      columns = [
        { header: 'Recipient ID', key: 'recipientShareholderId' },
        { header: 'Recipient Name', key: 'recipientName' },
        { header: 'Source ID', key: 'sourceShareholderId' },
        { header: 'Level', key: 'level' },
        { header: 'Commission (₹)', key: 'amount', formatter: (v) => Number(v || 0).toFixed(2) },
        { header: 'Status', key: 'status' },
      ];
    }

    exportToPDF(
      `${type}_ledger_report`,
      `${type.toUpperCase()} Master Report`,
      `Applied Filters - Search: ${search || 'None'} | Month: ${month || 'All'}`,
      columns,
      reportData,
      [{ label: 'Total Records', value: reportData.length }]
    );

    toast({ title: "PDF Report Generated", description: `Opened printable ${type} PDF report.`, type: "success" });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp size={13} className="inline ml-1 text-brand-500" /> : <ArrowDown size={13} className="inline ml-1 text-brand-500" />;
  };

  if (loadingMetrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm font-semibold">Retrieving system diagnostics...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Enterprise Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time business volumes, active capital funds, and ledger audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-brand">
            <ShieldCheck className="w-3.5 h-3.5" />
            Live Sync Verified
          </span>
        </div>
      </div>

      {/* Sleek NextAdmin KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Active Shareholders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Active</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/15 text-success-600 dark:text-success-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{metrics?.activeShareholders || 0}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Active Shareholders</p>
          </div>
        </div>

        {/* 2. Active Capital */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Active Fund</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-brand-600 dark:text-brand-400 tracking-tight">₹{Number(metrics?.activeCapital || 0).toLocaleString()}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Active Capital Volume</p>
          </div>
        </div>

        {/* 3. Gross Payouts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Disbursed</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 dark:bg-warning-500/15 text-warning-600 dark:text-warning-400">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">₹{Number(metrics?.grossPayouts || 0).toLocaleString()}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Gross Profit Payouts</p>
          </div>
        </div>

        {/* 4. Total Accounts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{metrics?.totalShareholders || 0}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Total Shareholder Base</p>
          </div>
        </div>

        {/* 5. Overall Capital */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Lifetime</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">₹{Number(metrics?.overallCapital || 0).toLocaleString()}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Lifetime Placements</p>
          </div>
        </div>

        {/* 6. Released Batch Funds */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Released</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/15 text-success-600 dark:text-success-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-success-600 dark:text-success-400 tracking-tight">₹{Number(metrics?.releasedFunds || 0).toLocaleString()}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Batch Funds Released</p>
          </div>
        </div>
      </div>

      {/* Reports & Ledgers Modern Card Container */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 overflow-hidden">
        {/* Navigation Toolbar & Actions */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-800/70 p-1 rounded-xl border border-gray-200/80 dark:border-gray-700/80 overflow-x-auto max-w-full">
            {(['shareholders', 'investments', 'profits', 'commissions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  resetFilters();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-theme-xs ${
                isFiltersOpen 
                  ? 'bg-brand-500 text-white border-brand-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
              }`}
            >
              <Filter size={14} /> 
              <span>Filters</span>
            </button>
            <button
              onClick={() => handleExport(activeTab)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-theme-xs cursor-pointer"
            >
              <FileDown size={14} /> 
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExportPDF(activeTab)}
              className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-theme-xs cursor-pointer dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <FileText size={14} /> 
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        {isFiltersOpen && (
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40 flex flex-wrap gap-4 items-end text-xs">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Shareholder ID, Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs"
                />
              </div>
            </div>
            
            <div className="w-[140px]">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs"
              />
            </div>

            <div className="flex gap-2 w-[220px]">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Min (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Max (₹)</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs"
                />
              </div>
            </div>

            {(activeTab === 'shareholders' || activeTab === 'investments') && (
              <div className="w-[130px]">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                  {activeTab === 'shareholders' && <option value="AUTO_ARCHIVED">Archived</option>}
                </select>
              </div>
            )}

            {(activeTab === 'shareholders' || activeTab === 'investments') && (
              <div className="flex flex-col gap-1.5 justify-center py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={agreementIssued} onChange={(e) => setAgreementIssued(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  Agreement Issued
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={chequeIssued} onChange={(e) => setChequeIssued(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  Cheque Issued
                </label>
              </div>
            )}

            <button
              onClick={resetFilters}
              className="p-2 border border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-all cursor-pointer shadow-theme-xs"
              title="Clear Filters"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Tab Data Table */}
        <div>
          {loadingReport ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <p className="text-xs font-semibold">Retrieving ledger database...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Database className="w-8 h-8 mx-auto mb-2.5 opacity-30" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No Records Found</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Try clearing or broadening your search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[380px]">
              {activeTab === 'shareholders' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('name')}>
                        Shareholder <SortIcon field="name" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('role')}>
                        Role <SortIcon field="role" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('status')}>
                        Status <SortIcon field="status" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('activeInvestmentsCount')}>
                        Active Placements <SortIcon field="activeInvestmentsCount" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('activeInvestmentsVolume')}>
                        Total Contribution <SortIcon field="activeInvestmentsVolume" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('createdAt')}>
                        Joined Date <SortIcon field="createdAt" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{r.name || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.shareholderId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={
                            r.role === 'SUPER_ADMIN' ? 'badge-brand' :
                            r.role === 'ADMIN' ? 'badge-warning' : 'badge-brand'
                          }>
                            {r.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={
                            r.status === 'ACTIVE' || r.status === 'RESTORED' ? 'badge-success' : 'badge-warning'
                          }>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">{r.activeInvestmentsCount}</td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">₹{r.activeInvestmentsVolume?.toLocaleString() || '0'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'investments' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('id')}>
                        Investment ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('userShareholderId')}>
                        Shareholder <SortIcon field="userShareholderId" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('dailyProfitRate')}>
                        Daily Rate <SortIcon field="dailyProfitRate" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('status')}>
                        Status <SortIcon field="status" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('startDate')}>
                        Start Date <SortIcon field="startDate" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{r.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{r.userName || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.userShareholderId}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">₹{r.amount?.toLocaleString() || '0'}</td>
                        <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{(r.dailyProfitRate * 100).toFixed(2)}%</td>
                        <td className="px-6 py-4">
                          <span className={r.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(r.startDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'profits' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('id')}>
                        Ledger ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('userShareholderId')}>
                        Shareholder <SortIcon field="userShareholderId" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('investmentAmount')}>
                        Investment <SortIcon field="investmentAmount" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('cycleStart')}>
                        Cycle Period <SortIcon field="cycleStart" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('eligibleDays')}>
                        Eligible Days <SortIcon field="eligibleDays" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{r.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{r.userName || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.userShareholderId}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">₹{r.investmentAmount?.toLocaleString() || '0'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(r.cycleStart).toLocaleDateString()} - {new Date(r.cycleEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-semibold">{r.eligibleDays} days</td>
                        <td className="px-6 py-4 font-bold text-success-600 dark:text-success-400">+₹{r.amount?.toLocaleString() || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'commissions' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('id')}>
                        Commission ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('recipientShareholderId')}>
                        Recipient <SortIcon field="recipientShareholderId" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('sourceShareholderId')}>
                        From Shareholder <SortIcon field="sourceShareholderId" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('level')}>
                        Level <SortIcon field="level" />
                      </th>
                      <th className="px-6 py-3.5 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{r.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{r.recipientName || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.recipientShareholderId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{r.sourceName || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.sourceShareholderId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge-brand">
                            Level {r.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">+₹{r.amount?.toLocaleString() || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
