"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { FileText, Calendar, ArrowLeft, Image, ArrowRight, BookOpen, Loader2 } from 'lucide-react';

export default function DashboardFounderThoughtsPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Fetch all articles
  const { data: articles, isLoading: isListLoading } = useQuery({
    queryKey: ['founderArticles'],
    queryFn: async () => {
      const res = await api.get('/founder/articles');
      return res.data;
    },
  });

  // Fetch single article detail
  const { data: articleDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['founderArticleDetail', selectedSlug],
    queryFn: async () => {
      const res = await api.get(`/founder/articles/${selectedSlug}`);
      return res.data;
    },
    enabled: !!selectedSlug,
  });

  // Reading Mode detailed view
  if (selectedSlug) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedSlug(null)}
          className="flex items-center gap-1.5 px-4 py-2 border border-border-subtle hover:bg-muted dark:hover:bg-secondary rounded-xl text-xs font-bold transition-all bg-white dark:bg-card shadow-sm cursor-pointer select-none"
        >
          <ArrowLeft size={14} /> Back to letters
        </button>

        {isDetailLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground bg-white dark:bg-card rounded-3xl border border-border-subtle">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <p className="text-xs font-semibold">Opening letters...</p>
          </div>
        ) : articleDetail ? (
          <motion.article 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white dark:bg-card rounded-3xl overflow-hidden border border-border-subtle shadow-sm overflow-hidden"
          >
            {articleDetail.coverImage ? (
              <img src={articleDetail.coverImage} alt={articleDetail.title} className="w-full h-64 md:h-80 object-cover" />
            ) : (
              <div className="w-full h-44 bg-purple-500/5 flex items-center justify-center text-purple-400">
                <Image className="w-10 h-10 opacity-25" />
              </div>
            )}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground tracking-wide select-none">
                <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-md">FOUNDER BULLETIN</span>
                <span>{new Date(articleDetail.createdAt).toLocaleDateString()}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">{articleDetail.title}</h1>
              <div className="h-px bg-border-subtle"></div>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm font-sans space-y-4 whitespace-pre-line">
                {articleDetail.content}
              </div>
            </div>
          </motion.article>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-white dark:bg-card rounded-3xl border">Letter entry not found.</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-650 shrink-0" /> Founder's Thoughts
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Weekly letters, core company visions, and updates from the CRM leadership team.</p>
        </div>
      </div>

      {/* Grid of Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isListLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <p className="text-xs font-semibold">Reading letters feed...</p>
          </div>
        ) : articles?.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted-foreground bg-white dark:bg-card rounded-3xl border border-border-subtle select-none">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-400 animate-pulse" />
            <p className="text-xs font-bold">No letters posted yet.</p>
            <p className="text-[10px] text-muted-foreground/75 mt-0.5">Please check back later for updates from CRM founder.</p>
          </div>
        ) : (
          articles?.map((a: any) => (
            <div key={a.id} className="bg-white dark:bg-card rounded-3xl overflow-hidden border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-premium transition-all duration-200">
              {a.coverImage ? (
                <img src={a.coverImage} alt={a.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 bg-purple-500/5 flex items-center justify-center text-purple-400">
                  <Image className="w-8 h-8 opacity-25" />
                </div>
              )}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 tracking-widest uppercase block mb-1">Weekly Thoughts</span>
                  <h3 className="font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2 text-sm">{a.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{a.content}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border-subtle mt-4 text-[10px] select-none">
                  <span className="text-muted-foreground/80 font-semibold">{new Date(a.createdAt).toLocaleDateString()}</span>
                  <button 
                    onClick={() => setSelectedSlug(a.slug)}
                    className="text-purple-600 dark:text-purple-400 font-extrabold flex items-center gap-1 hover:text-purple-800 transition-colors cursor-pointer"
                  >
                    Read More <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
