"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Check, Loader2, Info, Plus, Trash2, HelpCircle, 
  Play, Network, AlertCircle, ArrowRight, ShieldCheck, FileText, ChevronRight
} from 'lucide-react';

export default function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // General parameters
  const [userIdPrefix, setUserIdPrefix] = useState('USR');
  const [userIdDigits, setUserIdDigits] = useState(6);
  const [userIdStartingNumber, setUserIdStartingNumber] = useState(100001);
  const [autoGenerateUserId, setAutoGenerateUserId] = useState(true);

  // Investor configs
  const [profitSharingPercentage, setProfitSharingPercentage] = useState('5'); // own profit %

  // Distribution cycle
  const [distributionFrequency, setDistributionFrequency] = useState('Twice Monthly');
  const [cycle1Date, setCycle1Date] = useState('1st');
  const [cycle2Date, setCycle2Date] = useState('16th');

  // Referral levels
  const [levelsCount, setLevelsCount] = useState(7);
  const [levelOpeningVolumes, setLevelOpeningVolumes] = useState<Record<string, string>>({});
  const [levelWiseProfitSharing, setLevelWiseProfitSharing] = useState<Record<string, string>>({});
  const [levelActiveStates, setLevelActiveStates] = useState<Record<string, boolean>>({});
  const [levelDescriptions, setLevelDescriptions] = useState<Record<string, string>>({});

  // Qualification settings
  const [sequentialQualification, setSequentialQualification] = useState(true);

  // Preview Simulator mock values
  const [simOwnInvestment, setSimOwnInvestment] = useState('50000');
  const [simLevelVolumes, setSimLevelVolumes] = useState<Record<string, string>>({
    "1": "125000",
    "2": "240000",
    "3": "285000",
    "4": "0",
    "5": "0",
    "6": "0",
    "7": "0",
  });

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['adminConfig'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    }
  });

  // Sync state on load
  useEffect(() => {
    if (config) {
      setUserIdPrefix(config.userIdPrefix || 'USR');
      setUserIdDigits(config.userIdDigits || 6);
      setUserIdStartingNumber(config.userIdStartingNumber || 100001);

      const sysDefaults = config.systemDefaults || {};
      setAutoGenerateUserId(sysDefaults.autoGenerateUserId !== false);
      setDistributionFrequency(sysDefaults.distributionFrequency || 'Twice Monthly');
      setCycle1Date(sysDefaults.cycle1Date || '1st');
      setCycle2Date(sysDefaults.cycle2Date || '16th');
      setSequentialQualification(sysDefaults.sequentialLevelQualification !== false);

      // Own profit % (stored as decimal e.g. 0.05)
      setProfitSharingPercentage((Number(config.profitSharingPercentage || 0.05) * 100).toFixed(1));

      // Level maps
      const refSettings = config.referralLevelSettings || {};
      const count = refSettings.levels || 7;
      setLevelsCount(count);

      const activeMap = refSettings.active || {};
      const descMap = refSettings.descriptions || {};
      const volumesMap = config.levelOpeningVolume || {};
      const percentagesMap = config.levelWiseProfitSharing || {};

      const nextActives: Record<string, boolean> = {};
      const nextDescs: Record<string, string> = {};
      const nextVols: Record<string, string> = {};
      const nextSharing: Record<string, string> = {};

      const defaultDescriptions: Record<number, string> = {
        1: 'Direct Referral',
        2: 'Referral of Level 1',
        3: 'Referral of Level 2',
        4: 'Referral of Level 3',
        5: 'Referral of Level 4',
        6: 'Referral of Level 5',
        7: 'Referral of Level 6',
      };

      for (let l = 1; l <= count; l++) {
        const lvlStr = String(l);
        nextActives[lvlStr] = activeMap[lvlStr] !== false;
        nextDescs[lvlStr] = descMap[lvlStr] || defaultDescriptions[l] || `Referral of Level ${l - 1}`;
        nextVols[lvlStr] = volumesMap[lvlStr] !== undefined ? String(volumesMap[lvlStr]) : '10000';
        nextSharing[lvlStr] = percentagesMap[lvlStr] !== undefined ? (Number(percentagesMap[lvlStr]) * 100).toString() : '1';
      }

      setLevelActiveStates(nextActives);
      setLevelDescriptions(nextDescs);
      setLevelOpeningVolumes(nextVols);
      setLevelWiseProfitSharing(nextSharing);
    }
  }, [config]);

  // Update mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.put('/admin/config', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminConfig'] });
      toast({ title: "Configuration Saved", description: "Business configuration parameters have been successfully updated.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error updating config', type: "error" });
    },
  });

  const handleSave = async () => {
    if (!userIdPrefix) {
      toast({ title: "Prefix Required", description: "Shareholder ID prefix cannot be left empty.", type: "warning" });
      return;
    }

    const ok = await confirm({
      title: "Save Business Settings",
      description: "You are about to write a new version of active business parameters. This will affect shareholder ID sequences, levels calculations, and profit distributions.",
      confirmText: "Save & Commit version",
      variant: "success"
    });

    if (!ok) return;

    const mappedOpeningVolumes: Record<string, number> = {};
    const mappedWiseSharing: Record<string, number> = {};
    const mappedActive: Record<string, boolean> = {};
    const mappedDescriptions: Record<string, string> = {};

    for (let l = 1; l <= levelsCount; l++) {
      const lvlStr = String(l);
      mappedOpeningVolumes[lvlStr] = Number(levelOpeningVolumes[lvlStr] || 0);
      mappedWiseSharing[lvlStr] = Number(levelWiseProfitSharing[lvlStr] || 0) / 100; // convert to decimal
      mappedActive[lvlStr] = levelActiveStates[lvlStr] !== false;
      mappedDescriptions[lvlStr] = levelDescriptions[lvlStr] || `Referral of Level ${l - 1}`;
    }

    const payload = {
      userIdPrefix,
      userIdDigits,
      userIdStartingNumber,
      profitSharingPercentage: Number(profitSharingPercentage) / 100, // convert to decimal
      levelOpeningVolume: mappedOpeningVolumes,
      levelWiseProfitSharing: mappedWiseSharing,
      referralLevelSettings: {
        levels: levelsCount,
        active: mappedActive,
        descriptions: mappedDescriptions,
      },
      systemDefaults: {
        autoGenerateUserId,
        distributionFrequency,
        cycle1Date,
        cycle2Date,
        sequentialLevelQualification: sequentialQualification,
      }
    };

    updateConfigMutation.mutate(payload);
  };

  const handleAddLevel = () => {
    const nextL = levelsCount + 1;
    const nextLStr = String(nextL);
    setLevelsCount(nextL);
    setLevelOpeningVolumes({ ...levelOpeningVolumes, [nextLStr]: '100000' });
    setLevelWiseProfitSharing({ ...levelWiseProfitSharing, [nextLStr]: '0.5' });
    setLevelActiveStates({ ...levelActiveStates, [nextLStr]: true });
    setLevelDescriptions({ ...levelDescriptions, [nextLStr]: `Referral of Level ${nextL - 1}` });
    setSimLevelVolumes({ ...simLevelVolumes, [nextLStr]: '0' });
  };

  const handleRemoveLevel = () => {
    if (levelsCount <= 1) return;
    const lastL = levelsCount;
    const lastLStr = String(lastL);
    setLevelsCount(levelsCount - 1);
    
    const nextVols = { ...levelOpeningVolumes };
    const nextSharing = { ...levelWiseProfitSharing };
    const nextActives = { ...levelActiveStates };
    const nextDescs = { ...levelDescriptions };
    const nextSimVols = { ...simLevelVolumes };

    delete nextVols[lastLStr];
    delete nextSharing[lastLStr];
    delete nextActives[lastLStr];
    delete nextDescs[lastLStr];
    delete nextSimVols[lastLStr];

    setLevelOpeningVolumes(nextVols);
    setLevelWiseProfitSharing(nextSharing);
    setLevelActiveStates(nextActives);
    setLevelDescriptions(nextDescs);
    setSimLevelVolumes(nextSimVols);
  };

  // Live division cycle values
  const baseRate = Number(profitSharingPercentage || 0);
  const cyclePayout = baseRate / 2;

  // Simulator Engine Output Calculations
  const calculatedSimulatorResults = (() => {
    const results: any[] = [];
    let previousLevelQualified = true;
    let totalPayout = 0;

    // Check own profit sharing payout
    const ownPayout = Number(simOwnInvestment || 0) * (baseRate / 100);

    for (let l = 1; l <= levelsCount; l++) {
      const lvlStr = String(l);
      const reqVol = Number(levelOpeningVolumes[lvlStr] || 0);
      const currentVol = Number(simLevelVolumes[lvlStr] || 0);
      const isLvlActive = levelActiveStates[lvlStr] !== false;
      const rate = Number(levelWiseProfitSharing[lvlStr] || 0) / 100;

      let status = 'INCOMPLETE';
      let profit = 0;

      if (!isLvlActive) {
        status = 'INACTIVE';
      } else if (sequentialQualification && !previousLevelQualified) {
        status = 'LOCKED';
      } else {
        const isEligible = currentVol >= reqVol;
        if (isEligible) {
          status = 'ELIGIBLE';
          profit = currentVol * rate;
          totalPayout += profit;
        } else {
          status = 'INCOMPLETE';
          previousLevelQualified = false;
        }
      }

      results.push({
        level: l,
        description: levelDescriptions[lvlStr],
        volumeRequired: reqVol,
        currentVolume: currentVol,
        status,
        profit,
      });
    }

    return {
      results,
      ownPayout,
      totalReferralPayout: totalPayout,
      grandTotal: ownPayout + totalPayout,
    };
  })();

  const idPreview = `${userIdPrefix}${String(userIdStartingNumber).padStart(userIdDigits, '0')}`;

  return (
    <div className="space-y-10 max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-card p-6 rounded-3xl border border-border-subtle shadow-sm gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary/5 border border-brand-primary/20 px-3 py-1 rounded-full">
            System Control Panel
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2">
            <Settings className="w-8 h-8 text-brand-primary" /> Business Configuration
          </h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
            Manage dynamic client definitions, own ROI configurations, dynamic payout intervals, levels configs, and qualifiers.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={updateConfigMutation.isPending || isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {updateConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={14} />} Save Active Version
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground bg-white dark:bg-card rounded-3xl border">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <p className="text-xs font-semibold">Retrieving CRM configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns - Inputs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Shareholder Configuration */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 1. Shareholder Configuration
              </h2>
              <p className="text-[10px] text-muted-foreground">Configure global shareholder sequence and auto generation parameters.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Shareholder ID Prefix</label>
                  <input
                    type="text"
                    value={userIdPrefix}
                    onChange={e => setUserIdPrefix(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/20 text-foreground font-bold font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Starting Number</label>
                  <input
                    type="number"
                    value={userIdStartingNumber}
                    onChange={e => setUserIdStartingNumber(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/20 text-foreground font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Length Padding (Digits)</label>
                  <input
                    type="number"
                    value={userIdDigits}
                    onChange={e => setUserIdDigits(Number(e.target.value))}
                    min={3}
                    max={10}
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/20 text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-secondary/15 p-4 rounded-2xl border">
                <div>
                  <span className="text-[10px] font-bold block text-foreground">Auto Generate Shareholder ID</span>
                  <span className="text-[9px] text-muted-foreground">Generate incremental customized IDs automatically on register.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateUserId}
                  onChange={e => setAutoGenerateUserId(e.target.checked)}
                  className="w-4 h-4 text-brand-primary border-border-subtle rounded focus:ring-brand-primary"
                />
              </div>

              <div className="p-3 bg-muted/20 border rounded-2xl text-[10px] text-muted-foreground select-none">
                <span className="font-extrabold uppercase block text-foreground text-[9px] tracking-widest">Next Shareholder ID Preview</span>
                Newly created shareholders will receive the ID: <strong className="font-mono text-xs text-brand-primary mt-1 block">{idPreview}</strong>
              </div>
            </div>

            {/* 2. Investor Configuration */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 2. Investor Configuration
              </h2>
              <p className="text-[10px] text-muted-foreground">Dynamic parameters specifying own ROI and profile activation qualifiers.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Investor Status Mode</label>
                  <input
                    type="text"
                    disabled
                    value="Automatic"
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs dark:bg-secondary/20 text-muted-foreground font-semibold bg-gray-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Investor Qualification Event</label>
                  <input
                    type="text"
                    disabled
                    value="First Approved Contribution Fund"
                    className="w-full px-4 py-2 border border-border-subtle rounded-xl text-xs dark:bg-secondary/20 text-muted-foreground font-semibold bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Own Profit Sharing Percentage (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={profitSharingPercentage}
                    onChange={e => setProfitSharingPercentage(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/20 text-foreground font-bold"
                  />
                  <span className="absolute right-4 top-2 text-xs text-muted-foreground font-extrabold">%</span>
                </div>
              </div>
            </div>

            {/* 3. Profit Distribution Cycle */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 3. Profit Distribution Cycle
              </h2>
              <p className="text-[10px] text-muted-foreground">Adjust how frequently calculations and payout ledgers are processed.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Distribution Frequency</label>
                  <select
                    value={distributionFrequency}
                    onChange={e => setDistributionFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/25 text-foreground font-bold bg-white dark:bg-card"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Twice Monthly">Twice Monthly</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cycle 1 Payout Date</label>
                  <select
                    value={cycle1Date}
                    onChange={e => setCycle1Date(e.target.value)}
                    className="w-full px-3 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/25 text-foreground font-bold bg-white dark:bg-card"
                  >
                    {Array.from({ length: 31 }).map((_, d) => {
                      const suffix = d + 1 === 1 ? 'st' : d + 1 === 2 ? 'nd' : d + 1 === 3 ? 'rd' : 'th';
                      return <option key={d + 1} value={`${d + 1}${suffix}`}>{`${d + 1}${suffix}`}</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cycle 2 Payout Date</label>
                  <select
                    value={cycle2Date}
                    onChange={e => setCycle2Date(e.target.value)}
                    disabled={distributionFrequency !== 'Twice Monthly'}
                    className="w-full px-3 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/25 text-foreground font-bold bg-white dark:bg-card disabled:opacity-50"
                  >
                    {Array.from({ length: 31 }).map((_, d) => {
                      const suffix = d + 1 === 1 ? 'st' : d + 1 === 2 ? 'nd' : d + 1 === 3 ? 'rd' : 'th';
                      return <option key={d + 1} value={`${d + 1}${suffix}`}>{`${d + 1}${suffix}`}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Dynamic Note Display box */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-150 rounded-2xl space-y-2 text-xs select-none">
                <span className="text-[10px] font-bold block text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">payout division rules</span>
                <p className="text-muted-foreground leading-relaxed">
                  Monthly Profit Sharing Percentage will automatically be divided equally among the configured payout cycles.
                </p>
                <div className="flex gap-4 text-[10px] font-bold text-indigo-650 bg-indigo-55/10 border border-indigo-200/20 px-3 py-1.5 rounded-lg w-max">
                  <span>Configured = {baseRate}%</span>
                  <ChevronRight size={12} className="mt-0.5" />
                  <span>Cycle 1 = {cyclePayout}%</span>
                  {distributionFrequency === 'Twice Monthly' && (
                    <>
                      <span>+</span>
                      <span>Cycle 2 = {cyclePayout}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Referral Level Configuration */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 4. Referral Level Configuration
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemoveLevel}
                    disabled={levelsCount <= 1}
                    className="p-2 border border-rose-250 bg-rose-50/10 text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-30"
                    title="Remove Last Level"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={handleAddLevel}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                    title="Add Referral Level"
                  >
                    <Plus size={12} /> Add Level
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Define business qualification volume targets, rates, and descriptions dynamically per depth level.</p>

              {/* Visual flowchart hierarchy */}
              <div className="bg-gray-50/60 dark:bg-secondary/5 border rounded-2xl p-4 overflow-x-auto min-w-0">
                <div className="flex items-center gap-3 select-none min-w-[700px] py-1">
                  <div className="p-3 bg-indigo-50 border text-center rounded-xl min-w-[90px]">
                    <span className="text-[8px] font-extrabold uppercase text-gray-400 block tracking-widest">Level 0</span>
                    <span className="text-[10px] font-bold text-indigo-700 block mt-0.5">Investor</span>
                  </div>
                  {Array.from({ length: levelsCount }).map((_, i) => {
                    const level = i + 1;
                    const isActive = levelActiveStates[String(level)] !== false;
                    return (
                      <React.Fragment key={level}>
                        <ArrowRight size={14} className="text-muted-foreground/30 shrink-0" />
                        <div className={`p-3 border text-center rounded-xl min-w-[100px] transition-all ${
                          isActive 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20'
                            : 'bg-gray-100 border-dashed border-gray-250 opacity-50 text-gray-400'
                        }`}>
                          <span className="text-[8px] font-extrabold uppercase block tracking-widest">Level {level}</span>
                          <span className="text-[10px] font-bold block mt-0.5 truncate max-w-[85px]" title={levelDescriptions[String(level)]}>
                            {levelDescriptions[String(level)] || 'Referral'}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Configuration level table */}
              <div className="overflow-x-auto border border-border-subtle rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/15 border-b border-border-subtle text-muted-foreground text-[9px] font-bold uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-4 py-3 w-16">Level</th>
                      <th className="px-4 py-3">Description Name</th>
                      <th className="px-4 py-3 w-40">Volume Target ($)</th>
                      <th className="px-4 py-3 w-28">Sharing %</th>
                      <th className="px-4 py-3 w-16 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-foreground font-semibold">
                    {Array.from({ length: levelsCount }).map((_, i) => {
                      const level = i + 1;
                      const lvlStr = String(level);
                      return (
                        <tr key={level} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 select-none">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                              L{level}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={levelDescriptions[lvlStr] || ''}
                              onChange={e => setLevelDescriptions({ ...levelDescriptions, [lvlStr]: e.target.value })}
                              placeholder={`Level ${level} description`}
                              className="w-full px-2.5 py-1 border border-border-subtle rounded-lg text-xs focus:outline-none dark:bg-secondary/10"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={levelOpeningVolumes[lvlStr] || ''}
                              onChange={e => setLevelOpeningVolumes({ ...levelOpeningVolumes, [lvlStr]: e.target.value })}
                              placeholder="0"
                              className="w-full px-2.5 py-1 border border-border-subtle rounded-lg text-xs font-mono font-bold focus:outline-none dark:bg-secondary/10"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={levelWiseProfitSharing[lvlStr] || ''}
                                onChange={e => setLevelWiseProfitSharing({ ...levelWiseProfitSharing, [lvlStr]: e.target.value })}
                                placeholder="0"
                                className="w-full pl-2.5 pr-6 py-1 border border-border-subtle rounded-lg text-xs font-bold focus:outline-none dark:bg-secondary/10"
                              />
                              <span className="absolute right-2.5 top-1 text-[10px] text-gray-400 font-extrabold">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={levelActiveStates[lvlStr] !== false}
                              onChange={e => setLevelActiveStates({ ...levelActiveStates, [lvlStr]: e.target.checked })}
                              className="w-3.5 h-3.5 text-brand-primary border-border-subtle rounded focus:ring-brand-primary"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Level Qualification Rule */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 5. Level Qualification Rule
              </h2>
              <p className="text-[10px] text-muted-foreground">Configure sequence locking behavior for higher payout depth levels.</p>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-secondary/15 p-4 rounded-2xl border">
                <div>
                  <span className="text-[10px] font-bold block text-foreground">Sequential Level Qualification</span>
                  <span className="text-[9px] text-muted-foreground">Higher levels remain locked if any lower level fails target business volumes.</span>
                </div>
                <input
                  type="checkbox"
                  checked={sequentialQualification}
                  onChange={e => setSequentialQualification(e.target.checked)}
                  className="w-4 h-4 text-brand-primary border-border-subtle rounded focus:ring-brand-primary"
                />
              </div>

              {/* Locked qualification flow example */}
              <div className="p-4 bg-muted/20 border border-border-subtle rounded-2xl space-y-3">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block select-none">Qualifying flow behavior preview</span>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold select-none">
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 1 âœ”
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30" />
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 2 âœ”
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30" />
                  <div className="bg-amber-50 border border-amber-250 text-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 3 âœ–
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30" />
                  <div className="bg-gray-100 border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1 opacity-60">
                    Level 4 Locked ðŸ”’
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30" />
                  <div className="bg-gray-100 border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1 opacity-60">
                    Level 5-7 Locked ðŸ”’
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Profit Calculation Rule */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 6. Profit Calculation Rule
              </h2>
              <p className="text-[10px] text-muted-foreground">Formula block indicating own and dynamic referral downline commissions.</p>

              <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl space-y-2 select-none">
                <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider block">Investor Profit Formula</span>
                <div className="font-mono text-xs font-bold text-gray-900 dark:text-white leading-relaxed flex flex-wrap gap-1.5 items-center bg-white dark:bg-card/40 p-3 border rounded-xl shadow-inner">
                  <span>Investor Profit = Own Profit</span>
                  {Array.from({ length: Math.min(levelsCount, 7) }).map((_, i) => (
                    <span key={i} className="flex gap-1.5">
                      <span>+</span>
                      <span className="text-brand-primary">Level {i + 1} Profit</span>
                    </span>
                  ))}
                  {levelsCount > 7 && (
                    <>
                      <span>+</span>
                      <span className="italic text-muted-foreground">... up to Level {levelsCount}</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-2.5">
                  Each level is included only if: Business Volume Achieved AND Previous Levels Qualified (if sequential check is enabled).
                </p>
              </div>
            </div>

          </div>

          {/* Right Column - Simulator Preview & Rules Summary */}
          <div className="space-y-8">
            
            {/* 7. Qualification Preview */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-5 flex flex-col h-[530px] overflow-hidden">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span> 7. Qualification Preview
              </h2>
              <p className="text-[10px] text-muted-foreground shrink-0">Test dynamic rule overrides in real-time before saving.</p>

              {/* Simulator Inputs */}
              <div className="space-y-3 shrink-0 border-b pb-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Mock Own Investment ($)</label>
                  <input
                    type="number"
                    value={simOwnInvestment}
                    onChange={e => setSimOwnInvestment(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-secondary/20 text-foreground font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto pr-1">
                  {Array.from({ length: levelsCount }).map((_, i) => {
                    const level = i + 1;
                    const lvlStr = String(level);
                    return (
                      <div key={level} className="space-y-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Level {level} Vol ($)</label>
                        <input
                          type="number"
                          value={simLevelVolumes[lvlStr] || '0'}
                          onChange={e => setSimLevelVolumes({ ...simLevelVolumes, [lvlStr]: e.target.value })}
                          className="w-full px-2.5 py-1 border border-border-subtle rounded-lg text-[11px] font-semibold focus:outline-none dark:bg-secondary/10 text-foreground font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulator Output Flow */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 font-semibold text-[11px]">
                {/* Own ROI */}
                <div className="p-3 border rounded-2xl bg-indigo-50/30 border-indigo-200 dark:bg-indigo-950/20 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded tracking-widest">Own Investment</span>
                    <strong className="text-gray-900 dark:text-white block mt-1.5">Vol: ${Number(simOwnInvestment || 0).toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider block">âœ” Qualified</span>
                    <strong className="text-brand-primary text-xs mt-1 block">+${calculatedSimulatorResults.ownPayout.toFixed(2)}</strong>
                  </div>
                </div>

                {calculatedSimulatorResults.results.map((r: any) => (
                  <div key={r.level} className={`p-3 border rounded-2xl flex justify-between items-center ${
                    r.status === 'ELIGIBLE' 
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20'
                      : r.status === 'LOCKED'
                      ? 'bg-gray-150 border-gray-250 opacity-60 text-gray-400'
                      : 'bg-amber-50/50 border-amber-250 text-amber-950 dark:bg-amber-950/20'
                  }`}>
                    <div>
                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        r.status === 'ELIGIBLE' 
                          ? 'bg-green-100 text-green-700' 
                          : r.status === 'LOCKED'
                          ? 'bg-gray-200 text-gray-650'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        Level {r.level} {r.status === 'LOCKED' && 'ðŸ”’'}
                      </span>
                      <strong className="block mt-1.5 text-foreground">Vol: ${Number(r.currentVolume).toLocaleString()}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block">Min Target: ${r.volumeRequired.toLocaleString()}</span>
                      <strong className="text-brand-primary text-xs mt-1 block">
                        {r.status === 'ELIGIBLE' ? `+$${r.profit.toFixed(2)}` : r.status === 'LOCKED' ? 'Locked' : 'Ineligible'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total simulated earnings */}
              <div className="border-t border-border-subtle pt-4 shrink-0 flex justify-between items-center select-none">
                <div>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest block">Simulated Total Payout</span>
                  <strong className="text-2xl text-emerald-600 font-extrabold">${calculatedSimulatorResults.grandTotal.toFixed(2)}</strong>
                </div>
                <span className="text-[10px] text-muted-foreground italic">Simulation Only</span>
              </div>
            </div>

            {/* 8. Business Rules Summary */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border-subtle p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3">
                <FileText size={16} className="text-brand-primary" /> 8. Business Rules Summary
              </h2>
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {[
                  { r: 'Rule 1', text: 'A shareholder becomes an Investor only after the first Approved Contribution Fund.' },
                  { r: 'Rule 2', text: 'Only Investors receive Own Profit Sharing.' },
                  { r: 'Rule 3', text: 'Referral Profit Sharing is calculated according to configured Referral Levels.' },
                  { r: 'Rule 4', text: 'Business Volume must be achieved individually for every level.' },
                  { r: 'Rule 5', text: 'Levels are evaluated sequentially.' },
                  { r: 'Rule 6', text: 'If one level fails to qualify, all subsequent levels remain locked.' },
                  { r: 'Rule 7', text: 'Business Volume and Profit Sharing Percentage are independently configurable for every level.' },
                  { r: 'Rule 8', text: 'Profit Sharing is calculated twice every month.' },
                  { r: 'Rule 9', text: 'Every Investor is treated as the root of their own independent referral tree for profit-sharing calculations.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-normal select-none">
                    <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 px-2 py-0.5 rounded h-max tracking-wider shrink-0 uppercase">
                      {item.r}
                    </span>
                    <p className="text-muted-foreground font-medium text-[11px]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
