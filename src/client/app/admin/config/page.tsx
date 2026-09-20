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
  const [levelsCount, setLevelsCount] = useState(12);
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
    "4": "100000",
    "5": "200000",
    "6": "0",
    "7": "0",
    "8": "0",
    "9": "0",
    "10": "0",
    "11": "0",
    "12": "0",
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
      const count = Math.max(12, refSettings.levels || 12);
      setLevelsCount(count);

      const activeMap = refSettings.active || {};
      const descMap = refSettings.descriptions || {};
      const volumesMap = config.levelOpeningVolume || {};
      const percentagesMap = config.levelWiseProfitSharing || {};

      const nextActives: Record<string, boolean> = {};
      const nextDescs: Record<string, string> = {};
      const nextVols: Record<string, string> = {};
      const nextSharing: Record<string, string> = {};

      const defaultOpeningVolumes: Record<number, string> = {
        1: '10000',
        2: '25000',
        3: '50000',
        4: '100000',
        5: '200000',
        6: '500000',
        7: '1000000',
        8: '2000000',
        9: '3000000',
        10: '5000000',
        11: '7500000',
        12: '10000000',
      };

      const defaultSharingPercentages: Record<number, string> = {
        1: '5',
        2: '3',
        3: '2',
        4: '1.5',
        5: '1',
        6: '0.5',
        7: '0.25',
        8: '0.25',
        9: '0.25',
        10: '0.25',
        11: '0.25',
        12: '0.25',
      };

      const defaultDescriptions: Record<number, string> = {
        1: 'Direct Referral',
        2: 'Referral of Level 1',
        3: 'Referral of Level 2',
        4: 'Referral of Level 3',
        5: 'Referral of Level 4',
        6: 'Referral of Level 5',
        7: 'Referral of Level 6',
        8: 'Referral of Level 7',
        9: 'Referral of Level 8',
        10: 'Referral of Level 9',
        11: 'Referral of Level 10',
        12: 'Referral of Level 11',
      };

      for (let l = 1; l <= count; l++) {
        const lvlStr = String(l);
        nextActives[lvlStr] = activeMap[lvlStr] !== false;
        nextDescs[lvlStr] = descMap[lvlStr] || defaultDescriptions[l] || `Referral of Level ${l - 1}`;
        nextVols[lvlStr] = volumesMap[lvlStr] !== undefined ? String(volumesMap[lvlStr]) : (defaultOpeningVolumes[l] || '10000000');
        nextSharing[lvlStr] = percentagesMap[lvlStr] !== undefined 
          ? (Number(percentagesMap[lvlStr]) * 100).toString() 
          : (defaultSharingPercentages[l] || '0.25');
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
    if (levelsCount <= 12) {
      toast({
        title: "Fixed System Levels",
        description: "Levels 1 to 12 are standard fixed system levels. Only additionally added custom levels can be removed.",
        type: "warning"
      });
      return;
    }
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
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Title Header */}
      <div className="app-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              System Control Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-brand-600 dark:text-brand-400" /> Business Configuration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage dynamic client definitions, own ROI configurations, dynamic payout intervals, levels configs, and qualifiers.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={updateConfigMutation.isPending || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-sm font-semibold transition-all shadow-theme-xs cursor-pointer disabled:opacity-50"
        >
          {updateConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />} Save Active Version
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 app-card">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Retrieving CRM configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Shareholder Configuration */}
            <div className="app-card space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  1. Shareholder Configuration
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure global shareholder sequence and auto generation parameters.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Shareholder ID Prefix</label>
                  <input
                    type="text"
                    value={userIdPrefix}
                    onChange={e => setUserIdPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Starting Number</label>
                  <input
                    type="number"
                    value={userIdStartingNumber}
                    onChange={e => setUserIdStartingNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Length Padding (Digits)</label>
                  <input
                    type="number"
                    value={userIdDigits}
                    onChange={e => setUserIdDigits(Number(e.target.value))}
                    min={3}
                    max={10}
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <span className="text-sm font-semibold block text-gray-900 dark:text-white">Auto Generate Shareholder ID</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Generate incremental customized IDs automatically on registration.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateUserId}
                  onChange={e => setAutoGenerateUserId(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-gray-300 dark:border-gray-700 rounded focus:ring-brand-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl text-xs text-gray-600 dark:text-gray-300 select-none">
                <span className="font-bold text-gray-900 dark:text-white text-xs block mb-1">Next Shareholder ID Preview</span>
                Newly created shareholders will receive the ID: <strong className="font-mono text-sm text-brand-600 dark:text-brand-400 mt-1 block">{idPreview}</strong>
              </div>
            </div>

            {/* 2. Investor Configuration */}
            <div className="app-card space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  2. Investor Configuration
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dynamic parameters specifying own ROI and profile activation qualifiers.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Investor Status Mode</label>
                  <input
                    type="text"
                    disabled
                    value="Automatic"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm dark:bg-gray-900/40 text-gray-500 font-semibold bg-gray-50 dark:border-gray-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Investor Qualification Event</label>
                  <input
                    type="text"
                    disabled
                    value="First Approved Contribution Fund"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm dark:bg-gray-900/40 text-gray-500 font-semibold bg-gray-50 dark:border-gray-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Own Profit Sharing Percentage (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={profitSharingPercentage}
                    onChange={e => setProfitSharingPercentage(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-bold"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* 3. Profit Distribution Cycle */}
            <div className="app-card space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  3. Profit Distribution Cycle
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Adjust how frequently calculations and payout ledgers are processed.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Distribution Frequency</label>
                  <select
                    value={distributionFrequency}
                    onChange={e => setDistributionFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold bg-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Twice Monthly">Twice Monthly</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Cycle 1 Payout Date</label>
                  <select
                    value={cycle1Date}
                    onChange={e => setCycle1Date(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold bg-white"
                  >
                    {Array.from({ length: 31 }).map((_, d) => {
                      const suffix = d + 1 === 1 ? 'st' : d + 1 === 2 ? 'nd' : d + 1 === 3 ? 'rd' : 'th';
                      return <option key={d + 1} value={`${d + 1}${suffix}`}>{`${d + 1}${suffix}`}</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Cycle 2 Payout Date</label>
                  <select
                    value={cycle2Date}
                    onChange={e => setCycle2Date(e.target.value)}
                    disabled={distributionFrequency !== 'Twice Monthly'}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold bg-white disabled:opacity-50"
                  >
                    {Array.from({ length: 31 }).map((_, d) => {
                      const suffix = d + 1 === 1 ? 'st' : d + 1 === 2 ? 'nd' : d + 1 === 3 ? 'rd' : 'th';
                      return <option key={d + 1} value={`${d + 1}${suffix}`}>{`${d + 1}${suffix}`}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Dynamic Note Display box */}
              <div className="p-4 bg-brand-50/40 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/40 rounded-xl space-y-2 select-none">
                <span className="text-xs font-bold block text-brand-700 dark:text-brand-300 uppercase tracking-wider">Payout Division Rules</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Monthly Profit Sharing Percentage will automatically be divided equally among the configured payout cycles.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-100/50 dark:bg-brand-900/40 px-3 py-1.5 rounded-lg w-max">
                  <span>Configured = {baseRate}%</span>
                  <ChevronRight size={12} className="shrink-0" />
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
            <div className="app-card space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    4. Referral Level Configuration
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemoveLevel}
                    disabled={levelsCount <= 1}
                    className="p-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-30"
                    title="Remove Last Level"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={handleAddLevel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-theme-xs"
                    title="Add Referral Level"
                  >
                    <Plus size={14} /> Add Level
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Define business qualification volume targets, rates, and descriptions dynamically per depth level.</p>

              {/* Visual flowchart hierarchy */}
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-4 overflow-x-auto min-w-0">
                <div className="flex items-center gap-3 select-none min-w-[700px] py-1">
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-center rounded-xl min-w-[90px]">
                    <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block">Level 0</span>
                    <span className="text-xs font-bold text-brand-700 dark:text-brand-300 block mt-0.5">Investor</span>
                  </div>
                  {Array.from({ length: levelsCount }).map((_, i) => {
                    const level = i + 1;
                    const isActive = levelActiveStates[String(level)] !== false;
                    return (
                      <React.Fragment key={level}>
                        <ArrowRight size={14} className="text-gray-400 shrink-0" />
                        <div className={`p-3 border text-center rounded-xl min-w-[105px] transition-all ${
                          isActive 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300'
                            : 'bg-gray-100 border-dashed border-gray-300 dark:bg-gray-800/40 dark:border-gray-700 opacity-50 text-gray-400'
                        }`}>
                          <span className="text-[10px] font-bold uppercase block">Level {level}</span>
                          <span className="text-xs font-bold block mt-0.5 truncate max-w-[95px]" title={levelDescriptions[String(level)]}>
                            {levelDescriptions[String(level)] || 'Referral'}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Configuration level table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-4 py-3 w-16">Level</th>
                      <th className="px-4 py-3">Description Name</th>
                      <th className="px-4 py-3 w-40">Volume Target (₹)</th>
                      <th className="px-4 py-3 w-28">Sharing %</th>
                      <th className="px-4 py-3 w-16 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-900 dark:text-white font-medium">
                    {Array.from({ length: levelsCount }).map((_, i) => {
                      const level = i + 1;
                      const lvlStr = String(level);
                      return (
                        <tr key={level} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 select-none">
                            <span className="badge-brand">
                              L{level}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={levelDescriptions[lvlStr] || ''}
                              onChange={e => setLevelDescriptions({ ...levelDescriptions, [lvlStr]: e.target.value })}
                              placeholder={`Level ${level} description`}
                              className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={levelOpeningVolumes[lvlStr] || ''}
                              onChange={e => setLevelOpeningVolumes({ ...levelOpeningVolumes, [lvlStr]: e.target.value })}
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-900"
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
                                className="w-full pl-2.5 pr-6 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-900"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs text-gray-400 font-bold">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={levelActiveStates[lvlStr] !== false}
                              onChange={e => setLevelActiveStates({ ...levelActiveStates, [lvlStr]: e.target.checked })}
                              className="w-4 h-4 text-brand-600 border-gray-300 dark:border-gray-700 rounded focus:ring-brand-500 cursor-pointer"
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
            <div className="app-card space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  5. Level Qualification Rule
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure sequence locking behavior for higher payout depth levels.</p>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <span className="text-sm font-semibold block text-gray-900 dark:text-white">Sequential Level Qualification</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Higher levels remain locked if any lower level fails target business volumes.</span>
                </div>
                <input
                  type="checkbox"
                  checked={sequentialQualification}
                  onChange={e => setSequentialQualification(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-gray-300 dark:border-gray-700 rounded focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {/* Locked qualification flow example */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block select-none">Qualifying flow behavior preview</span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold select-none">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 1 ✓
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 2 ✓
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Level 3 ✕
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                  <div className="bg-gray-100 border border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1 opacity-70">
                    Level 4 Locked 🔒
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                  <div className="bg-gray-100 border border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 px-3 py-1.5 rounded-lg flex items-center gap-1 opacity-70">
                    Level 5-12 Locked 🔒
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Profit Calculation Rule */}
            <div className="app-card space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  6. Profit Calculation Rule
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Formula block indicating own and dynamic referral downline commissions.</p>

              <div className="p-4 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-xl space-y-2 select-none">
                <span className="text-xs text-brand-700 dark:text-brand-300 font-bold uppercase tracking-wider block">Investor Profit Formula</span>
                <div className="font-mono text-xs font-bold text-gray-900 dark:text-white leading-relaxed flex flex-wrap gap-1.5 items-center bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 rounded-lg shadow-theme-xs">
                  <span>Investor Profit = Own Profit</span>
                  {Array.from({ length: Math.min(levelsCount, 7) }).map((_, i) => (
                    <span key={i} className="flex gap-1.5">
                      <span>+</span>
                      <span className="text-brand-600 dark:text-brand-400">Level {i + 1} Profit</span>
                    </span>
                  ))}
                  {levelsCount > 7 && (
                    <>
                      <span>+</span>
                      <span className="italic text-gray-400">... up to Level {levelsCount}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal mt-2.5">
                  Each level is included only if: Business Volume Achieved AND Previous Levels Qualified (if sequential check is enabled).
                </p>
              </div>
            </div>

          </div>

          {/* Right Column - Simulator Preview & Rules Summary */}
          <div className="space-y-6">
            
            {/* 7. Qualification Preview */}
            <div className="app-card space-y-5 flex flex-col h-[560px] overflow-hidden">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  7. Qualification Preview
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Test dynamic rule overrides in real-time before saving.</p>

              {/* Simulator Inputs */}
              <div className="space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Mock Own Investment (₹)</label>
                  <input
                    type="number"
                    value={simOwnInvestment}
                    onChange={e => setSimOwnInvestment(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {Array.from({ length: levelsCount }).map((_, i) => {
                    const level = i + 1;
                    const lvlStr = String(level);
                    return (
                      <div key={level} className="space-y-1">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">Level {level} Vol (₹)</label>
                        <input
                          type="number"
                          value={simLevelVolumes[lvlStr] || '0'}
                          onChange={e => setSimLevelVolumes({ ...simLevelVolumes, [lvlStr]: e.target.value })}
                          className="w-full px-2.5 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulator Output Flow */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 font-semibold text-xs custom-scrollbar">
                {/* Own ROI */}
                <div className="p-3 border border-brand-200 dark:border-brand-900/50 rounded-xl bg-brand-50/40 dark:bg-brand-950/20 flex justify-between items-center text-xs">
                  <div>
                    <span className="badge-brand">Own Investment</span>
                    <strong className="text-gray-900 dark:text-white block mt-1.5">Vol: ₹{Number(simOwnInvestment || 0).toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="badge-success block">✓ Qualified</span>
                    <strong className="text-brand-600 dark:text-brand-400 text-xs mt-1 block">+₹{calculatedSimulatorResults.ownPayout.toFixed(2)}</strong>
                  </div>
                </div>

                {calculatedSimulatorResults.results.map((r: any) => (
                  <div key={r.level} className={`p-3 border rounded-xl flex justify-between items-center ${
                    r.status === 'ELIGIBLE' 
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300'
                      : r.status === 'LOCKED'
                      ? 'bg-gray-100/60 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700 opacity-60 text-gray-400'
                      : 'bg-amber-50/50 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        r.status === 'ELIGIBLE' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                          : r.status === 'LOCKED'
                          ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}>
                        Level {r.level} {r.status === 'LOCKED' && '🔒'}
                      </span>
                      <strong className="block mt-1.5 text-gray-900 dark:text-white">Vol: ₹{Number(r.currentVolume).toLocaleString()}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Min Target: ₹{r.volumeRequired.toLocaleString()}</span>
                      <strong className="text-brand-600 dark:text-brand-400 text-xs mt-1 block">
                        {r.status === 'ELIGIBLE' ? `+₹${r.profit.toFixed(2)}` : r.status === 'LOCKED' ? 'Locked' : 'Ineligible'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total simulated earnings */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 shrink-0 flex justify-between items-center select-none">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">Simulated Total Payout</span>
                  <strong className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold">₹{calculatedSimulatorResults.grandTotal.toFixed(2)}</strong>
                </div>
                <span className="text-xs text-gray-400 italic">Simulation Only</span>
              </div>
            </div>

            {/* 8. Business Rules Summary */}
            <div className="app-card space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <FileText size={16} className="text-brand-600 dark:text-brand-400" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  8. Business Rules Summary
                </h2>
              </div>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
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
                    <span className="badge-brand h-max shrink-0">
                      {item.r}
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs">{item.text}</p>
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
