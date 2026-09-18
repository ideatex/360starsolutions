"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { FileText, Calendar, Clock, Database, Loader2, ArrowRight, Download, Filter, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/exportUtils';

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
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
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

  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);
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
        title: "CSV Exported",
        description: `Exported ${PERIOD_LABELS[period]} audit log CSV report successfully.`,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to generate audit log CSV report.",
        type: "error",
      });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const res = await api.get('/admin/audit-logs/export', {
        params: period !== 'all' ? { period } : {},
      });

      const { logs } = res.data;
      const columns: ExportColumn[] = [
        { header: 'ID', key: 'id' },
        { 
          header: 'Timestamp', 
          key: 'createdAt',
          formatter: (val) => new Date(val).toLocaleString('en-IN')
        },
        { header: 'Action', key: 'action' },
        { header: 'Entity Type', key: 'entityType' },
        { header: 'Shareholder ID', key: 'shareholderId', formatter: (val) => val || 'System' },
        { header: 'Old Value', key: 'oldValue', formatter: (val) => val || '-' },
        { header: 'New Value', key: 'newValue', formatter: (val) => val || '-' },
        { header: 'IP Address', key: 'ipAddress', formatter: (val) => val || '-' },
      ];

      exportToPDF(
        `audit_report_${period}`,
        'System Audit Logs Report',
        `Time Period: ${PERIOD_LABELS[period]}`,
        columns,
        logs || []
      );

      toast({
        title: "PDF Exported",
        description: `Generated ${PERIOD_LABELS[period]} audit log PDF report.`,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to generate audit log PDF report.",
        type: "error",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
    >
      {/* Title & Actions Bar */}
      <div className="app-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              Enterprise Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-brand-600 dark:text-brand-400" /> Audit Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Immutable ledger of enterprise settings, payments, and account actions.</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={isExportingCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-theme-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExportingCSV ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Download CSV
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-theme-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Period Filter Selector */}
      <div className="app-card flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Filter className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Filter Timeframe:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {(['all', 'this_week', 'last_week', 'this_month', 'last_month'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === p
                  ? 'bg-brand-600 text-white shadow-theme-xs'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Grids */}
      <div className="app-card p-0 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity Type</th>
                <th className="px-5 py-3.5">Entity ID</th>
                <th className="px-5 py-3.5">Changes (Old Value → New Value)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300 font-medium">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-20"><Loader2 size={20} className="animate-spin text-brand-600 mx-auto" /></td></tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-600" />
                    <p className="text-xs font-semibold">No Logs Found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">No audit log registers found for {PERIOD_LABELS[period]}.</p>
                  </td>
                </tr>
              ) : (
                data?.data?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white uppercase tracking-wide text-[10px]">
                      <span className="badge-brand">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 font-semibold">{log.entityType}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]" title={log.entityId}>
                      {log.entityId}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {log.oldValue && (
                          <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                            {log.oldValue}
                          </span>
                        )}
                        {log.oldValue && log.newValue && <ArrowRight size={12} className="text-gray-400" />}
                        {log.newValue && (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50 font-semibold">
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
      </div>

      {/* Pagination Footer */}
      {!isLoading && data?.lastPage > 1 && (
        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Page {page} of {data.lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(data.lastPage, p + 1))}
            disabled={page >= data.lastPage}
            className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
