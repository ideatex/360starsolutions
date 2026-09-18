"use client";

import React from 'react';
import RecentActivity from '@/components/RecentActivity';

export default function TransactionsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-outfit">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Transactions</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit log of your recent transactions and account events</p>
      </div>
      <div className="app-card p-6">
        <RecentActivity />
      </div>
    </div>
  );
}
