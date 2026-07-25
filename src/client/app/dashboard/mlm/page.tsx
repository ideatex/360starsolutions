"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, Award, Coins, Info, CheckCircle2, AlertCircle, Calendar, 
  TrendingUp, Wallet, ShieldAlert, GitBranch, Table, DollarSign, ChevronRight 
} from 'lucide-react';

export default function MlmUserDashboardPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const [activeTab, setActiveTab] = useState<'overview' | 'tree' | 'profit'>('overview');

  // Queries
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['investorProfile'],
    queryFn: async () => {
      const res = await api.get('/investors/me/profile');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['investorTree'],
    queryFn: async () => {
      const res = await api.get('/investors/me/tree');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: eligibilityData, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['investorEligibility'],
    queryFn: async () => {
      const res = await api.get('/investors/me/level-eligibility');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: referralVolData, isLoading: volLoading } = useQuery({
    queryKey: ['investorVolume'],
    queryFn: async () => {
      const res = await api.get('/investors/me/referral-volume');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: ownProfitData, isLoading: ownProfitLoading } = useQuery({
    queryKey: ['ownProfitSummary'],
    queryFn: async () => {
      const res = await api.get('/investors/me/investor-profit-summary');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: referralProfitData, isLoading: refProfitLoading } = useQuery({
    queryKey: ['referralProfitSummary'],
    queryFn: async () => {
      const res = await api.get('/investors/me/referral-profit-summary');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const { data: levelProfitData, isLoading: levelProfitLoading } = useQuery({
    queryKey: ['levelProfitSharing'],
    queryFn: async () => {
      const res = await api.get('/investors/me/level-wise-profit-sharing');
      return res.data;
    },
    enabled: !!shareholder,
  });

  const isLoading = profileLoading || treeLoading || eligibilityLoading || volLoading || ownProfitLoading || refProfitLoading || levelProfitLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold text-sm">Assembling your Investor Profile...</p>
        </div>
      </div>
    );
  }

  const profile = profileData?.profile || {};
  const summary = profileData?.summary || {};
  const ownProfit = ownProfitData?.totalOwnProfit || 0;
  const refProfit = referralProfitData?.totalReferralProfit || 0;
  const teamVolume = referralVolData?.totalReferralVolume || 0;
  const totalApprovedContribution = Number(summary.totalApproved || 0);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {profile.investorType || 'STANDARD'} INVESTOR
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
              profile.status === 'ACTIVE' 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              {profile.status || 'INACTIVE'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-2 flex items-center gap-2">
            Investor Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time status of your contribution funds, business levels, and profit breakdown.</p>
        </div>

        {profile.activatedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Activated on {new Date(profile.activatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border shadow-inner">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Table className="w-4 h-4" /> Overview & Profile
        </button>
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'tree'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <GitBranch className="w-4 h-4" /> Dynamic Referral Tree
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'profit'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Coins className="w-4 h-4" /> Profit History
        </button>
      </div>

      {/* Dynamic Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <Wallet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Contribution Fund</span>
                    <strong className="text-xl text-gray-900 font-extrabold">${totalApprovedContribution.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Own ROI Profit</span>
                    <strong className="text-xl text-gray-900 font-extrabold">${Number(ownProfit).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <Coins className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Referral Profit</span>
                    <strong className="text-xl text-gray-900 font-extrabold">${Number(refProfit).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <Network className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Team Business Volume</span>
                    <strong className="text-xl text-gray-900 font-extrabold">${Number(teamVolume).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Eligibility and Opening Volume Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="text-emerald-600" /> Level Threshold & Eligibility Progress
                </h2>

                {eligibilityData?.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 italic">No level configurations active.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    {eligibilityData?.map((item: any) => {
                      const isLocked = item.status === 'LOCKED';
                      const pct = isLocked ? 0 : Math.min(100, (item.volume / (item.threshold || 1)) * 100);
                      return (
                        <div key={item.level} className={`p-4 border rounded-2xl shadow-sm relative overflow-hidden transition-all ${
                          isLocked 
                            ? 'bg-gray-100/40 border-gray-200 opacity-60 text-gray-400 select-none' 
                            : 'bg-gray-50/40 border-gray-100'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                isLocked
                                  ? 'bg-gray-200 text-gray-500'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                Level {item.level} {isLocked && "ðŸ”’"}
                              </span>
                              <div className={`text-sm font-bold mt-2 ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                                Current Volume: ${Number(item.volume).toLocaleString()}
                              </div>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                              item.status === 'ELIGIBLE' 
                                ? 'bg-green-100 text-green-700' 
                                : isLocked
                                ? 'bg-gray-200 text-gray-600 border border-gray-300/40'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.status || (item.isEligible ? 'ELIGIBLE' : 'INCOMPLETE')}
                            </span>
                          </div>

                          <div className="space-y-1 mt-3">
                            <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                              <span>{isLocked ? 'Locked' : `Progress: ${pct.toFixed(1)}%`}</span>
                              <span>Target: ${Number(item.threshold).toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.status === 'ELIGIBLE' ? 'bg-green-500' : isLocked ? 'bg-gray-300' : 'bg-blue-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {isLocked && (
                              <p className="text-[9px] text-gray-400 italic mt-1.5 flex items-center gap-1">
                                <AlertCircle size={10} /> Locked: A lower depth level failed to qualify.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Level Profit Breakdown & Rates */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Coins className="text-emerald-600" /> Level wise Earnings
                </h2>

                <div className="space-y-4">
                  {levelProfitData?.map((item: any) => (
                    <div key={item.level} className="p-4 rounded-2xl border bg-gray-50/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-800 block">Level {item.level} Commission</span>
                        <span className="text-gray-400 font-semibold block">Rate: {(Number(item.percentage) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-semibold">Total Earned</span>
                        <strong className="text-emerald-600 font-bold text-sm">+${Number(item.totalProfit).toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tree' && (
          <motion.div
            key="tree"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 overflow-x-auto"
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Network className="text-emerald-600" /> Dynamic Virtual Referral Tree
            </h2>
            <p className="text-sm text-gray-400 max-w-2xl">
              This tree is virtually and dynamically evaluated under your independent calculation context. Click parents to toggle branch visibility.
            </p>

            <div className="py-8 flex justify-center w-full min-w-[700px]">
              {treeData ? (
                <TreeNodeComponent node={treeData} />
              ) : (
                <div className="text-gray-400 italic">No referral downline detected.</div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'profit' && (
          <motion.div
            key="profit"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Own Profit (ROI) Ledgers */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Wallet className="text-emerald-600" /> Own ROI Profit History
              </h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {ownProfitData?.history.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No personal ROI payouts registered yet.</p>
                ) : (
                  ownProfitData?.history.map((l: any) => (
                    <div key={l.id} className="p-3.5 rounded-xl border bg-gray-50/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-800 block">Personal Payout</span>
                        <span className="text-[10px] text-gray-400 font-medium block">
                          Cycle: {new Date(l.cycleStart).toLocaleDateString()} - {new Date(l.cycleEnd).toLocaleDateString()} ({l.eligibleDays} days)
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">+${Number(l.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Referral Tree Profit Sharing Ledgers */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Coins className="text-emerald-600" /> Referral profit credits
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {referralProfitData?.history.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No downline profit sharing commissions recorded yet.</p>
                ) : (
                  referralProfitData?.history.map((c: any) => (
                    <div key={c.id} className="p-3.5 rounded-xl border bg-gray-50/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-800 block">Level {c.level} Referral Commission</span>
                        <span className="text-[10px] text-gray-400 font-medium block">
                          Level Volume: ${Number(c.volume).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 text-sm block">+${Number(c.profitAmount).toFixed(2)}</span>
                        <span className="text-[9px] text-gray-400 block">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tree Node UI Component
function TreeNodeComponent({ node }: { node: any }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-3xl border transition-all shadow-sm cursor-pointer min-w-[170px] text-center ${
          node.investorStatus === 'ACTIVE' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70' 
            : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
        } ${node.status === 'DISABLED' || node.status === 'DELETED' ? 'opacity-50' : ''}`}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest block text-emerald-600">
          {node.customId || 'No ID'}
        </span>
        <div className="font-bold text-xs truncate max-w-[140px] mt-1">{node.name || node.shareholderId}</div>
        <div className="text-[9px] text-gray-500 font-semibold mt-1">
          Vol: ${Number(node.contributionsSum || 0).toLocaleString()}
        </div>
        {node.investorStatus === 'ACTIVE' && (
          <span className="mt-2 inline-block text-[8px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            INVESTOR
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="flex flex-col items-center mt-4 w-full">
          {/* Connector Line */}
          <div className="w-0.5 h-4 bg-emerald-200"></div>
          {/* Children nodes container */}
          <div className="flex gap-6 justify-center border-t border-emerald-100 pt-4 w-full px-2">
            {node.children.map((child: any) => (
              <TreeNodeComponent key={child.id} node={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
