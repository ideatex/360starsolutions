"use client";

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const dataSets = {
  "30d": [
    { name: 'Week 1', ROI: 1200, Rewards: 340 },
    { name: 'Week 2', ROI: 1850, Rewards: 620 },
    { name: 'Week 3', ROI: 2400, Rewards: 890 },
    { name: 'Week 4', ROI: 3100, Rewards: 1120 },
  ],
  "7d": [
    { name: 'Mon', ROI: 150, Rewards: 50 },
    { name: 'Tue', ROI: 220, Rewards: 80 },
    { name: 'Wed', ROI: 180, Rewards: 60 },
    { name: 'Thu', ROI: 310, Rewards: 120 },
    { name: 'Fri', ROI: 290, Rewards: 90 },
    { name: 'Sat', ROI: 410, Rewards: 180 },
    { name: 'Sun', ROI: 450, Rewards: 210 },
  ],
  "1y": [
    { name: 'Jan', ROI: 4000, Rewards: 1200 },
    { name: 'Feb', ROI: 5200, Rewards: 1600 },
    { name: 'Mar', ROI: 6100, Rewards: 1850 },
    { name: 'Apr', ROI: 7800, Rewards: 2400 },
    { name: 'May', ROI: 9400, Rewards: 2900 },
    { name: 'Jun', ROI: 11000, Rewards: 3400 },
    { name: 'Jul', ROI: 12800, Rewards: 4100 },
    { name: 'Aug', ROI: 14500, Rewards: 4700 },
    { name: 'Sep', ROI: 16100, Rewards: 5200 },
    { name: 'Oct', ROI: 18000, Rewards: 5900 },
    { name: 'Nov', ROI: 19800, Rewards: 6400 },
    { name: 'Dec', ROI: 22400, Rewards: 7100 },
  ]
};

export default function PerformanceChart() {
  const [range, setRange] = useState<"7d" | "30d" | "1y">("30d");

  const currentData = dataSets[range];

  return (
    <div className="space-y-4 flex flex-col h-full w-full">
      {/* Chart controls toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
            <span>ROI Yields</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-accent"></span>
            <span>Commissions</span>
          </div>
        </div>
        
        {/* Toggle list */}
        <div className="flex bg-muted/60 dark:bg-secondary/40 p-1 rounded-xl border border-border-subtle select-none">
          {(["7d", "30d", "1y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                range === r
                  ? "bg-white dark:bg-card text-gray-900 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-[250px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={currentData}
            margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorROI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--brand-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              className="stroke-border dark:stroke-border/40" 
            />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground/80 text-[10px] font-semibold"
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground/80 text-[10px] font-semibold"
              tickFormatter={(value) => `$${value}`}
              dx={-5}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid var(--border-subtle)', 
                backgroundColor: 'var(--card)',
                boxShadow: 'var(--shadow-premium)'
              }}
              labelStyle={{ fontWeight: 800, fontSize: 11, marginBottom: 4, color: 'var(--foreground)' }}
              itemStyle={{ fontSize: 11, fontWeight: 700 }}
              formatter={(value: any, name: any) => [
                `$${Number(value).toLocaleString()}`, 
                name === 'ROI' ? 'ROI Yield' : 'Referral Reward'
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="ROI" 
              stroke="var(--brand-primary)" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorROI)" 
            />
            <Area 
              type="monotone" 
              dataKey="Rewards" 
              stroke="var(--brand-accent)" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorRewards)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
