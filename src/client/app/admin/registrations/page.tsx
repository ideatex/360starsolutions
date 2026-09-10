"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Users, CheckCircle2, XCircle, Search, Filter, Eye, AlertCircle, 
  Clock, FileText, ArrowRight, ShieldCheck, RefreshCw, Layers, Send,
  X, ExternalLink, Calendar, Phone, User as UserIcon
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    mutationFn: async (id: string) => {
      const res = await api.post(`/registrations/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(`Approved! User ID created: ${data.shareholderId}. SMS dispatch: ${data.smsStatus}.`);
      setActionError(null);
      setSelectedRequest(null);
      setDetailModalItem(null);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Registration Review Queue</h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Product 360
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify payment proofs, approve new Contributor / Zero-Contribution accounts, and monitor SMS credential delivery.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-foreground border border-border cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
        </div>
      )}

      {/* Toolbar & Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Applicant Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: 'Pending Review', value: 'PENDING_ADMIN_REVIEW' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'All Requests', value: 'ALL' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
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
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground font-semibold">
                    Loading registration requests...
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground font-semibold">
                    No registration requests found in this queue.
                  </td>
                </tr>
              ) : (
                data?.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground cursor-pointer hover:text-brand-primary" onClick={() => setDetailModalItem(item)}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        item.accountType === 'ZERO_CONTRIBUTION'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      }`}>
                        {item.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contrib' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-foreground">
                      {item.contributionAmount 
                        ? `₹${Number(item.contributionAmount).toLocaleString('en-IN')}`
                        : '—'
                      }
                    </td>
                    <td className="px-5 py-4">
                      {item.referrer ? (
                        <div>
                          <span className="font-semibold text-foreground">{item.referrer.name}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">({item.referrer.shareholderId})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.paymentProofUrl ? (
                        <button 
                          onClick={() => setProofPreviewUrl(item.paymentProofUrl)} 
                          className="text-brand-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">No proof required</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        item.status === 'APPROVED' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : item.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.status === 'APPROVED' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            item.smsStatus === 'SENT' || item.smsStatus === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : item.smsStatus === 'FAILED'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}>
                            {item.smsStatus || 'SENT'}
                          </span>
                          {item.smsStatus === 'FAILED' && item.smsLogId && (
                            <button
                              onClick={() => retrySmsMutation.mutate(item.smsLogId)}
                              disabled={retrySmsMutation.isPending}
                              title="Retry SMS dispatch"
                              className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailModalItem(item)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                          title="View Full Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(item.status === 'PENDING_REVIEW' || item.status === 'PENDING_ADMIN_REVIEW') && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(item.id)}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-foreground">Registration Request Details</h3>
                <p className="text-[11px] font-mono text-muted-foreground">ID: {detailModalItem.id}</p>
              </div>
              <button 
                onClick={() => setDetailModalItem(null)} 
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Applicant Name</span>
                  <span className="font-bold text-foreground text-sm">{detailModalItem.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Phone Number</span>
                  <span className="font-mono font-bold text-foreground">{detailModalItem.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Account Type</span>
                  <span className="font-bold text-foreground">
                    {detailModalItem.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution Account' : 'Standard Contribution Account'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Contribution Amount</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {detailModalItem.contributionAmount ? `₹${Number(detailModalItem.contributionAmount).toLocaleString('en-IN')}` : '₹0 (Zero Contrib)'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Sponsor / Referrer:</span>
                  <span className="font-bold text-foreground">
                    {detailModalItem.referrer ? `${detailModalItem.referrer.name} (${detailModalItem.referrer.shareholderId})` : 'Direct / No Sponsor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Application Status:</span>
                  <span className="font-bold uppercase text-brand-primary">{detailModalItem.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Submission Timestamp:</span>
                  <span className="text-foreground">{new Date(detailModalItem.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {detailModalItem.reviewedBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Reviewed By:</span>
                    <span className="font-bold text-foreground">{detailModalItem.reviewedBy.name}</span>
                  </div>
                )}
              </div>

              {detailModalItem.paymentProofUrl && (
                <div className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-primary" />
                    <span className="font-bold text-xs">Payment Receipt Attached</span>
                  </div>
                  <button
                    onClick={() => setProofPreviewUrl(detailModalItem.paymentProofUrl)}
                    className="px-3 py-1 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview Receipt
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Close
              </button>
              {(detailModalItem.status === 'PENDING_REVIEW' || detailModalItem.status === 'PENDING_ADMIN_REVIEW') && (
                <>
                  <button
                    onClick={() => { setSelectedRequest(detailModalItem); setShowRejectModal(true); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600/10 hover:bg-red-600/20 text-red-600 cursor-pointer border border-red-600/20"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(detailModalItem.id)}
                    disabled={approveMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Approve & Activate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-foreground">Reject Registration</h3>
            <p className="text-xs text-muted-foreground">
              Rejecting applicant <strong>{selectedRequest.name}</strong> ({selectedRequest.phone}). Provide a reason for the permanent audit trail:
            </p>
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

      {/* Proof Preview Modal */}
      {proofPreviewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" /> Bank Transfer Receipt Viewer
              </h3>
              <button onClick={() => setProofPreviewUrl(null)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-muted/20 rounded-2xl p-4 border border-border">
              {proofPreviewUrl.endsWith('.pdf') ? (
                <iframe src={proofPreviewUrl} className="w-full h-[500px] rounded-xl" />
              ) : (
                <img src={proofPreviewUrl} alt="Payment Receipt" className="max-h-[500px] w-auto rounded-xl object-contain shadow-md" />
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <a 
                href={proofPreviewUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>
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
