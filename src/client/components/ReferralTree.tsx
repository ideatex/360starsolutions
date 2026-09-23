"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Search, Users, Award, TrendingUp, Layers, UserPlus, Share2, 
  Check, Copy, ChevronDown, ChevronRight, X, User, Filter, 
  Sparkles, ShieldCheck, ArrowUpRight, LayoutGrid, ListTree, 
  Table, RefreshCw, AlertCircle, Loader2, ChevronUp, ChevronsUpDown,
  Building, CreditCard, Clock, Info, CheckCircle2, Lock, Unlock,
  HelpCircle, ChevronRightSquare, Target, UserCheck, Phone,
  ZoomIn, ZoomOut, Maximize2, GitBranch, Minimize2, Split
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface DownlineUser {
  id: string;
  shareholderId: string;
  name: string;
  amount: number;
  depth: number;
  relativeDepth?: number;
  parentId?: string | null;
  materializedPath?: string;
  phone?: string;
  createdAt?: string;
  accountType?: string;
}

interface TreeNode {
  id: string;
  shareholderId: string;
  name: string;
  amount: number;
  depth: number;
  parentId?: string | null;
  children: TreeNode[];
}

// ==========================================
// 1. Horizontal Org Tree Node (Top-Down)
// ==========================================
const GenealogyOrgNode = ({
  node,
  searchQuery,
  onSelectNode,
  selectedId,
  isRoot = false,
  allExpanded,
}: {
  node: TreeNode;
  searchQuery: string;
  onSelectNode: (node: TreeNode) => void;
  selectedId?: string;
  isRoot?: boolean;
  allExpanded: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  useEffect(() => {
    setIsExpanded(allExpanded);
  }, [allExpanded]);

  const isMatched = Boolean(
    searchQuery.trim() &&
    (node.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     node.shareholderId?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isSelected = selectedId === node.id;

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsExpanded(true);
    }
  }, [searchQuery]);

  const levelBadge = isRoot
    ? { text: 'ROOT (YOU)', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' }
    : node.depth === 1
    ? { text: 'LEVEL 1 (DIRECT)', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
    : node.depth === 2
    ? { text: 'LEVEL 2', color: 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border-brand-500/30' }
    : node.depth === 3
    ? { text: 'LEVEL 3', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' }
    : { text: `LEVEL ${node.depth}`, color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };

  return (
    <div className="inline-flex flex-col items-center select-none font-outfit px-3">
      {/* Node Card */}
      <div
        onClick={() => onSelectNode(node)}
        className={`relative p-3.5 sm:p-4 rounded-2xl transition-all duration-300 cursor-pointer w-[250px] sm:w-[270px] text-left group shadow-theme-xs ${
          isSelected
            ? 'bg-white dark:bg-gray-900 border-2 border-brand-500 ring-4 ring-brand-500/20 shadow-theme-md scale-105 z-20'
            : isMatched
            ? 'bg-amber-50/90 dark:bg-amber-500/15 border-2 border-amber-400 dark:border-amber-500/50 shadow-theme-sm'
            : isRoot
            ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white dark:to-gray-900 border-2 border-amber-500/50 dark:border-amber-500/40 shadow-theme-sm hover:border-amber-500 hover:shadow-theme-md'
            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-theme-sm'
        }`}
      >
        {/* Top Header Tag */}
        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-mono text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
              {node.shareholderId}
            </span>
          </div>
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${levelBadge.color}`}>
            {levelBadge.text}
          </span>
        </div>

        {/* Member Profile info */}
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-theme-xs ${
            isRoot
              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-400/40'
              : node.depth === 1
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-400/30'
              : 'bg-gradient-to-br from-brand-500 to-brand-600 text-white ring-2 ring-brand-400/30'
          }`}>
            {(node.name || node.shareholderId || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" title={node.name}>
              {node.name || 'Unnamed Shareholder'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Vol:</span>
              <span className="text-[11px] font-extrabold text-brand-600 dark:text-brand-400 font-mono">
                ₹{Number(node.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom stats & toggle */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[10px]">
          <span className="font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Users size={11} className="text-brand-500" />
            {node.children.length} direct{node.children.length === 1 ? '' : 's'}
          </span>

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 dark:hover:text-brand-400 rounded-md font-bold text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              {isExpanded ? (
                <>Hide <ChevronUp size={11} /></>
              ) : (
                <>Show ({node.children.length}) <ChevronDown size={11} /></>
              )}
            </button>
          ) : (
            <span className="text-gray-400 italic">Direct node</span>
          )}
        </div>
      </div>

      {/* Branching Tree Lines & Children Nodes */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center mt-3">
          {/* Vertical connecting line from parent */}
          <div className="w-0.5 h-6 bg-brand-500/40 dark:bg-brand-500/50"></div>

          {/* Children container with horizontal top bar if >1 child */}
          <div className="relative flex items-start gap-4 sm:gap-6 pt-2">
            {node.children.length > 1 && (
              <div 
                className="absolute top-0 h-0.5 bg-brand-500/40 dark:bg-brand-500/50 rounded-full"
                style={{
                  left: 'calc(135px)',
                  right: 'calc(135px)',
                }}
              />
            )}

            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical connecting line down to child */}
                <div className="w-0.5 h-5 bg-brand-500/40 dark:bg-brand-500/50 mb-1"></div>
                <GenealogyOrgNode
                  node={child}
                  searchQuery={searchQuery}
                  onSelectNode={onSelectNode}
                  selectedId={selectedId}
                  allExpanded={allExpanded}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. Vertical Hierarchical List Tree (100% Fully Visible on any screen)
// ==========================================
const VerticalHierarchyItem = ({
  node,
  searchQuery,
  onSelectNode,
  selectedId,
  isRoot = false,
  allExpanded,
}: {
  node: TreeNode;
  searchQuery: string;
  onSelectNode: (node: TreeNode) => void;
  selectedId?: string;
  isRoot?: boolean;
  allExpanded: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  useEffect(() => {
    setIsExpanded(allExpanded);
  }, [allExpanded]);

  const isMatched = Boolean(
    searchQuery.trim() &&
    (node.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     node.shareholderId?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isSelected = selectedId === node.id;

  const levelBadge = isRoot
    ? { text: 'ROOT (YOU)', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' }
    : node.depth === 1
    ? { text: 'LEVEL 1 (DIRECT)', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
    : node.depth === 2
    ? { text: 'LEVEL 2', color: 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border-brand-500/30' }
    : { text: `LEVEL ${node.depth}`, color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };

  return (
    <div className="select-none font-outfit w-full">
      <div 
        onClick={() => onSelectNode(node)}
        className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer group ${
          isSelected 
            ? 'bg-brand-50/90 dark:bg-brand-500/15 border-brand-500 ring-2 ring-brand-500/20 shadow-theme-xs' 
            : isMatched
            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/40 shadow-theme-xs'
            : isRoot
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:to-gray-900 border-amber-500/30 hover:border-amber-500 shadow-theme-xs'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-brand-400 dark:hover:border-gray-700 shadow-theme-xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-gray-300 dark:text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>
          )}

          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
            isRoot 
              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs' 
              : node.depth === 1
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs'
              : 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-xs'
          }`}>
            {(node.name || node.shareholderId || 'U').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {node.name}
              </span>
              <span className="font-mono text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                {node.shareholderId}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${levelBadge.color}`}>
                {levelBadge.text}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block">Volume</span>
            <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400 font-mono bg-brand-50/80 dark:bg-brand-500/15 px-2 py-0.5 rounded-md inline-block">
              ₹{Number(node.amount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {hasChildren && (
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hidden sm:inline-block">
              {node.children.length} {node.children.length === 1 ? 'branch' : 'branches'}
            </span>
          )}
        </div>
      </div>

      {/* Render Children with clean vertical hierarchy guides */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-4 sm:pl-8 mt-2 space-y-2 border-l-2 border-brand-500/30 dark:border-brand-500/40 ml-4 sm:ml-5 overflow-hidden"
          >
            {node.children.map((child) => (
              <VerticalHierarchyItem
                key={child.id}
                node={child}
                searchQuery={searchQuery}
                onSelectNode={onSelectNode}
                selectedId={selectedId}
                allExpanded={allExpanded}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Main Referral Tree UI Component
// ==========================================
export default function ReferralTree() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['referralTree'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/referral-tree');
      return res.data;
    },
    staleTime: 30000,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me');
      return res.data;
    },
  });

  const [activeTab, setActiveTab] = useState<'orgTree' | 'verticalTree' | 'matrix' | 'table'>('orgTree');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const root = data?.shareholder || {};
  const downline: DownlineUser[] = useMemo(() => data?.downline || [], [data]);

  const unlockedLevel = dashboardData?.shareholder?.unlockedLevel || 3;

  // Overall Network Metrics
  const stats = useMemo(() => {
    const totalCount = downline.length;
    const directCount = downline.filter((u: any) => (u.relativeDepth || u.depth) === 1).length;
    const totalVolume = downline.reduce((sum: number, u: any) => sum + Number(u.amount || 0), 0) + Number(root.amount || 0);
    const maxDepth = downline.reduce((max: number, u: any) => Math.max(max, u.relativeDepth || u.depth || 0), 0);

    return { totalCount, directCount, totalVolume, maxDepth };
  }, [downline, root]);

  // Level Matrix breakdown for L1 to L12
  const levelMatrix = useMemo(() => {
    const rates: Record<number, number> = {
      1: 5.0, 2: 3.0, 3: 2.0, 4: 1.5, 5: 1.0, 6: 0.8,
      7: 0.6, 8: 0.5, 9: 0.4, 10: 0.3, 11: 0.2, 12: 0.1
    };

    const maxToShow = Math.max(stats.maxDepth, 4);
    const result = [];

    for (let i = 1; i <= Math.min(maxToShow, 12); i++) {
      const members = downline.filter((u: any) => (u.relativeDepth || u.depth || 1) === i);
      const totalAmount = members.reduce((sum, m) => sum + Number(m.amount || 0), 0);
      const isUnlocked = i <= unlockedLevel;

      result.push({
        level: i,
        rate: rates[i] || 0.5,
        members,
        totalAmount,
        isUnlocked,
      });
    }

    return result;
  }, [downline, stats.maxDepth, unlockedLevel]);

  // Build Hierarchical Tree Object
  const treeRoot = useMemo(() => {
    if (!data || !data.shareholder) return null;

    const nodeMap = new Map<string, TreeNode>();
    
    const rootNode: TreeNode = {
      id: root.id,
      shareholderId: root.shareholderId,
      name: root.name || 'You',
      amount: root.amount || 0,
      depth: 0,
      children: [],
    };
    nodeMap.set(root.id, rootNode);

    downline.forEach((u: any) => {
      nodeMap.set(u.id, {
        id: u.id,
        shareholderId: u.shareholderId,
        name: u.name || u.shareholderId,
        amount: u.amount || 0,
        depth: u.relativeDepth || u.depth || 1,
        parentId: u.parentId,
        children: [],
      });
    });

    downline.forEach((u: any) => {
      const current = nodeMap.get(u.id);
      if (!current) return;

      let parentId = u.parentId;
      if (!parentId || !nodeMap.has(parentId)) {
        if (u.materializedPath) {
          const parts = u.materializedPath.split('.');
          const myParent = parts[parts.length - 1];
          if (myParent && nodeMap.has(myParent)) {
            parentId = myParent;
          }
        }
      }

      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)?.children.push(current);
      } else {
        rootNode.children.push(current);
      }
    });

    return rootNode;
  }, [data, root, downline]);

  const handleCopyId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyReferralLink = () => {
    const link = `https://360star.in/register?ref=${root.shareholderId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered Directory Table Members
  const filteredTableMembers = useMemo(() => {
    return downline.filter((u: any) => {
      const matchSearch = !search.trim() || 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.shareholderId?.toLowerCase().includes(search.toLowerCase());
      
      const matchLevel = selectedLevelFilter === 'all' || 
        (u.relativeDepth || u.depth || 1) === selectedLevelFilter;

      return matchSearch && matchLevel;
    });
  }, [downline, search, selectedLevelFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 font-outfit shadow-theme-xs">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assembling Referral Network...</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Retrieving network genealogy, unlocked tiers, and volumes.</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.shareholder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 font-outfit shadow-theme-xs">
        <div className="p-3 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Unable to Load Referral Tree</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Please verify your session status and retry.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition-all flex items-center gap-2 cursor-pointer shadow-theme-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col w-full font-outfit">
      
      {/* 1. Header Banner & Quick Sponsoring Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-white dark:to-gray-900 p-6 sm:p-8 border border-brand-500/25 shadow-theme-sm">
        <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-brand-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl shadow-theme-md shrink-0 select-none ring-4 ring-brand-500/20">
              {(root.name || root.shareholderId || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="badge-brand">
                  <Sparkles className="w-3 h-3 mr-1" /> Sponsor Code: {root.shareholderId}
                </span>
                <span className="badge-success">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Network Origin
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {root.name} <span className="text-xs text-gray-400 font-normal">(Downline Referral Network)</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                Inspect your genealogy downlines, track team volume generation across tiers, and expand your referral network.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyReferralLink}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-theme-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} className="text-brand-500" />}
              {copiedLink ? 'Link Copied!' : 'Copy Referral Link'}
            </button>
            <Link
              href="/dashboard/signup"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-all shadow-theme-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={14} /> Add Referral
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Downline</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats.totalCount} <span className="text-xs font-normal text-gray-400">Members</span>
            </p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direct Referrals</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.directCount} <span className="text-xs font-normal text-gray-400">Directs (L1)</span>
            </p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Network Volume</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 font-mono">
              ₹{stats.totalVolume.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unlocked Tiers</p>
            <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              Levels 1 to {unlockedLevel}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Network Viewer Card */}
      <div className="app-card p-5 sm:p-7 space-y-6">
        
        {/* Navigation & Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('orgTree')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'orgTree'
                  ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <GitBranch size={15} /> Org Chart Tree
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verticalTree')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'verticalTree'
                  ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ListTree size={15} /> Full Tree Hierarchy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={15} /> Level Matrix (L1–L12)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Table size={15} /> Member Directory
            </button>
          </div>

          {/* Search, Zoom & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs focus:outline-none focus:border-brand-500 text-gray-900 dark:text-white font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeTab === 'orgTree' && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
                  title="Zoom Out"
                  className="p-1.5 hover:bg-white dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-lg text-xs transition-all cursor-pointer"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-mono font-bold px-1 text-gray-700 dark:text-gray-300 min-w-[36px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(2))))}
                  title="Zoom In"
                  className="p-1.5 hover:bg-white dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-lg text-xs transition-all cursor-pointer"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  title="Reset 100%"
                  className="px-2 py-1 hover:bg-white dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            {(activeTab === 'orgTree' || activeTab === 'verticalTree') && (
              <button
                type="button"
                onClick={() => setAllExpanded(!allExpanded)}
                className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-theme-xs"
              >
                <ChevronsUpDown size={14} /> {allExpanded ? 'Collapse Branches' : 'Expand All'}
              </button>
            )}
          </div>
        </div>

        {/* 4. Active Tab Content Area */}
        <div className="relative flex flex-col lg:flex-row gap-6 min-h-[500px]">
          
          {/* TAB 1: ORG CHART TREE (Top-Down with Safe Left-Align Scrollable Container & Zoom) */}
          {activeTab === 'orgTree' && (
            <div className="flex-1 w-full overflow-x-auto overflow-y-visible py-6 px-4 bg-gradient-to-b from-gray-50/40 via-white to-gray-50/20 dark:from-gray-900/30 dark:via-gray-900/10 dark:to-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800 min-h-[480px]">
              {treeRoot ? (
                <div 
                  className="w-full flex justify-center origin-top transition-transform duration-200 min-w-max pb-8"
                  style={{ transform: `scale(${zoomScale})` }}
                >
                  <GenealogyOrgNode
                    node={treeRoot}
                    searchQuery={search}
                    onSelectNode={(node) => setSelectedNodeDetails(node)}
                    selectedId={selectedNodeDetails?.id}
                    isRoot={true}
                    allExpanded={allExpanded}
                  />
                </div>
              ) : (
                <div className="text-center py-16 max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Users size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Start Building Your Downline</h4>
                  <p className="text-xs text-gray-400">Share your referral code to sponsor new partners and unlock Level 1 to 12 gratitude distributions.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL VERTICAL TREE HIERARCHY (100% Fully Visible across all viewports) */}
          {activeTab === 'verticalTree' && (
            <div className="flex-1 w-full p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 space-y-3 max-h-[640px] overflow-y-auto">
              {treeRoot ? (
                <VerticalHierarchyItem
                  node={treeRoot}
                  searchQuery={search}
                  onSelectNode={(node) => setSelectedNodeDetails(node)}
                  selectedId={selectedNodeDetails?.id}
                  isRoot={true}
                  allExpanded={allExpanded}
                />
              ) : (
                <p className="text-xs text-gray-400 text-center py-12">No downline partners registered yet.</p>
              )}
            </div>
          )}

          {/* TAB 3: LEVEL MATRIX BREAKDOWN (L1 - L12) */}
          {activeTab === 'matrix' && (
            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {levelMatrix.map((lvl) => (
                  <div 
                    key={lvl.level}
                    className={`p-5 rounded-2xl border transition-all ${
                      lvl.isUnlocked
                        ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs'
                        : 'border-gray-200/60 dark:border-gray-800/40 bg-gray-50/50 dark:bg-gray-900/40 opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          lvl.isUnlocked
                            ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}>
                          L{lvl.level}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                              Level {lvl.level}
                            </h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              lvl.isUnlocked ? 'badge-success' : 'badge-warning'
                            }`}>
                              {lvl.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Gratitude: <strong className="text-brand-600 dark:text-brand-400">{lvl.rate.toFixed(1)}%</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">Volume</span>
                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                          ₹{lvl.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {lvl.members.length > 0 ? (
                        lvl.members.map((m: any) => (
                          <div 
                            key={m.id}
                            onClick={() => setSelectedNodeDetails(m)}
                            className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-brand-50/40 dark:hover:bg-brand-500/10 hover:border-brand-300 dark:hover:border-brand-500/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{m.name}</p>
                              <p className="text-[10px] font-mono text-gray-400">{m.shareholderId}</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 shrink-0">
                              ₹{Number(m.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-gray-400 italic py-3 text-center">
                          {lvl.isUnlocked ? 'No partners enrolled at this level yet.' : 'Unlock by sponsoring direct referrals.'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MEMBER DIRECTORY */}
          {activeTab === 'table' && (
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
                  <Filter size={13} /> Level:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    selectedLevelFilter === 'all'
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  All ({downline.length})
                </button>
                {levelMatrix.map((lvl) => (
                  <button
                    type="button"
                    key={lvl.level}
                    onClick={() => setSelectedLevelFilter(lvl.level)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedLevelFilter === lvl.level
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Level {lvl.level} ({lvl.members.length})
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-5 py-3.5">Shareholder</th>
                      <th className="px-5 py-3.5">Shareholder ID</th>
                      <th className="px-5 py-3.5">Tier / Level</th>
                      <th className="px-5 py-3.5">Approved Volume</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {filteredTableMembers.length > 0 ? (
                      filteredTableMembers.map((m: any) => (
                        <tr 
                          key={m.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs">
                                {(m.name || m.shareholderId || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span>{m.name || 'Unnamed'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-gray-700 dark:text-gray-300 font-semibold">
                            {m.shareholderId}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="badge-brand font-bold text-[10px]">
                              Level {m.relativeDepth || m.depth || 1}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                            ₹{Number(m.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedNodeDetails(m)}
                              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-brand-500 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                          No partners matching the specified filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Member Profile Inspector Slide-Over / Drawer */}
          <AnimatePresence>
            {selectedNodeDetails && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full lg:w-80 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-md flex flex-col justify-between h-fit space-y-4 shrink-0"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Partner Profile
                      </h3>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedNodeDetails(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Full Name</span>
                      <strong className="text-gray-900 dark:text-white text-sm block mt-0.5">{selectedNodeDetails.name || 'Unnamed'}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Shareholder ID</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-800 dark:text-gray-200 font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 inline-block text-xs">
                          {selectedNodeDetails.shareholderId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(selectedNodeDetails.shareholderId)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-brand-500 transition-colors cursor-pointer"
                          title="Copy ID"
                        >
                          {copiedId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Hierarchy Tier</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block mt-0.5">
                          {selectedNodeDetails.depth === 0 ? 'Root (You)' : `Level ${selectedNodeDetails.depth || selectedNodeDetails.relativeDepth || 1}`}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Investment</span>
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono block mt-0.5">
                          ₹{Number(selectedNodeDetails.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {selectedNodeDetails.children !== undefined && (
                      <div>
                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Direct Referrals</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">
                          {selectedNodeDetails.children.length} direct member{selectedNodeDetails.children.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500 flex gap-2 items-start leading-relaxed">
                  <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <p>Volume directly contributes to Level 1 to 12 gratitude distributions according to company business logic.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
