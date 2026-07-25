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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Network, Info, Award, Users, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Node component displaying referral metadata with Name and Amount
const CustomNode = ({ data }: { data: any }) => {
  const isRoot = data.isRoot;
  const isHighlighted = data.isHighlighted;

  return (
    <div className="relative font-sans select-none">
      {/* Handles for connections */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-brand-primary !w-2 !h-2"
        />
      )}
      
      <div 
        className={`p-4 rounded-2xl bg-white dark:bg-card border-2 shadow-sm transition-all duration-300 w-56 text-left ${
          isHighlighted 
            ? 'border-brand-primary ring-4 ring-brand-primary/10 scale-105 shadow-md' 
            : 'border-border-subtle hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-border-subtle mb-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 select-none ${
            isRoot 
              ? 'bg-brand-primary/15 text-brand-primary' 
              : 'bg-brand-accent/15 text-brand-accent'
          }`}>
            {(data.name || data.shareholderId || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block font-mono truncate">
              {data.shareholderId}
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block" title={data.name}>
              {data.name || 'Unnamed Shareholder'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-[10px] text-muted-foreground font-semibold">
          <div className="flex justify-between items-center">
            <span>Approved Amount:</span>
            <span className="text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
              ₹{Number(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Referral Level:</span>
            <span className="text-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
              {data.depth === 0 ? 'Root' : `Level ${data.depth}`}
            </span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-brand-primary !w-2 !h-2"
      />
    </div>
  );
};

export default function ReferralTree() {
  const { data } = useQuery({
    queryKey: ['referralTree'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/referral-tree');
      return res.data;
    },
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
    const root = data.shareholder || {};
    const rootDepth = root.depth || 0;

    const totalCount = downline.length;
    const maxDepth = downline.reduce((max: number, u: any) => Math.max(max, (u.depth || u.relativeDepth || 0) - rootDepth), 0);

    return { totalCount, maxDepth };
  }, [data]);

  useEffect(() => {
    if (!data) return;

    const root = data.shareholder;
    const downline = data.downline || [];
    const rootDepth = root.depth || 0;

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

    // 2. Group downline by depth relative to Root
    const depthGroups: Record<number, any[]> = {};
    downline.forEach((u: any) => {
      const d = (u.relativeDepth !== undefined ? u.relativeDepth : u.depth) - rootDepth;
      const calcDepth = d > 0 ? d : 1;
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

        // Determine parent connection path
        let parentId = root.id;
        if (u.materializedPath) {
          const parts = u.materializedPath.split('.');
          const myParentId = parts[parts.length - 1];
          if (myParentId && myParentId !== root.id && downline.some((dl: any) => dl.id === myParentId)) {
            parentId = myParentId;
          }
        } else if (u.parentId) {
          parentId = u.parentId;
        }

        // Draw edge connections
        const edgeIsHighlighted = isMatched && highlightedIds.has(parentId);
        flowEdges.push({
          id: `e-${parentId}-${u.id}`,
          source: parentId,
          target: u.id,
          animated: edgeIsHighlighted,
          style: { 
            stroke: edgeIsHighlighted ? 'var(--brand-primary)' : 'var(--border-subtle)', 
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

  return (
    <div className="space-y-6 flex flex-col h-full w-full">
      {/* Toolbar & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search Name or Shareholder ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary bg-background"
          />
        </div>

        {/* Dynamic statistics overview */}
        <div className="flex items-center gap-3">
          <div className="bg-card border border-border px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-primary" />
            <span>Downline: {stats.totalCount}</span>
          </div>
          <div className="bg-card border border-border px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-accent" />
            <span>Max Level: {stats.maxDepth}</span>
          </div>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="relative flex-1 min-h-[500px] border border-border rounded-2xl bg-muted/20 overflow-hidden flex flex-col xl:flex-row gap-4 p-4">
        <div className="flex-1 w-full h-[500px] xl:h-auto rounded-xl overflow-hidden relative border border-border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-card !border-border !rounded-xl overflow-hidden"
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
              className="w-full xl:w-72 bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between h-fit"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-primary" /> Shareholder Inspector
                  </h3>
                  <button 
                    onClick={() => setSelectedNodeDetails(null)}
                    className="p-1 hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4 text-sm select-none">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase mb-1">Shareholder Name</span>
                    <strong className="text-foreground text-base block">{selectedNodeDetails.name || 'Unnamed'}</strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase mb-1">Shareholder ID</span>
                    <span className="text-foreground font-mono font-bold bg-muted px-2 py-0.5 rounded border border-border inline-block">
                      {selectedNodeDetails.shareholderId}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase mb-1">Approved Contribution Amount</span>
                    <span className="text-brand-primary font-bold text-base block">
                      ₹{Number(selectedNodeDetails.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase mb-1">Referral Level</span>
                    <span className="text-foreground bg-secondary px-2.5 py-1 rounded-md border border-border inline-block">
                      {selectedNodeDetails.depth === 0 ? 'Root Account' : `Level ${selectedNodeDetails.depth}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-border text-xs text-muted-foreground flex gap-2 items-start bg-secondary/50 p-3 rounded-xl leading-normal select-none">
                <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <p>Path trace outlines lineage from the selected shareholder to your own account root.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
