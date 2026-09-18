"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Plus, Edit3, Trash2, X, Check, Calendar, Clock, AlertTriangle, Loader2,
  Search, Users, CheckSquare, Square, UserCheck, UserX, CheckCircle2
} from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const shareholder = useAuthStore((state) => state.shareholder);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [selectedShareholderIds, setSelectedShareholderIds] = useState<string[]>([]);
  const [shareholderSearch, setShareholderSearch] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    attachmentUrl: '',
    priority: 'MEDIUM',
    audience: 'EVERYONE',
    targetUserId: '',
    pinned: false,
    scheduledFor: '',
    expiresAt: '',
    status: 'PUBLISHED',
  });

  // Fetch announcements list
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['adminAnnouncements'],
    queryFn: async () => {
      const res = await api.get('/admin/announcements');
      return res.data;
    },
  });

  // Fetch shareholders for targeted selection
  const { data: shareholdersList, isLoading: isLoadingShareholders } = useQuery({
    queryKey: ['shareholdersForAnnouncements'],
    queryFn: async () => {
      const res = await api.get('/shareholders?limit=500');
      return res.data?.data || res.data || [];
    },
    enabled: isOpen && (form.audience === 'INDIVIDUAL_USER' || form.audience === 'TARGETED_SHAREHOLDERS'),
  });

  // Filtered shareholders based on search query
  const filteredShareholders = (shareholdersList || []).filter((s: any) => {
    if (!shareholderSearch.trim()) return true;
    const q = shareholderSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.shareholderId?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q)
    );
  });

  // Helper methods for selection
  const toggleSelectShareholder = (idOrCode: string) => {
    setSelectedShareholderIds(prev =>
      prev.includes(idOrCode)
        ? prev.filter(i => i !== idOrCode)
        : [...prev, idOrCode]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredShareholders.map((s: any) => s.shareholderId || s.id);
    setSelectedShareholderIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearSelection = () => {
    setSelectedShareholderIds([]);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/admin/announcements', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
      setIsOpen(false);
      resetForm();
      toast({ title: "Announcement Published", description: "Your message has been created and published.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error creating announcement', type: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await api.put(`/admin/announcements/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
      setIsOpen(false);
      resetForm();
      toast({ title: "Announcement Updated", description: "Changes saved and updated in the system.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error updating announcement', type: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
      toast({ title: "Announcement Archived", description: "Selected post has been archived.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error archiving announcement', type: "error" });
    },
  });

  const resetForm = () => {
    setSelectedAnnouncement(null);
    setSelectedShareholderIds([]);
    setShareholderSearch('');
    setForm({
      title: '',
      content: '',
      imageUrl: '',
      attachmentUrl: '',
      priority: 'MEDIUM',
      audience: 'EVERYONE',
      targetUserId: '',
      pinned: false,
      scheduledFor: '',
      expiresAt: '',
      status: 'PUBLISHED',
    });
  };

  const handleEdit = (ann: any) => {
    setSelectedAnnouncement(ann);
    let ids: string[] = [];
    if (ann.targetUserId) {
      try {
        if (ann.targetUserId.trim().startsWith('[')) {
          ids = JSON.parse(ann.targetUserId);
        } else {
          ids = ann.targetUserId.split(',').map((s: string) => s.trim());
        }
      } catch {
        ids = [ann.targetUserId.trim()];
      }
    }
    setSelectedShareholderIds(ids.filter(Boolean));
    setShareholderSearch('');

    setForm({
      title: ann.title,
      content: ann.content,
      imageUrl: ann.imageUrl || '',
      attachmentUrl: ann.attachmentUrl || '',
      priority: ann.priority,
      audience: ann.audience,
      targetUserId: ann.targetUserId || '',
      pinned: ann.pinned,
      scheduledFor: ann.scheduledFor ? new Date(ann.scheduledFor).toISOString().substring(0, 16) : '',
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt).toISOString().substring(0, 16) : '',
      status: ann.status,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Archive Announcement",
      description: "Are you sure you want to archive this announcement? It will be removed from all active feeds.",
      confirmText: "Archive",
      variant: "danger"
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = () => {
    if (!form.title || !form.content) {
      toast({ title: "Inputs Required", description: "Title and Content fields are required.", type: "warning" });
      return;
    }

    let targetUserIdPayload = form.targetUserId;
    if (form.audience === 'INDIVIDUAL_USER' || form.audience === 'TARGETED_SHAREHOLDERS') {
      if (selectedShareholderIds.length === 0 && !form.targetUserId.trim()) {
        toast({ title: "Target Shareholder Required", description: "Please select at least one shareholder from the list or enter a Shareholder ID.", type: "warning" });
        return;
      }
      targetUserIdPayload = selectedShareholderIds.length > 0 
        ? JSON.stringify(selectedShareholderIds)
        : form.targetUserId;
    }

    const payload: any = {
      ...form,
      targetUserId: targetUserIdPayload,
      scheduledFor: form.scheduledFor || null,
      expiresAt: form.expiresAt || null,
    };

    if (selectedAnnouncement) {
      updateMutation.mutate({ id: selectedAnnouncement.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Helper to format audience display in table
  const formatAudienceLabel = (a: any) => {
    if (a.audience === 'EVERYONE') return 'Everyone (All Roles)';
    if (a.audience === 'ADMINS') return 'Administrators';
    if (a.audience === 'SHAREHOLDERS') return 'All Shareholders';
    if (a.audience === 'INDIVIDUAL_USER' || a.audience === 'TARGETED_SHAREHOLDERS') {
      let count = 1;
      if (a.targetUserId) {
        try {
          if (a.targetUserId.trim().startsWith('[')) {
            count = JSON.parse(a.targetUserId).length;
          } else if (a.targetUserId.includes(',')) {
            count = a.targetUserId.split(',').length;
          }
        } catch {
          count = 1;
        }
      }
      return `Targeted Shareholders (${count})`;
    }
    return a.audience;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
    >
      {/* Header */}
      <div className="app-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              Communications Center
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-brand-600 dark:text-brand-400" /> Announcement System
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Publish and schedule targeted notifications and pin priority messages to specific shareholder roles or individual shareholders.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsOpen(true); }}
          className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-theme-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Plus size={16} /> Compose Announcement
        </button>
      </div>

      {/* Grid List Table */}
      <div className="app-card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Loading announcements...</p>
          </div>
        ) : announcements?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-600" />
            <p className="text-sm font-semibold">No Announcements Published</p>
            <p className="text-xs text-gray-400 mt-0.5">Click "Compose Announcement" to publish your first post.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 align-middle whitespace-nowrap">Title / Summary</th>
                  <th className="px-5 py-3.5 align-middle whitespace-nowrap">Audience Target</th>
                  <th className="px-5 py-3.5 align-middle whitespace-nowrap">Priority</th>
                  <th className="px-5 py-3.5 align-middle whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 align-middle whitespace-nowrap">Scheduled For</th>
                  <th className="px-5 py-3.5 align-middle text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300 font-medium">
                {announcements?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-2 select-none">
                        {a.pinned && (
                          <span className="badge-warning text-[10px] shrink-0">
                            Pinned
                          </span>
                        )}
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{a.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs mt-1">{a.content.replace(/<[^>]*>/g, '')}</p>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      <span className="badge-brand flex items-center gap-1 w-max">
                        <Users size={11} /> {formatAudienceLabel(a)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      <span className={`badge ${
                        a.priority === 'HIGH' ? 'badge-error' :
                        a.priority === 'MEDIUM' ? 'badge-warning' :
                        'badge-neutral'
                      }`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      <span className={`badge ${
                        a.status === 'PUBLISHED' ? 'badge-success' :
                        a.status === 'DRAFT' ? 'badge-neutral' :
                        'badge-error'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} /> 
                        {a.scheduledFor ? new Date(a.scheduledFor).toLocaleDateString() : 'Immediate'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap space-x-1 select-none">
                      <button onClick={() => handleEdit(a)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer inline-flex items-center justify-center" title="Edit"><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 rounded-lg text-gray-500 transition-all cursor-pointer inline-flex items-center justify-center" title="Archive"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compose/Edit Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full shadow-theme-xl relative overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800 my-auto"
            >
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/80">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{selectedAnnouncement ? 'Edit Announcement' : 'Compose Announcement'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Broadcast notifications across roles or target specific shareholders by ID</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Announcement Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="System Maintenance / Corporate Alert" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Message Content *</label>
                  <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Detail the bulletin update..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Priority Level</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Audience Target</label>
                    <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer">
                      <option value="EVERYONE">Everyone (All Roles)</option>
                      <option value="ADMINS">Administrators Only</option>
                      <option value="SHAREHOLDERS">Standard Shareholders Only</option>
                      <option value="INDIVIDUAL_USER">Particular Shareholders (Select by ID)</option>
                    </select>
                  </div>
                </div>

                {/* PARTICULAR SHAREHOLDERS SELECTOR SECTION */}
                {(form.audience === 'INDIVIDUAL_USER' || form.audience === 'TARGETED_SHAREHOLDERS') && (
                  <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/40 dark:bg-brand-950/20 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <label className="block text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                          <UserCheck size={14} /> Select Particular Shareholders
                        </label>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Search and select individual shareholder IDs to receive this announcement.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-brand">
                          {selectedShareholderIds.length} Selected
                        </span>
                        <button 
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          Select Filtered
                        </button>
                        {selectedShareholderIds.length > 0 && (
                          <button 
                            type="button"
                            onClick={handleClearSelection}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input 
                        type="text" 
                        value={shareholderSearch} 
                        onChange={e => setShareholderSearch(e.target.value)}
                        placeholder="Search shareholder by Name, Shareholder ID (USR...), Phone..."
                        className="w-full pl-9 pr-4 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    {/* Selected Shareholders Badges/Chips */}
                    {selectedShareholderIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 custom-scrollbar">
                        {selectedShareholderIds.map(idOrCode => {
                          const matched = (shareholdersList || []).find((s: any) => s.id === idOrCode || s.shareholderId === idOrCode);
                          const displayName = matched ? `${matched.name} (${matched.shareholderId || matched.id})` : idOrCode;
                          return (
                            <span 
                              key={idOrCode}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-900/50"
                            >
                              {displayName}
                              <button 
                                type="button"
                                onClick={() => toggleSelectShareholder(idOrCode)}
                                className="hover:text-rose-500 cursor-pointer ml-0.5"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Interactive List with Checkboxes */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 max-h-48 overflow-y-auto divide-y divide-gray-150 dark:divide-gray-800 custom-scrollbar">
                      {isLoadingShareholders ? (
                        <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin text-brand-600" /> Loading shareholder directory...
                        </div>
                      ) : filteredShareholders.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-xs">
                          No shareholders found matching "{shareholderSearch}"
                        </div>
                      ) : (
                        filteredShareholders.map((s: any) => {
                          const targetId = s.shareholderId || s.id;
                          const isSelected = selectedShareholderIds.includes(targetId) || selectedShareholderIds.includes(s.id);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => toggleSelectShareholder(targetId)}
                              className={`flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors ${isSelected ? 'bg-brand-50/60 dark:bg-brand-950/30' : ''}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                                ) : (
                                  <Square size={16} className="text-gray-400 shrink-0" />
                                )}
                                <div className="truncate">
                                  <span className="font-semibold text-gray-900 dark:text-white text-xs">{s.name || 'Unnamed Shareholder'}</span>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 font-semibold">{s.shareholderId || s.id}</span>
                                    {s.phone && <span>• {s.phone}</span>}
                                    <span className="uppercase text-[10px] font-bold text-brand-600 dark:text-brand-400">{s.role}</span>
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 size={13} /> Selected
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Manual Input Fallback */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Manual Shareholder ID / UUID (Optional comma-separated string)
                      </label>
                      <input 
                        type="text" 
                        value={form.targetUserId} 
                        onChange={e => setForm({...form, targetUserId: e.target.value})} 
                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-gray-900" 
                        placeholder="USR000001, USR000002..." 
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Clock size={13} /> Schedule Publish Date</label>
                    <input type="datetime-local" value={form.scheduledFor} onChange={e => setForm({...form, scheduledFor: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:outline-none text-gray-700 dark:text-gray-300 dark:bg-gray-900" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Clock size={13} /> Expire Date</label>
                    <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:outline-none text-gray-700 dark:text-gray-300 dark:bg-gray-900" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Cover Image URL (Optional)</label>
                    <input type="text" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:outline-none dark:bg-gray-900" placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Attachment URL (Optional)</label>
                    <input type="text" value={form.attachmentUrl} onChange={e => setForm({...form, attachmentUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:outline-none dark:bg-gray-900" placeholder="https://..." />
                  </div>
                </div>

                <div className="pt-2 select-none">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.pinned} onChange={e => setForm({...form, pinned: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Pin to top of target shareholder dashboard feeds</span>
                  </label>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80 flex justify-end gap-2.5 select-none">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-theme-xs cursor-pointer">
                  {selectedAnnouncement ? 'Save Changes' : 'Publish Announcement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
