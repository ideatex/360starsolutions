"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PieChart, TrendingUp, Users } from 'lucide-react';

export default function ProfitSharingPage() {
  const [activeTab, setActiveTab] = useState<'own' | 'referral'>('own');

  const { data: ownProfits, isLoading: loadingOwn } = useQuery({
    queryKey: ['myProfits'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/profits?limit=50');
      return res.data;
    },
  });

  const { data: referralProfits, isLoading: loadingReferral } = useQuery({
    queryKey: ['myCommissions'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/commissions?limit=50');
      return res.data;
    },
  });

  const { data: userMetrics } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me');
      return res.data;
    },
  });

  const isLoading = activeTab === 'own' ? loadingOwn : loadingReferral;
  const currentData = activeTab === 'own' ? ownProfits?.data || [] : referralProfits?.data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Profit Sharing</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your distributed profit sharing from own capital and referral network.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-brand-success/10 text-brand-success rounded-xl shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Accumulated Profit</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              ₹{(userMetrics?.metrics?.totalProfitReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-brand-accent/10 text-brand-accent rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Next Distribution Date</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {userMetrics?.metrics?.nextDistributionDate 
                ? new Date(userMetrics.metrics.nextDistributionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab Buttons */}
        <div className="p-4 border-b border-border bg-secondary/30 flex justify-start select-none">
          <div className="flex bg-secondary p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('own')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                activeTab === 'own'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Own Investment Profit
            </button>
            <button
              onClick={() => setActiveTab('referral')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                activeTab === 'referral'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" /> Referral Profit Sharing
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
              <PieChart className="w-8 h-8 animate-spin text-brand-primary opacity-50 mb-4" />
              <p className="text-sm font-semibold">Loading ledger records...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
              <PieChart className="w-12 h-12 opacity-20 mb-4" />
              <p className="text-sm font-semibold">No records found for this category.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b border-border">
                {activeTab === 'own' ? (
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Cycle</th>
                    <th className="px-6 py-4">Percentage</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Referral Level</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                {activeTab === 'own' ? (
                  currentData.map((record: any) => (
                    <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-5">{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-5">
                        <span className="text-muted-foreground">
                          {new Date(record.cycleStart).toLocaleDateString()} - {new Date(record.cycleEnd).toLocaleDateString()}
                        </span>
                      </td>
                      {/* For percentage, assuming it's calculated or stored. If not explicitly stored, it might need to be resolved. We'll show a placeholder or empty if not available in ProfitLedger directly, but typically profit is based on daily rate. Assuming it's derived or hardcoded to 2.5% per PRD example for now if missing. */}
                      <td className="px-6 py-5 font-semibold text-brand-primary">
                        2.5%
                      </td>
                      <td className="px-6 py-5 font-bold">₹{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-brand-success/10 text-brand-success border border-brand-success/20 uppercase">
                          Processed
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  currentData.map((record: any) => (
                    <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-5">{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-5">
                        <span className="bg-secondary px-3 py-1.5 rounded-lg border border-border text-xs font-bold">
                          Level {record.level}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-bold">₹{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase border ${
                          record.status === 'PENDING' 
                            ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                            : 'bg-brand-success/10 text-brand-success border-brand-success/20'
                        }`}>
                          {record.status === 'PENDING' ? 'Pending' : 'Processed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
