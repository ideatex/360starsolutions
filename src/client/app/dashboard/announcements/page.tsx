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
      className="max-w-5xl mx-auto space-y-6 pb-12 font-outfit"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-50 via-purple-500/5 to-blue-500/5 dark:from-brand-950/20 dark:via-purple-950/10 dark:to-blue-950/10 border border-brand-200 dark:border-brand-800/30 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-theme-xs">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-xs tracking-wider uppercase mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Shareholder Communication Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Announcements & Notices</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Stay informed with official company updates, investor circulars, and targeted notices published to your account.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 app-card p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements by title or content..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-all"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                priorityFilter === tab.id
                  ? 'bg-brand-500 text-white shadow-theme-xs'
                  : 'bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
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
            <div key={n} className="h-32 app-card animate-pulse p-6"></div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="app-card p-12 text-center space-y-3">
          <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Announcements Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
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
                whileHover={{ scale: 1.002 }}
                className={`app-card p-6 transition-all flex flex-col sm:flex-row justify-between items-start gap-4 cursor-pointer relative overflow-hidden ${
                  ann.pinned
                    ? 'border-brand-300 dark:border-brand-700 bg-brand-50/10 dark:bg-brand-950/10'
                    : !isRead
                    ? 'border-brand-200 dark:border-brand-800'
                    : ''
                }`}
                onClick={() => handleOpenAnnouncement(ann)}
              >
                {/* Left status accent strip */}
                {!isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r-full" />
                )}

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {ann.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-md border border-brand-200 dark:border-brand-800/40">
                        <Pin className="w-3 h-3 fill-brand-500" /> Pinned
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      ann.priority === 'HIGH'
                        ? 'badge-error'
                        : ann.priority === 'MEDIUM'
                        ? 'badge-warning'
                        : 'badge-brand'
                    }`}>
                      {ann.priority || 'NORMAL'} PRIORITY
                    </span>
                    {!isRead ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 badge-success">
                        New
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md">
                        Read
                      </span>
                    )}
                  </div>

                  <h3 className={`text-sm sm:text-base font-bold leading-snug ${!isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {ann.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {ann.imageUrl && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5" /> Has Image
                      </span>
                    )}
                    {ann.attachmentUrl && (
                      <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold">
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/15 hover:bg-brand-500 hover:text-white text-brand-600 dark:text-brand-400 text-xs font-semibold transition-all shadow-theme-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Notice</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-theme-xl relative space-y-6 max-h-[90vh] flex flex-col font-outfit"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-4 shrink-0">
                <div className="space-y-1.5 pr-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAnnouncement.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-md border border-brand-200 dark:border-brand-800/40">
                        <Pin className="w-3 h-3 fill-brand-500" /> Pinned Notice
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedAnnouncement.priority === 'HIGH'
                        ? 'badge-error'
                        : selectedAnnouncement.priority === 'MEDIUM'
                        ? 'badge-warning'
                        : 'badge-brand'
                    }`}>
                      {selectedAnnouncement.priority || 'NORMAL'} PRIORITY
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Published: {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedAnnouncement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Full Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {/* Media Image Banner if present */}
                {selectedAnnouncement.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 max-h-64 flex justify-center items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedAnnouncement.imageUrl} 
                      alt="Announcement attachment" 
                      className="max-h-64 w-full object-cover" 
                    />
                  </div>
                )}

                {/* Message Body */}
                <div className="bg-gray-50/60 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-outfit">
                  {selectedAnnouncement.content}
                </div>

                {/* File Attachment Link if present */}
                {selectedAnnouncement.attachmentUrl && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800/30 text-xs font-semibold">
                    <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                      <FileText className="w-4 h-4" />
                      <span>Official Attached Document</span>
                    </div>
                    <a
                      href={selectedAnnouncement.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-theme-xs"
                    >
                      <span>Download / View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-success-500" />
                  <span>Marked as Read</span>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-5 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition-all shadow-theme-xs cursor-pointer"
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
