"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Network, Info, Award, Users, Eye, X, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Node component displaying referral metadata with Name and Amount
const CustomNode = ({ data }: { data: any }) => {
  const isRoot = data.isRoot;
  const isHighlighted = data.isHighlighted;

  return (
    <div className="relative font-outfit select-none">
      {/* Handles for connections */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-brand-500 !w-2 !h-2"
        />
      )}
      
      <div 
        className={`p-3.5 rounded-2xl bg-white dark:bg-gray-900 border-2 shadow-theme-xs transition-all duration-300 w-56 text-left ${
          isHighlighted 
            ? 'border-brand-500 ring-4 ring-brand-500/10 scale-105 shadow-theme-md' 
            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100 dark:border-gray-800 mb-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none ${
            isRoot 
              ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400' 
              : 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
          }`}>
            {(data.name || data.shareholderId || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-mono truncate">
              {data.shareholderId}
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block" title={data.name}>
              {data.name || 'Unnamed Shareholder'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          <div className="flex justify-between items-center">
            <span>Approved Amount:</span>
            <span className="text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-md">
              ₹{Number(data.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Referral Level:</span>
            <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
              {data.depth === 0 ? 'Root' : `Level ${data.depth}`}
            </span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-brand-500 !w-2 !h-2"
      />
    </div>
  );
};

function ReferralTreeInner() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['referralTree'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/referral-tree');
      return res.data;
    },
    staleTime: 30000,
    retry: 2,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // Search query & highlight path
  const [search, setSearch] = useState('');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);

  const nodeTypes = useMemo(() => ({
    customNode: CustomNode
  }), []);

  // Compute overall network statistics
  const stats = useMemo(() => {
    if (!data) return { totalCount: 0, maxDepth: 0 };
    const downline = data.downline || [];

    const totalCount = downline.length;
    const maxDepth = downline.reduce((max: number, u: any) => Math.max(max, u.relativeDepth || u.depth || 0), 0);

    return { totalCount, maxDepth };
  }, [data]);

  useEffect(() => {
    if (!data || !data.shareholder) return;

    const root = data.shareholder;
    const downline = data.downline || [];

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Find node paths to highlight if search is matched
    const matchedUsers = search.trim() 
      ? downline.filter((u: any) => 
          u.shareholderId?.toLowerCase().includes(search.toLowerCase()) || 
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          (u.customId && u.customId.toLowerCase().includes(search.toLowerCase()))
        )
      : [];

    const highlightedIds = new Set<string>();
    
    // Track matching path ancestors to highlight lineage
    matchedUsers.forEach((mu: any) => {
      highlightedIds.add(mu.id);
      if (mu.materializedPath) {
        const parts = mu.materializedPath.split('.');
        parts.forEach((partId: string) => {
          if (partId) highlightedIds.add(partId);
        });
      }
    });

    if (matchedUsers.length > 0) {
      highlightedIds.add(root.id);
    }

    // 1. Add Root Node (You)
    flowNodes.push({
      id: root.id,
      type: 'customNode',
      data: { 
        name: root.name || 'You',
        shareholderId: root.shareholderId, 
        customId: root.customId || 'YOU', 
        amount: root.amount || 0,
        depth: 0,
        isRoot: true,
        isHighlighted: highlightedIds.has(root.id)
      },
      position: { x: 350, y: 50 },
    });

    // 2. Group downline by depth relative to Root (Level 1 = Direct Referrals)
    const depthGroups: Record<number, any[]> = {};
    downline.forEach((u: any) => {
      const calcDepth = u.relativeDepth !== undefined ? u.relativeDepth : (u.depth || 1);
      if (!depthGroups[calcDepth]) depthGroups[calcDepth] = [];
      depthGroups[calcDepth].push(u);
    });

    // 3. Position children nodes horizontally
    Object.keys(depthGroups).forEach((depthStr) => {
      const depth = Number(depthStr);
      const levelUsers = depthGroups[depth];
      const levelY = 50 + depth * 180;
      
      const totalWidth = levelUsers.length * 260;
      const startX = 350 - totalWidth / 2 + 130;
      const step = 260;

      levelUsers.forEach((u: any, idx: number) => {
        const levelX = startX + idx * step;
        const nodeId = u.id;
        const isMatched = highlightedIds.has(nodeId);

        flowNodes.push({
          id: nodeId,
          type: 'customNode',
          data: { 
            name: u.name || u.shareholderId,
            shareholderId: u.shareholderId, 
            customId: u.customId || u.shareholderId, 
            amount: u.amount || 0,
            depth: u.relativeDepth || depth,
            isRoot: false,
            isHighlighted: isMatched
          },
          position: { x: levelX, y: levelY },
        });

        // Determine parent connection path safely
        let parentId = root.id;
        if (u.parentId && (u.parentId === root.id || downline.some((dl: any) => dl.id === u.parentId))) {
          parentId = u.parentId;
        } else if (u.materializedPath) {
          const parts = u.materializedPath.split('.');
          const myParentId = parts[parts.length - 1];
          if (myParentId && (myParentId === root.id || downline.some((dl: any) => dl.id === myParentId))) {
            parentId = myParentId;
          }
        }

        // Draw edge connections
        const edgeIsHighlighted = isMatched && highlightedIds.has(parentId);
        flowEdges.push({
          id: `e-${parentId}-${u.id}`,
          source: parentId,
          target: u.id,
          animated: edgeIsHighlighted,
          style: { 
            stroke: edgeIsHighlighted ? 'var(--color-brand-500, #465fff)' : '#e4e7ec', 
            strokeWidth: edgeIsHighlighted ? 2.5 : 1.5 
          },
        });
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, search, setNodes, setEdges]);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeDetails(node.data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center space-y-4 font-outfit">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-white">Loading Referral Network...</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Retrieving account downline lineage and volume statistics.</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.shareholder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center space-y-4 font-outfit">
        <div className="p-3 bg-error-50 dark:bg-error-500/15 text-error-600 dark:text-error-400 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-white">Unable to Load Referral Tree</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Please verify network connectivity or session status.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition-all flex items-center gap-2 cursor-pointer shadow-theme-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-full w-full font-outfit">
      {/* Toolbar & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Name or Shareholder ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs focus:outline-none focus:border-brand-500 text-gray-900 dark:text-white font-medium"
          />
        </div>

        {/* Dynamic statistics overview */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Users className="w-4 h-4 text-brand-500" />
            <span>Downline: {stats.totalCount}</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Award className="w-4 h-4 text-brand-500" />
            <span>Max Level: {stats.maxDepth}</span>
          </div>
        </div>
      </div>

      {/* Main Flow Canvas Container */}
      <div className="relative flex-1 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-950/40 overflow-hidden flex flex-col xl:flex-row gap-4 p-4">
        <div className="flex-1 w-full h-[600px] rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={(instance) => instance.fitView({ padding: 0.3 })}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-800 !rounded-xl overflow-hidden"
            />
            <Background gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* Selected Node Details Drawer */}
        <AnimatePresence>
          {selectedNodeDetails && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full xl:w-72 app-card p-5 flex flex-col justify-between h-fit space-y-4"
            >
              <div className="space-y-3.5">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-500" /> Shareholder Details
                  </h3>
                  <button 
                    onClick={() => setSelectedNodeDetails(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3 text-xs select-none">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Shareholder Name</span>
                    <strong className="text-gray-900 dark:text-white text-sm block mt-0.5">{selectedNodeDetails.name || 'Unnamed'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Shareholder ID</span>
                    <span className="text-gray-800 dark:text-gray-200 font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 inline-block mt-0.5">
                      {selectedNodeDetails.shareholderId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Approved Amount</span>
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-sm block mt-0.5">
                      ₹{Number(selectedNodeDetails.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">Referral Level</span>
                    <span className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {selectedNodeDetails.depth === 0 ? 'Root Account' : `Level ${selectedNodeDetails.depth}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500 flex gap-2 items-start leading-normal select-none">
                <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <p>Path trace outlines lineage from the selected shareholder to your account root.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ReferralTree() {
  return (
    <ReactFlowProvider>
      <ReferralTreeInner />
    </ReactFlowProvider>
  );
}
