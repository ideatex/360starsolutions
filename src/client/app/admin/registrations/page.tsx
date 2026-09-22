"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Users, CheckCircle2, XCircle, Search, Filter, Eye, EyeOff, AlertCircle, 
  Clock, FileText, ArrowRight, ShieldCheck, RefreshCw, Layers, Send,
  X, ExternalLink, Calendar, Phone, User as UserIcon, Key, Sparkles, Download, Maximize2
} from 'lucide-react';

export default function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_ADMIN_REVIEW');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<any | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveItem, setApproveItem] = useState<any | null>(null);
  const [approvePassword, setApprovePassword] = useState('');
  const [showApprovePassword, setShowApprovePassword] = useState(false);
  const [approvePasswordError, setApprovePasswordError] = useState<string | null>(null);
  const [approveWithholdingPct, setApproveWithholdingPct] = useState('20');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Helper to resolve full authenticated URL for payment receipts
  const getProofUrl = (url?: string | null) => {
    if (!url) return '';
    const token = useAuthStore.getState().token;
    let fullUrl = url;
    if (url.startsWith('/')) {
      const backendBase = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3002'
        : '';
      fullUrl = `${backendBase}${url}`;
    }
    if (token) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
    return fullUrl;
  };

  const generateRandomPassword = () => {
    const specials = ['@', '#', '$', '!'];
    const special = specials[Math.floor(Math.random() * specials.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pass = `Star${special}${randomNum}`;
    setApprovePassword(pass);
    setApprovePasswordError(null);
  };

  const handleOpenApproveModal = (item: any) => {
    setApproveItem(item);
    setApproveWithholdingPct(item.withholdingPercentage ? String(item.withholdingPercentage) : '20');
    const specials = ['@', '#', '$', '!'];
    const special = specials[Math.floor(Math.random() * specials.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setApprovePassword(`Star${special}${randomNum}`);
    setShowApprovePassword(false);
    setApprovePasswordError(null);
    setShowApproveModal(true);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminRegistrations', statusFilter, search, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/registrations', { params });
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, password, withholdingPercentage }: { id: string; password: string; withholdingPercentage?: number }) => {
      const res = await api.post(`/registrations/${id}/approve`, { password, withholdingPercentage });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(`Approved! User ID created: ${data.shareholderId}. SMS dispatch: ${data.smsStatus}.`);
      setActionError(null);
      setSelectedRequest(null);
      setDetailModalItem(null);
      setShowApproveModal(false);
      setApproveItem(null);
      setApprovePassword('');
      queryClient.invalidateQueries({ queryKey: ['adminRegistrations'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Approval failed. Please review the error.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/registrations/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess('Registration rejected successfully.');
      setActionError(null);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setDetailModalItem(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['adminRegistrations'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Rejection failed.');
    },
  });

  const retrySmsMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await api.post(`/admin/sms/${logId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess('SMS retry triggered successfully.');
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['adminRegistrations'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'SMS retry failed.');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Registration Review Queue</h1>
            <span className="badge-brand">
              Product 360
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Verify payment proofs, approve new Contributor accounts, and monitor SMS credential delivery.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-theme-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 text-success-600 dark:text-success-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-error-600 dark:text-error-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Toolbar & Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Applicant Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500 shadow-theme-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { label: 'Pending Review', value: 'PENDING_ADMIN_REVIEW' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'All Requests', value: 'ALL' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-brand-500 text-white border-brand-500 shadow-theme-xs'
                  : 'bg-white text-gray-500 hover:text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Applicant</th>
                <th className="px-5 py-3.5">Account Type</th>
                <th className="px-5 py-3.5">Contribution</th>
                <th className="px-5 py-3.5">Sponsor / Referrer</th>
                <th className="px-5 py-3.5">Payment Proof</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">SMS Delivery</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 font-semibold">
                    Loading registration requests...
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 font-semibold">
                    No registration requests found in this queue.
                  </td>
                </tr>
              ) : (
                data?.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900 dark:text-white cursor-pointer hover:text-brand-600 dark:hover:text-brand-400" onClick={() => setDetailModalItem(item)}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={item.accountType === 'ZERO_CONTRIBUTION' ? 'badge-warning' : 'badge-brand'}>
                        {item.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contrib' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                      {item.contributionAmount 
                        ? `₹${Number(item.contributionAmount).toLocaleString('en-IN')}`
                        : '—'
                      }
                    </td>
                    <td className="px-5 py-4">
                      {item.referrer ? (
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{item.referrer.name}</span>
                          <span className="text-[11px] text-gray-400 block font-mono">({item.referrer.shareholderId})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.paymentProofUrl ? (
                        <button 
                          onClick={() => setProofPreviewUrl(item.paymentProofUrl)} 
                          className="text-brand-600 dark:text-brand-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> 
                          <span>View Receipt</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">No proof required</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={
                        item.status === 'APPROVED' ? 'badge-success' :
                        item.status === 'REJECTED' ? 'badge-error' : 'badge-warning'
                      }>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.status === 'APPROVED' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={
                            item.smsStatus === 'SENT' || item.smsStatus === 'DELIVERED' ? 'badge-success' :
                            item.smsStatus === 'FAILED' ? 'badge-error' : 'badge-brand'
                          }>
                            {item.smsStatus || 'SENT'}
                          </span>
                          {item.smsStatus === 'FAILED' && item.smsLogId && (
                            <button
                              onClick={() => retrySmsMutation.mutate(item.smsLogId)}
                              disabled={retrySmsMutation.isPending}
                              title="Retry SMS dispatch"
                              className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailModalItem(item)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          title="View Full Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(item.status === 'PENDING_REVIEW' || item.status === 'PENDING_ADMIN_REVIEW') && (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(item)}
                              disabled={approveMutation.isPending}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setSelectedRequest(item); setShowRejectModal(true); }}
                              className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded-lg font-bold text-xs transition-all cursor-pointer border border-red-600/20"
                            >
                              Reject
                            </button>
                          </>
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

      {/* Details Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-primary" /> Application Dossier & Referrer Submission
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Request ID: {detailModalItem.id}</p>
              </div>
              <button 
                onClick={() => setDetailModalItem(null)} 
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs custom-scrollbar">
              {/* Summary Status Header */}
              <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 flex flex-wrap items-center justify-between gap-3 select-none">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Account Plan</span>
                  <span className="font-extrabold text-foreground text-sm">
                    {detailModalItem.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution Account' : 'Standard Contribution Account'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Contribution Capital</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {detailModalItem.contributionAmount ? `₹${Number(detailModalItem.contributionAmount).toLocaleString('en-IN')}` : '₹0 (Zero Contrib)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Queue Status</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {detailModalItem.status}
                  </span>
                </div>
              </div>

              {/* 1. Personal & Contact Information */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <UserIcon size={14} className="text-brand-primary" /> 1. Personal & Identity Coordinates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Full Applicant Name</span>
                    <strong className="text-foreground text-sm">{detailModalItem.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Mobile Phone Number</span>
                    <strong className="font-mono text-foreground text-sm">{detailModalItem.phone}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">PAN Card Number</span>
                    <strong className="font-mono font-bold text-brand-primary text-xs">{detailModalItem.pan || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Date of Birth</span>
                    <strong className="text-foreground text-xs">{detailModalItem.dob ? new Date(detailModalItem.dob).toLocaleDateString('en-IN') : '-'}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Structured Residential Address */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <Layers size={14} className="text-brand-primary" /> 2. Address & Postal Details
                </h4>
                <div className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Building / Flat / Street</span>
                      <strong className="text-foreground">{detailModalItem.addressBuilding || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Area / Locality</span>
                      <strong className="text-foreground">{detailModalItem.addressArea || '-'}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">City / Town</span>
                      <strong className="text-foreground">{detailModalItem.addressCity || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">District</span>
                      <strong className="text-foreground">{detailModalItem.addressDistrict || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">State</span>
                      <strong className="text-foreground">{detailModalItem.addressState || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pincode</span>
                      <strong className="font-mono font-bold text-foreground">{detailModalItem.addressPincode || '-'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Banking Coordinates */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <FileText size={14} className="text-brand-primary" /> 3. Banking & Settlement Coordinates
                </h4>
                <div className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Bank Account Holder Name</span>
                      <strong className="text-foreground">{detailModalItem.bankAccountName || detailModalItem.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Bank Account Number</span>
                      <strong className="font-mono font-bold text-foreground">{detailModalItem.bankAccountNumber || '-'}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Bank Name</span>
                      <strong className="text-foreground">{detailModalItem.bankName || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Branch</span>
                      <strong className="text-foreground">{detailModalItem.bankBranch || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">IFSC Code</span>
                      <strong className="font-mono font-bold text-brand-primary">{detailModalItem.bankIfsc || '-'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Sponsor, Investment Date & Submission Info */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <Clock size={14} className="text-brand-primary" /> 4. Referral Sponsor & Timeline
                </h4>
                <div className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Sponsor / Referrer:</span>
                    <strong className="text-foreground">
                      {detailModalItem.referrer 
                        ? `${detailModalItem.referrer.name} (ID: ${detailModalItem.referrer.shareholderId}${detailModalItem.referrer.phone ? `, Phone: ${detailModalItem.referrer.phone}` : ''})` 
                        : 'Direct / Root (360SS001)'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Placement Date:</span>
                    <span className="font-mono text-foreground">{detailModalItem.contributionDate ? new Date(detailModalItem.contributionDate).toLocaleDateString('en-IN') : new Date(detailModalItem.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Submission Timestamp:</span>
                    <span className="text-foreground">{new Date(detailModalItem.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  {detailModalItem.reviewedBy && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Review Completed By:</span>
                      <strong className="text-foreground">{detailModalItem.reviewedBy.name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Payment Receipt Preview */}
              {detailModalItem.paymentProofUrl && (
                <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-brand-primary" />
                    <div>
                      <span className="font-bold text-xs text-foreground block">Deposit Receipt Proof Attached</span>
                      <span className="text-[10px] text-muted-foreground">{detailModalItem.paymentProofFileName || 'Payment Voucher / Cheque Photo'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setProofPreviewUrl(detailModalItem.paymentProofUrl)}
                    className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-theme-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview Document
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border shrink-0">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer transition-all"
              >
                Close Dossier
              </button>
              {(detailModalItem.status === 'PENDING_REVIEW' || detailModalItem.status === 'PENDING_ADMIN_REVIEW') && (
                <>
                  <button
                    onClick={() => { setSelectedRequest(detailModalItem); setShowRejectModal(true); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600/10 hover:bg-red-600/20 text-red-600 cursor-pointer border border-red-600/20 transition-all"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleOpenApproveModal(detailModalItem)}
                    disabled={approveMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                  >
                    Approve & Setup Shareholder
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal with In-Dialog Validation & Error Display */}
      {showApproveModal && approveItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Approve & Activate Account
              </h3>
              <button 
                onClick={() => { setShowApproveModal(false); setApproveItem(null); }} 
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Dialog Error Alert Banner */}
            {approveMutation.isError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-red-700 dark:text-red-300">Approval Conflict / Error:</p>
                  <p className="leading-relaxed font-medium">
                    {(approveMutation.error as any)?.response?.data?.message || 'Approval failed. Please check inputs or duplicate registration parameters.'}
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/20 rounded-xl border border-border/60 text-xs space-y-1">
              <div><strong className="text-muted-foreground">Applicant:</strong> <span className="font-bold text-foreground">{approveItem.name}</span></div>
              <div><strong className="text-muted-foreground">Phone:</strong> <span className="font-mono text-foreground">{approveItem.phone}</span></div>
              <div><strong className="text-muted-foreground">PAN:</strong> <span className="font-mono font-bold text-brand-primary">{approveItem.pan || 'Not Provided'}</span></div>
              <div><strong className="text-muted-foreground">Account Type:</strong> <span className="font-bold text-foreground">{approveItem.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution' : 'Standard Contribution'}</span></div>
            </div>

            {/* Initial Password Configuration */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-primary" /> Initial Account Password * (Min. 6 chars)
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showApprovePassword ? 'text' : 'password'}
                  required
                  value={approvePassword}
                  onChange={(e) => {
                    setApprovePassword(e.target.value);
                    if (e.target.value.trim().length >= 6) setApprovePasswordError(null);
                  }}
                  placeholder="Enter initial password (e.g. Star@9876)"
                  className={`w-full px-3.5 py-2 pr-10 rounded-xl border bg-background text-xs font-medium font-mono focus:outline-none text-foreground ${
                    approvePassword && approvePassword.trim().length < 6 ? 'border-red-500 bg-red-500/5' : 'border-border focus:border-brand-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApprovePassword(!showApprovePassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title={showApprovePassword ? "Hide password" : "Show password"}
                >
                  {showApprovePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {approvePassword && approvePassword.trim().length < 6 && (
                <span className="text-[11px] text-red-500 font-semibold block">Password must be at least 6 characters.</span>
              )}
              {approvePasswordError && (
                <span className="text-[11px] text-red-500 font-semibold block">{approvePasswordError}</span>
              )}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Admin sets the initial password. The shareholder will receive login credentials via SMS and can change their password anytime in <strong>Profile & Security</strong>.
              </p>
            </div>

            {/* Withholding Percentage for Zero Contribution Accounts */}
            <div className="space-y-1.5 text-xs pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Gratitude Share Withholding Percentage (%)
                </label>
                {approveItem.accountType !== 'ZERO_CONTRIBUTION' && (
                  <span className="text-[9px] font-semibold text-gray-500 bg-secondary px-2 py-0.5 rounded">Not Applicable</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={approveItem.accountType !== 'ZERO_CONTRIBUTION'}
                  value={approveItem.accountType === 'ZERO_CONTRIBUTION' ? approveWithholdingPct : ''}
                  onChange={(e) => setApproveWithholdingPct(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:border-brand-500 font-mono ${approveItem.accountType !== 'ZERO_CONTRIBUTION' ? 'opacity-50 cursor-not-allowed bg-muted/40' : ''}`}
                  placeholder={approveItem.accountType !== 'ZERO_CONTRIBUTION' ? "0% (Standard Account - 100% Payout)" : "20"}
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                {approveItem.accountType === 'ZERO_CONTRIBUTION'
                  ? "Admin setting: Percentage of gratitude share withheld by system for this Zero Contribution account."
                  : "Not applicable for Standard Contribution accounts (100% profit & gratitude payouts released)."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => { setShowApproveModal(false); setApproveItem(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!approvePassword.trim() || approvePassword.trim().length < 6) {
                    setApprovePasswordError('Please enter an initial password with at least 6 characters.');
                    return;
                  }
                  approveMutation.mutate({
                    id: approveItem.id,
                    password: approvePassword.trim(),
                    withholdingPercentage: approveItem.accountType === 'ZERO_CONTRIBUTION' ? (parseFloat(approveWithholdingPct) || 20) : 0,
                  });
                }}
                disabled={approveMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {approveMutation.isPending ? 'Activating...' : 'Confirm Approval & Setup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with In-Dialog Error Display */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-foreground">Reject Registration</h3>
            <p className="text-xs text-muted-foreground">
              Rejecting applicant <strong>{selectedRequest.name}</strong> ({selectedRequest.phone}). Provide a reason for the permanent audit trail:
            </p>

            {rejectMutation.isError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{(rejectMutation.error as any)?.response?.data?.message || 'Rejection failed.'}</span>
              </div>
            )}

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unverified bank transfer, illegible receipt, invalid sponsor..."
              className="w-full p-3 border border-border rounded-xl text-xs bg-background focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal with Authenticated Streaming */}
      {proofPreviewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" /> Payment Receipt Viewer
              </h3>
              <button onClick={() => setProofPreviewUrl(null)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[70vh] min-h-[300px] overflow-auto flex items-center justify-center bg-muted/20 rounded-2xl p-4 border border-border">
              {proofPreviewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={getProofUrl(proofPreviewUrl)} 
                  className="w-full h-[500px] rounded-xl border border-border bg-white" 
                  title="PDF Payment Proof"
                />
              ) : (
                <img 
                  src={getProofUrl(proofPreviewUrl)} 
                  alt="Payment Deposit Receipt" 
                  className="max-h-[500px] max-w-full w-auto rounded-xl object-contain shadow-md mx-auto" 
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.img-error-notice')) {
                      const notice = document.createElement('div');
                      notice.className = 'img-error-notice text-center p-6 text-muted-foreground space-y-2';
                      notice.innerHTML = `<p class="font-bold text-xs text-red-500">Could not render inline image preview.</p><p class="text-[11px]">Click "Open in New Tab" or "Download" below to view the original file.</p>`;
                      parent.appendChild(notice);
                    }
                  }}
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="flex items-center gap-4">
                <a 
                  href={getProofUrl(proofPreviewUrl)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </a>
                <a 
                  href={getProofUrl(proofPreviewUrl)} 
                  download="payment-receipt"
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </a>
              </div>
              <button
                onClick={() => setProofPreviewUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
