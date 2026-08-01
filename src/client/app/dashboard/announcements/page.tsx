"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Search, Pin, Calendar, Eye, CheckCircle2, 
  ExternalLink, FileText, Image as ImageIcon, X, AlertCircle, Sparkles
} from 'lucide-react';

export default function ShareholderAnnouncementsPage() {
  const queryClient = useQueryClient();
  const shareholder = useAuthStore((state) => state.shareholder);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  // Fetch announcements for shareholder
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['myAnnouncements'],
    queryFn: async () => {
      const res = await api.get('/announcements');
      return res.data;
    },
    enabled: !!shareholder,
  });

  // Mark announcement read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/announcements/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleOpenAnnouncement = (ann: any) => {
    setSelectedAnnouncement(ann);
    const isRead = ann.reads && ann.reads.length > 0;
    if (!isRead) {
      markReadMutation.mutate(ann.id);
    }
  };

  const filteredAnnouncements = (announcements || []).filter((a: any) => {
    const matchesSearch = !search.trim() || 
      a.title?.toLowerCase().includes(search.toLowerCase()) || 
      a.content?.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;

    if (priorityFilter === 'HIGH') return a.priority === 'HIGH';
    if (priorityFilter === 'PINNED') return a.pinned;
    if (priorityFilter === 'UNREAD') return !a.reads || a.reads.length === 0;

    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-primary/10 via-purple-500/10 to-blue-500/10 border border-brand-primary/20 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-primary font-extrabold text-xs tracking-wider uppercase mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Shareholder Communication Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Announcements & Notices</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
              Stay informed with official company updates, investor circulars, and targeted notices published to your account.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements by title or content..."
            className="w-full pl-10 pr-4 py-2 bg-muted/40 focus:bg-white dark:focus:bg-card border border-border-subtle rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Updates' },
            { id: 'PINNED', label: 'Pinned' },
            { id: 'HIGH', label: 'High Priority' },
            { id: 'UNREAD', label: 'Unread' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPriorityFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                priorityFilter === tab.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border-subtle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List / Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-card rounded-2xl border border-border animate-pulse p-6"></div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-card p-12 rounded-3xl border border-border text-center space-y-3">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Announcements Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search || priorityFilter !== 'ALL'
              ? 'No announcements match your current search or filter criteria.'
              : 'There are currently no active announcements published for your account.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann: any) => {
            const isRead = ann.reads && ann.reads.length > 0;
            return (
              <motion.div
                key={ann.id}
                whileHover={{ scale: 1.005 }}
                className={`bg-card p-6 rounded-2xl border transition-all shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4 cursor-pointer relative overflow-hidden ${
                  ann.pinned
                    ? 'border-brand-primary/40 bg-brand-primary/[0.02]'
                    : !isRead
                    ? 'border-brand-accent/40 bg-brand-accent/[0.02]'
                    : 'border-border hover:border-border-subtle'
                }`}
                onClick={() => handleOpenAnnouncement(ann)}
              >
                {/* Left status accent strip */}
                {!isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-primary rounded-r-full" />
                )}

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {ann.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md border border-brand-primary/20">
                        <Pin className="w-3 h-3 fill-brand-primary" /> Pinned
                      </span>
                    )}
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                      ann.priority === 'HIGH'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        : ann.priority === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    }`}>
                      {ann.priority || 'NORMAL'} PRIORITY
                    </span>
                    {!isRead ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">
                        New
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-md border border-border-subtle">
                        Read
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base font-bold leading-snug ${!isRead ? 'text-foreground font-extrabold' : 'text-foreground/90'}`}>
                    {ann.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground/80 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {ann.imageUrl && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5" /> Has Image
                      </span>
                    )}
                    {ann.attachmentUrl && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                        <FileText className="w-3.5 h-3.5" /> Has Document
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAnnouncement(ann);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Full Announcement</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pop-up Modal / Full View Mode */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-card border border-border-subtle rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-6 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border-subtle pb-4 shrink-0">
                <div className="space-y-1.5 pr-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAnnouncement.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md border border-brand-primary/20">
                        <Pin className="w-3 h-3 fill-brand-primary" /> Pinned Notice
                      </span>
                    )}
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                      selectedAnnouncement.priority === 'HIGH'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        : selectedAnnouncement.priority === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    }`}>
                      {selectedAnnouncement.priority || 'NORMAL'} PRIORITY
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                    {selectedAnnouncement.title}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Published: {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedAnnouncement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-2xl hover:bg-muted dark:hover:bg-secondary transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Full Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {/* Media Image Banner if present */}
                {selectedAnnouncement.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-border-subtle bg-black/5 dark:bg-white/5 max-h-64 flex justify-center items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedAnnouncement.imageUrl} 
                      alt="Announcement attachment" 
                      className="max-h-64 w-full object-cover" 
                    />
                  </div>
                )}

                {/* Message Body */}
                <div className="bg-muted/15 dark:bg-secondary/30 p-5 rounded-2xl border border-border-subtle text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedAnnouncement.content}
                </div>

                {/* File Attachment Link if present */}
                {selectedAnnouncement.attachmentUrl && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs font-bold">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                      <span>Official Attached Document</span>
                    </div>
                    <a
                      href={selectedAnnouncement.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                    >
                      <span>Download / View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center border-t border-border-subtle pt-4 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Marked as Read</span>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-6 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-md cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
