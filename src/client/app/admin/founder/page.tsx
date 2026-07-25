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
      toast({ title: "Letter Published", description: "The new founder thought letter has been posted.", type: "success" });
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
      toast({ title: "Letter Saved", description: "Changes updated and bulletin revised.", type: "success" });
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
      toast({ title: "Letter Archived", description: "Bulletin letter removed from client index.", type: "success" });
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
      title: "Archive Bulletin Letter",
      description: "Are you sure you want to delete this bulletin article? This action cannot be undone.",
      confirmText: "Delete Letter",
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
      toast({ title: "Inputs Required", description: "Title, slug, and letter content are required.", type: "warning" });
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
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-purple-650" /> Founder's Bulletin Editor
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Compose and publish letters, announcements, and vision statement documents.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsOpen(true); }}
          className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
        >
          <Plus size={14} /> Write Bulletin Letter
        </button>
      </div>

      {/* Grid of Articles Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
            <p className="text-xs font-semibold">Loading bulletin archives...</p>
          </div>
        ) : articles?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-550" />
            <p className="text-xs font-bold">No Letters Written</p>
            <p className="text-[10px] text-muted-foreground/75 mt-0.5">Click "Write Bulletin Letter" to record your first vision post.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Title / Slug</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Publication Period</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs text-gray-700 dark:text-gray-300 font-medium">
                {articles?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-gray-900 dark:text-white">{a.title}</div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">/{a.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border tracking-wider
                        ${a.status === 'PUBLISHED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' : ''}
                        ${a.status === 'DRAFT' ? 'bg-gray-50 dark:bg-secondary/40 text-gray-700 dark:text-gray-300 border-border-subtle' : ''}
                      `}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 select-none">
                      <button onClick={() => handleEdit(a)} className="p-2 hover:bg-muted dark:hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer" title="Edit"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-red-50 hover:text-red-650 rounded-xl text-muted-foreground transition-all cursor-pointer" title="Delete"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white dark:bg-card rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle"
            >
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedArticle ? 'Edit Bulletin Letter' : 'Write Bulletin Letter'}</h3>
                  <p className="text-[10px] text-muted-foreground">Draft letter updates for all shareholder portals</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Letter Title *</label>
                  <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="Q3 Leadership Statement" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL Slug *</label>
                    <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl font-mono text-xs font-semibold focus:outline-none dark:bg-secondary/35" placeholder="q3-leadership-statement" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Publication Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none cursor-pointer">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cover Image URL (Optional)</label>
                  <input type="text" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-secondary/35" placeholder="https://..." />
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Letter Body Content *</label>
                  <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={10} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="Dear investors, write vision statements here..." />
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle bg-muted/10 flex justify-end gap-3 select-none">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2.5 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-gray-500 cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase tracking-wider">
                  {selectedArticle ? 'Save Letter' : 'Publish Letter'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
