"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { motion } from 'framer-motion';
import { BarChart3, Users, DollarSign, Wallet, FileDown, Database, Loader2, Search, Filter, ArrowUp, ArrowDown, X } from 'lucide-react';

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
    return sortOrder === 'asc' ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  if (loadingMetrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-sm font-semibold">Retrieving system diagnostics...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Title */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Enterprise Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">High-level financial diagnostics and audit reporting logs</p>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Shareholders</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{metrics?.activeShareholders || 0}</p>
          </div>
          <div className="p-3 bg-brand-success/10 rounded-xl text-brand-success">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Shareholders</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{metrics?.totalShareholders || 0}</p>
          </div>
          <div className="p-3 bg-brand-info/10 rounded-xl text-brand-info">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Capital</h3>
            <p className="text-3xl font-bold text-foreground mt-1">${metrics?.activeCapital?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Capital</h3>
            <p className="text-3xl font-bold text-foreground mt-1">${metrics?.overallCapital?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Database size={24} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Payouts</h3>
            <p className="text-3xl font-bold text-foreground mt-1">${metrics?.grossPayouts?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 bg-brand-warning/10 rounded-xl text-brand-warning">
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:shadow-elevated transition-shadow">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Released Funds</h3>
            <p className="text-3xl font-bold text-foreground mt-1">${metrics?.releasedFunds?.toLocaleString() || '0'}</p>
          </div>
          <div className="p-3 bg-brand-accent/10 rounded-xl text-brand-accent">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Tab Buttons & Actions */}
        <div className="p-4 border-b border-border bg-secondary/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
          <div className="flex bg-secondary p-1 rounded-xl border border-border w-full sm:w-auto">
            {(['shareholders', 'investments', 'profits', 'commissions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  resetFilters();
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`border border-border font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm ${isFiltersOpen ? 'bg-brand-primary text-white border-brand-primary' : 'bg-card hover:bg-secondary text-foreground'}`}
            >
              <Filter size={16} /> Filters
            </button>
            <button
              onClick={() => handleExport(activeTab)}
              className="border border-border bg-card hover:bg-secondary font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm text-foreground"
            >
              <FileDown size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        {isFiltersOpen && (
          <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-end text-sm">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Shareholder ID, Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
            
            <div className="w-[140px]">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="flex gap-2 w-[240px]">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Min Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Max Amount</label>
                <input
                  type="number"
                  placeholder="âˆž"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            {(activeTab === 'shareholders' || activeTab === 'investments') && (
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                  {activeTab === 'shareholders' && <option value="AUTO_ARCHIVED">Archived</option>}
                </select>
              </div>
            )}

            {(activeTab === 'shareholders' || activeTab === 'investments') && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={agreementIssued} onChange={(e) => setAgreementIssued(e.target.checked)} className="rounded border-border text-brand-primary focus:ring-brand-primary" />
                  Agreement Issued
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input type="checkbox" checked={chequeIssued} onChange={(e) => setChequeIssued(e.target.checked)} className="rounded border-border text-brand-primary focus:ring-brand-primary" />
                  Cheque Issued
                </label>
              </div>
            )}

            <button
              onClick={resetFilters}
              className="p-2 border border-border bg-card hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"
              title="Clear Filters"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Tab Table Content */}
        <div className="p-1">
          {loadingReport ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <p className="text-sm font-medium">Retrieving report ledger...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No Records Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[400px]">
              {activeTab === 'shareholders' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('name')}>
                        Shareholder <SortIcon field="name" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('role')}>
                        Role <SortIcon field="role" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('status')}>
                        Status <SortIcon field="status" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('activeInvestmentsCount')}>
                        Active Placements <SortIcon field="activeInvestmentsCount" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('activeInvestmentsVolume')}>
                        Total Contribution <SortIcon field="activeInvestmentsVolume" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('createdAt')}>
                        Joined Date <SortIcon field="createdAt" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{r.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">{r.shareholderId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            r.role === 'SUPER_ADMIN' 
                              ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' 
                              : r.role === 'ADMIN'
                              ? 'bg-brand-info/10 text-brand-info border-brand-info/20'
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}>
                            {r.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase border ${
                            r.status === 'ACTIVE' || r.status === 'RESTORED'
                              ? 'bg-brand-success/10 text-brand-success border-brand-success/20' 
                              : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{r.activeInvestmentsCount}</td>
                        <td className="px-6 py-4 font-semibold">${r.activeInvestmentsVolume.toFixed(2)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'investments' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('id')}>
                        Investment ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('userShareholderId')}>
                        Shareholder <SortIcon field="userShareholderId" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('dailyProfitRate')}>
                        Daily Rate <SortIcon field="dailyProfitRate" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('status')}>
                        Status <SortIcon field="status" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('startDate')}>
                        Start Date <SortIcon field="startDate" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{r.id}</td>
                        <td className="px-6 py-4">{r.userShareholderId}</td>
                        <td className="px-6 py-4 font-semibold">${r.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 font-semibold text-brand-primary">{(r.dailyProfitRate * 100).toFixed(2)}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase border ${
                            r.status === 'ACTIVE' 
                              ? 'bg-brand-success/10 text-brand-success border-brand-success/20' 
                              : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(r.startDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'profits' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('id')}>
                        Ledger ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('userShareholderId')}>
                        Shareholder <SortIcon field="userShareholderId" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('cycleStart')}>
                        Cycle Period <SortIcon field="cycleStart" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('eligibleDays')}>
                        Eligible Days <SortIcon field="eligibleDays" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{r.id}</td>
                        <td className="px-6 py-4">{r.userShareholderId}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(r.cycleStart).toLocaleDateString()} - {new Date(r.cycleEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">{r.eligibleDays} days</td>
                        <td className="px-6 py-4 font-semibold text-brand-primary">+${r.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'commissions' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('id')}>
                        Commission ID <SortIcon field="id" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('recipientShareholderId')}>
                        Recipient <SortIcon field="recipientShareholderId" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('sourceShareholderId')}>
                        From Shareholder <SortIcon field="sourceShareholderId" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('level')}>
                        Level <SortIcon field="level" />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-secondary/80 select-none" onClick={() => handleSort('amount')}>
                        Amount <SortIcon field="amount" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                    {reportData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{r.id}</td>
                        <td className="px-6 py-4">{r.recipientShareholderId}</td>
                        <td className="px-6 py-4">{r.sourceShareholderId}</td>
                        <td className="px-6 py-4">
                          <span className="bg-brand-info/10 text-brand-info border border-brand-info/20 text-xs font-semibold px-2.5 py-1 rounded-md uppercase">
                            Level {r.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-brand-primary">+${r.amount.toFixed(2)}</td>
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
