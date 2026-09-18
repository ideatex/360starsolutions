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
      <div className="space-y-6 max-w-3xl mx-auto font-outfit">
        <button
          onClick={() => setSelectedSlug(null)}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold transition-all bg-white dark:bg-gray-900 shadow-theme-xs cursor-pointer select-none text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft size={14} /> Back to letters
        </button>

        {isDetailLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 app-card">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Opening letter...</p>
          </div>
        ) : articleDetail ? (
          <motion.article 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="app-card overflow-hidden"
          >
            {articleDetail.coverImage ? (
              <img src={articleDetail.coverImage} alt={articleDetail.title} className="w-full h-64 md:h-80 object-cover" />
            ) : (
              <div className="w-full h-44 bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-400">
                <Image className="w-10 h-10 opacity-25" />
              </div>
            )}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide select-none">
                <span className="badge-brand">FOUNDER BULLETIN</span>
                <span>{new Date(articleDetail.createdAt).toLocaleDateString()}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{articleDetail.title}</h1>
              <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-xs sm:text-sm font-outfit space-y-4 whitespace-pre-line">
                {articleDetail.content}
              </div>
            </div>
          </motion.article>
        ) : (
          <div className="text-center py-12 text-gray-400 app-card">Letter entry not found.</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-outfit">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-500 shrink-0" /> Founder's Thoughts
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Weekly letters, core company visions, and updates from the CRM leadership team.</p>
      </div>

      {/* Grid of Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isListLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Reading letters feed...</p>
          </div>
        ) : articles?.length === 0 ? (
          <div className="col-span-full text-center py-20 text-gray-400 app-card select-none">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-400 animate-pulse" />
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No letters posted yet.</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Please check back later for updates from CRM founder.</p>
          </div>
        ) : (
          articles?.map((a: any) => (
            <div key={a.id} className="app-card overflow-hidden flex flex-col justify-between hover:shadow-theme-md transition-all duration-200">
              {a.coverImage ? (
                <img src={a.coverImage} alt={a.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-400">
                  <Image className="w-8 h-8 opacity-25" />
                </div>
              )}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 tracking-wider uppercase block mb-1">Weekly Thoughts</span>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 text-sm">{a.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">{a.content}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mt-4 text-[11px] select-none">
                  <span className="text-gray-400 dark:text-gray-500 font-medium">{new Date(a.createdAt).toLocaleDateString()}</span>
                  <button 
                    onClick={() => setSelectedSlug(a.slug)}
                    className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer text-xs"
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
