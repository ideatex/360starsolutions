"use client";

import React from 'react';
import RecentActivity from '@/components/RecentActivity';

export default function TransactionsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Transactions</h1>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm max-w-4xl">
        <RecentActivity />
      </div>
    </div>
  );
}
