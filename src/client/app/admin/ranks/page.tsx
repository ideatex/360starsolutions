"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Award, RefreshCw, ShieldCheck, CheckCircle2, TrendingUp, 
  Users, Layers, ArrowRight, AlertCircle, Edit3, UserCheck, 
  Search, ChevronLeft, ChevronRight, X, Sparkles, Check, FileText
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminRanksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const shareholder = useAuthStore((state) => state.shareholder);
  const isSuperAdmin = shareholder?.role === 'SUPER_ADMIN';

  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Rank Names Config Modal State
  const [isEditConfigsOpen, setIsEditConfigsOpen] = useState(false);
  const [editableConfigs, setEditableConfigs] = useState<any[]>([]);

  // Manual Rank Allotment Modal State
  const [isAllotOpen, setIsAllotOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRankName, setSelectedRankName] = useState('');
  const [allotRemarks, setAllotRemarks] = useState('');

  // Fetch Rank Configurations
  const { data: rankConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['adminRankConfigs'],
    queryFn: async () => {
      const res = await api.get('/ranks/configurations');
      return res.data;
    },
  });

  // Fetch Member Rank Statuses
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['adminMembersRankStatus', memberSearch, page],
    queryFn: async () => {
      const res = await api.get('/ranks/members-status', {
        params: { search: memberSearch || undefined, page, limit },
      });
      return res.data;
    },
  });

  // Recalculate Mutation
  const recalcMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ranks/recalculate-all');
      return res.data;
    },
    onSuccess: (data) => {
      setRecalcSuccess(`Recalculated ranks for ${data.evaluatedCount} shareholders!`);
      queryClient.invalidateQueries({ queryKey: ['adminRankConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['adminMembersRankStatus'] });
      toast({ title: 'Ranks Evaluated', description: `Successfully processed ${data.evaluatedCount} shareholder profiles.`, type: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Recalculation Failed', description: err.response?.data?.message || 'Error processing ranks', type: 'error' });
    },
  });

  // Update Rank Configurations Mutation
  const updateConfigsMutation = useMutation({
    mutationFn: async (configs: any[]) => {
      const res = await api.put('/ranks/configurations', { configurations: configs });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRankConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['adminMembersRankStatus'] });
      setIsEditConfigsOpen(false);
      toast({ title: 'Configurations Updated', description: 'Rank names and parameters have been updated across system.', type: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Update Failed', description: err.response?.data?.message || 'Error saving rank configs', type: 'error' });
    },
  });

  // Manual Allot Rank Mutation
  const allotRankMutation = useMutation({
    mutationFn: async (payload: { shareholderId: string; rankName: string; remarks?: string }) => {
      const res = await api.post('/ranks/manual-allot', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminMembersRankStatus'] });
      setIsAllotOpen(false);
      setSelectedMember(null);
      setSelectedRankName('');
      setAllotRemarks('');
      toast({ title: 'Rank Allotted Successfully', description: data.message || 'Shareholder rank updated and notification sent.', type: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Allotment Failed', description: err.response?.data?.message || 'Error allotting rank', type: 'error' });
    },
  });

  const handleOpenEditConfigs = () => {
    if (rankConfigs) {
      setEditableConfigs(JSON.parse(JSON.stringify(rankConfigs)));
      setIsEditConfigsOpen(true);
    }
  };

  const handleOpenAllotModal = (member: any) => {
    setSelectedMember(member);
    setSelectedRankName(member.currentRank !== 'None' ? member.currentRank : (rankConfigs?.[0]?.name || 'Bronze'));
    setAllotRemarks('');
    setIsAllotOpen(true);
  };

  const members = membersData?.data || [];
  const totalMembers = membersData?.total || 0;
  const lastPage = membersData?.lastPage || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Rank & Leg Balancing Engine</h1>
            <span className="badge-brand">
              Product 360
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure rank titles, evaluate 50/50 leg balance compliance, and perform manual rank allotment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isSuperAdmin && (
            <button
              onClick={handleOpenEditConfigs}
              className="px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold transition-all shadow-theme-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-500" />
              <span>Edit Rank Names</span>
            </button>
          )}

          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-theme-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{recalcMutation.isPending ? 'Recalculating...' : 'Recalculate All Ranks'}</span>
          </button>
        </div>
      </div>

      {recalcSuccess && (
        <div className="p-4 rounded-2xl bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 text-success-600 dark:text-success-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{recalcSuccess}</span>
          </div>
          <button onClick={() => setRecalcSuccess(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* 50/50 Leg Balance Principle Banner */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-white dark:to-gray-900/60 border border-brand-500/20 space-y-2">
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> 50/50 Leg Balance Principle
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">How Rank Qualification Works</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed font-medium">
          A shareholder’s single strongest leg (direct referral subtree with maximum volume) can contribute at most <strong>50%</strong> of the required threshold. The remaining legs combined must supply at least the other <strong>50%</strong>. This guarantees genuine organizational breadth and prevents single-line piggybacking.
        </p>
      </div>

      {/* Rank Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingConfigs ? (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
          ))
        ) : (
          rankConfigs?.map((r: any) => {
            const req = Number(r.requiredVolume);
            const half = req * 0.50;

            const badgeClass = 
              r.name.toLowerCase().includes('diamond') ? 'badge-brand' :
              r.name.toLowerCase().includes('gold') ? 'badge-warning' :
              r.name.toLowerCase().includes('silver') ? 'badge-brand' :
              'badge-warning';

            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 space-y-4 hover:border-brand-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className={badgeClass}>
                    {r.name}
                  </span>
                  <Award className="w-5 h-5 text-gray-400" />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Target Team Volume</span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
                    ₹{req.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  <div className="flex justify-between items-center">
                    <span>Strongest Leg Max (50%):</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">₹{half.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Other Legs Min (50%):</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">₹{half.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Member Business Volume Status & Eligibility Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Member Volume & Rank Status</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Live monitoring of network volume, leg distributions, and eligibility.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search member name or ID..."
              value={memberSearch}
              onChange={(e) => { setMemberSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-theme-xs font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[360px]">
          {loadingMembers ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <Users className="w-8 h-8 animate-spin text-brand-500 opacity-50 mb-3" />
              <p className="text-xs font-semibold">Loading member rank statuses...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2.5 opacity-30" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No Member Records Found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Shareholder Name</th>
                  <th className="px-6 py-3.5">Shareholder ID</th>
                  <th className="px-6 py-3.5 text-right">Current Business Volume (₹)</th>
                  <th className="px-6 py-3.5 text-right">Volume Required (₹)</th>
                  <th className="px-6 py-3.5 text-center">Current Rank</th>
                  <th className="px-6 py-3.5 text-center">Eligibility Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200 font-medium">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {m.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {m.shareholderId}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-gray-900 dark:text-white">
                      ₹{Number(m.currentBusinessVolume ?? m.totalTeamVolume ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                      {(m.volumeRequiredForNext !== undefined ? m.volumeRequiredForNext : m.requiredVolume) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          ₹{Number(m.volumeRequiredForNext !== undefined ? m.volumeRequiredForNext : m.requiredVolume).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-success-600 dark:text-success-400 font-bold">Top Rank Achieved</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={m.currentRank && m.currentRank !== 'None' ? 'badge-brand' : 'badge-brand opacity-60'}>
                        {m.currentRank || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {m.eligibleForNextRank ? (
                        <span className="badge-success">
                          <CheckCircle2 size={12} /> Eligible for Next
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-semibold">
                          {m.eligibilityStatus || 'In Progress'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenAllotModal(m)}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:hover:bg-brand-500/25 dark:text-brand-400 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-theme-xs"
                        >
                          Allot Rank
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!loadingMembers && lastPage > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex justify-between items-center text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-40 flex items-center gap-1 font-semibold cursor-pointer shadow-theme-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-gray-500 dark:text-gray-400 font-semibold">
              Page {page} of {lastPage} ({totalMembers} members)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1.5 border border-border rounded-lg bg-card disabled:opacity-40 flex items-center gap-1 font-semibold cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* EDIT RANK NAMES & CONFIGURATIONS MODAL */}
      <AnimatePresence>
        {isEditConfigsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card max-w-2xl w-full rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-foreground">Edit Custom Rank Names & Volumes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditConfigsOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                <p className="text-muted-foreground">
                  Customizing rank titles will reflect dynamically across all member statements, badges, and qualification rules.
                </p>

                {updateConfigsMutation.isError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{(updateConfigsMutation.error as any)?.response?.data?.message || 'Failed to save rank configurations.'}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {editableConfigs.map((cfg, idx) => (
                    <div key={cfg.id || idx} className="p-4 rounded-2xl border border-border bg-secondary/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Rank Tier #{idx + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Rank Title</label>
                          <input
                            type="text"
                            value={cfg.name}
                            onChange={(e) => {
                              const updated = [...editableConfigs];
                              updated[idx].name = e.target.value;
                              setEditableConfigs(updated);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-xl bg-card text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Required Volume (₹)</label>
                          <input
                            type="number"
                            value={cfg.requiredVolume}
                            onChange={(e) => {
                              const updated = [...editableConfigs];
                              updated[idx].requiredVolume = e.target.value;
                              setEditableConfigs(updated);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-xl bg-card text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditConfigsOpen(false)}
                  className="px-4 py-2 border border-border bg-card hover:bg-secondary/50 text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateConfigsMutation.mutate(editableConfigs)}
                  disabled={updateConfigsMutation.isPending}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updateConfigsMutation.isPending ? 'Saving Changes...' : 'Save Rank Configurations'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANUAL RANK ALLOTMENT MODAL */}
      <AnimatePresence>
        {isAllotOpen && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card max-w-md w-full rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-foreground">Manual Rank Allotment</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAllotOpen(false); setSelectedMember(null); }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {allotRankMutation.isError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{(allotRankMutation.error as any)?.response?.data?.message || 'Failed to allot rank.'}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-1">
                  <p className="text-muted-foreground">Shareholder: <strong className="text-foreground">{selectedMember.name}</strong></p>
                  <p className="text-muted-foreground">ID: <strong className="text-brand-primary font-mono">{selectedMember.shareholderId}</strong></p>
                  <p className="text-muted-foreground">Current Rank: <strong className="text-foreground">{selectedMember.currentRank || 'None'}</strong></p>
                  <p className="text-muted-foreground">Team Volume: <strong className="font-mono">₹{Number(selectedMember.totalTeamVolume || 0).toLocaleString('en-IN')}</strong></p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Rank to Allot *</label>
                  <select
                    value={selectedRankName}
                    onChange={(e) => setSelectedRankName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                  >
                    {rankConfigs?.map((r: any) => (
                      <option key={r.id} value={r.name}>
                        {r.name} (Required Volume: ₹{Number(r.requiredVolume).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Administrative Remarks / Reason</label>
                  <textarea
                    value={allotRemarks}
                    onChange={(e) => setAllotRemarks(e.target.value)}
                    placeholder="e.g. Exceptional leadership performance during special campaign"
                    className="w-full p-3 border border-border rounded-xl bg-card text-xs focus:outline-none min-h-[80px]"
                  />
                </div>

                <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/15 text-[11px] text-muted-foreground">
                  <p className="font-bold text-foreground">Audit & Notification Impact:</p>
                  <p className="mt-0.5">
                    This allotment logs an administrative audit entry and dispatches a congratulatory notification to the shareholder’s dashboard.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAllotOpen(false); setSelectedMember(null); }}
                  className="px-4 py-2 border border-border bg-card hover:bg-secondary/50 text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => allotRankMutation.mutate({
                    shareholderId: selectedMember.id,
                    rankName: selectedRankName,
                    remarks: allotRemarks || undefined,
                  })}
                  disabled={allotRankMutation.isPending || !selectedRankName}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {allotRankMutation.isPending ? 'Allotting Rank...' : 'Confirm & Allot Rank'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
