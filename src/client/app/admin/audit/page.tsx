"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { FileText, Calendar, Clock, Database, Loader2, ArrowRight, Download, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

type PeriodFilter = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'All Time',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLogs', page, period],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs', {
        params: { 
          page, 
          limit: 15,
          ...(period !== 'all' ? { period } : {}),
        },
      });
      return res.data;
    }
  });

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    setPage(1);
  };

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/admin/audit-logs/export', {
        params: period !== 'all' ? { period } : {},
      });
      
      const { csv } = res.data;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_report_${period}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Exported",
        description: `Exported ${PERIOD_LABELS[period]} audit log report successfully.`,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to generate audit log report.",
        type: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Title & Actions Bar */}
      <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-brand-primary" /> Audit Logs
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Immutable ledger of enterprise settings, payments, and account actions.</p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 text-xs font-bold rounded-2xl shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Report ({PERIOD_LABELS[period]})
        </button>
      </div>

      {/* Period Filter Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-card p-4 rounded-3xl border border-border-subtle shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Filter className="w-4 h-4 text-brand-primary" />
          <span>Filter Timeframe:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {(['all', 'this_week', 'last_week', 'this_month', 'last_month'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                period === p
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-muted/40 hover:bg-muted dark:bg-secondary/40 dark:hover:bg-secondary border-border-subtle text-muted-foreground hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Grids */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Entity Type</th>
              <th className="px-6 py-4">Entity ID</th>
              <th className="px-6 py-4">Changes (Old Value → New Value)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-20"><Loader2 size={20} className="animate-spin text-brand-primary mx-auto" /></td></tr>
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-20 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-primary" />
                  <p className="text-xs font-bold">No Logs Found</p>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5">No audit log registers found for {PERIOD_LABELS[period]}.</p>
                </td>
              </tr>
            ) : (
              data?.data?.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-gray-950 dark:text-white uppercase tracking-wide text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-muted dark:bg-secondary border border-border-subtle">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-semibold">{log.entityType}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]" title={log.entityId}>
                    {log.entityId}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {log.oldValue && (
                        <span className="line-through text-red-500 dark:text-red-400 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">
                          {log.oldValue}
                        </span>
                      )}
                      {log.oldValue && log.newValue && <ArrowRight size={12} className="text-muted-foreground/60" />}
                      {log.newValue && (
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-bold">
                          {log.newValue}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && data?.lastPage > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-border-subtle mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Page {page} of {data.lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(data.lastPage, p + 1))}
            disabled={page >= data.lastPage}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
