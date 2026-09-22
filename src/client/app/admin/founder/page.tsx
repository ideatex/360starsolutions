"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Edit3, Trash2, X, Calendar, Image, Loader2 
} from 'lucide-react';

export default function AdminFounderArticlesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    coverImage: '',
    status: 'PUBLISHED',
  });

  // Fetch articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ['adminArticles'],
    queryFn: async () => {
      const res = await api.get('/admin/founder/articles');
      return res.data;
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/admin/founder/articles', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminArticles'] });
      setIsOpen(false);
      resetForm();
      toast({ title: "Thought Published", description: "The new founder thought article has been posted.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error creating article', type: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await api.put(`/admin/founder/articles/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminArticles'] });
      setIsOpen(false);
      resetForm();
      toast({ title: "Thought Saved", description: "Changes updated and thought post revised.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error updating article', type: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/founder/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminArticles'] });
      toast({ title: "Thought Archived", description: "Thought article removed from client index.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error deleting article', type: "error" });
    },
  });

  const resetForm = () => {
    setSelectedArticle(null);
    setForm({
      title: '',
      slug: '',
      content: '',
      coverImage: '',
      status: 'PUBLISHED',
    });
  };

  const handleEdit = (art: any) => {
    setSelectedArticle(art);
    setForm({
      title: art.title,
      slug: art.slug,
      content: art.content,
      coverImage: art.coverImage || '',
      status: art.status,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Archive Founder's Thought",
      description: "Are you sure you want to delete this thought article? This action cannot be undone.",
      confirmText: "Delete Article",
      variant: "danger"
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (val: string) => {
    setForm({
      ...form,
      title: val,
      slug: generateSlug(val),
    });
  };

  const handleSubmit = () => {
    if (!form.title || !form.content || !form.slug) {
      toast({ title: "Inputs Required", description: "Title, slug, and content are required.", type: "warning" });
      return;
    }

    if (selectedArticle) {
      updateMutation.mutate({ id: selectedArticle.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
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
              Corporate Vision
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-brand-600 dark:text-brand-400" /> Founder's Thoughts Editor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Compose and publish thoughts, announcements, and vision statement documents.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsOpen(true); }}
          className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-theme-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Plus size={16} /> Write Founder's Thought
        </button>
      </div>

      {/* Grid of Articles Table */}
      <div className="app-card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Loading thought archives...</p>
          </div>
        ) : articles?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-600" />
            <p className="text-sm font-semibold">No Thoughts Written</p>
            <p className="text-xs text-gray-400 mt-0.5">Click "Write Founder's Thought" to record your first vision post.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Title / Slug</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Publication Period</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300 font-medium">
                {articles?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{a.title}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">/{a.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${
                        a.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1 select-none">
                      <button onClick={() => handleEdit(a)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer inline-flex items-center justify-center" title="Edit"><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 rounded-lg text-gray-500 transition-all cursor-pointer inline-flex items-center justify-center" title="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full shadow-theme-xl relative overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800 my-auto"
            >
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/80">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{selectedArticle ? "Edit Founder's Thought" : "Write Founder's Thought"}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Draft thought updates for all shareholder portals</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all cursor-pointer"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Thought Title *</label>
                  <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Q3 Leadership Statement" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">URL Slug *</label>
                    <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg font-mono text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="q3-leadership-statement" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Publication Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Cover Image URL (Optional)</label>
                  <input type="text" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:outline-none dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="https://..." />
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Thought Body Content *</label>
                  <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={10} className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Dear investors, write vision statements here..." />
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80 flex justify-end gap-2.5 select-none">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-theme-xs cursor-pointer">
                  {selectedArticle ? "Save Thought" : "Publish Thought"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
