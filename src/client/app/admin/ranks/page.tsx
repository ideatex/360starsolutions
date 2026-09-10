"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Award, RefreshCw, ShieldCheck, CheckCircle2, TrendingUp, 
  Users, Layers, ArrowRight, AlertCircle
} from 'lucide-react';

export default function AdminRanksPage() {
  const queryClient = useQueryClient();
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);

  const { data: rankConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['adminRankConfigs'],
    queryFn: async () => {
      const res = await api.get('/ranks/configurations');
      return res.data;
    },
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ranks/recalculate-all');
      return res.data;
    },
    onSuccess: (data) => {
      setRecalcSuccess(`Recalculated ranks for ${data.evaluatedCount} shareholders!`);
      queryClient.invalidateQueries({ queryKey: ['adminRankConfigs'] });
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Rank & Leg Balancing Engine</h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Product 360
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bronze, Silver, Gold, Diamond rank thresholds enforced with authoritative 50/50 Leg Balance rule.
          </p>
        </div>

        <button
          onClick={() => recalcMutation.mutate()}
          disabled={recalcMutation.isPending}
          className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
          {recalcMutation.isPending ? 'Recalculating...' : 'Recalculate All Member Ranks'}
        </button>
      </div>

      {recalcSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{recalcSuccess}</span>
          </div>
          <button onClick={() => setRecalcSuccess(null)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* 50/50 Leg Balance Principle Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-primary/15 via-brand-primary/5 to-card border border-brand-primary/20 space-y-2">
        <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Authoritative 50/50 Leg Balance Rule
        </div>
        <h3 className="text-base font-extrabold text-foreground">How Product 360 Rank Qualification Works</h3>
        <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed font-medium">
          A shareholder’s single strongest leg (direct referral subtree with maximum volume) can contribute at most <strong>50%</strong> of the required threshold. The remaining legs combined must supply at least the other <strong>50%</strong>. This guarantees genuine organizational breadth and prevents single-line piggybacking.
        </p>
      </div>

      {/* Rank Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingConfigs ? (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 bg-secondary/40 rounded-2xl animate-pulse"></div>
          ))
        ) : (
          rankConfigs?.map((r: any) => {
            const req = Number(r.requiredVolume);
            const half = req * 0.50;

            const badgeColor = 
              r.name === 'Diamond' ? 'bg-sky-500/10 text-sky-500 border-sky-500/30' :
              r.name === 'Gold' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
              r.name === 'Silver' ? 'bg-slate-400/10 text-slate-300 border-slate-400/30' :
              'bg-orange-600/10 text-orange-500 border-orange-600/30';

            return (
              <div key={r.id} className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4 hover:border-brand-primary/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
                    {r.name}
                  </span>
                  <Award className="w-5 h-5 text-muted-foreground" />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Target Team Volume</span>
                  <p className="text-2xl font-black text-foreground tracking-tight">
                    ₹{req.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border text-[11px] font-semibold text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Strongest Leg Max (50%):</span>
                    <span className="text-foreground font-bold font-mono">₹{half.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Other Legs Min (50%):</span>
                    <span className="text-foreground font-bold font-mono">₹{half.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
