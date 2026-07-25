"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const shareholder = useAuthStore((state) => state.shareholder);
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();

  useEffect(() => {
    if (!shareholder) {
      router.replace('/auth/login');
    } else if (shareholder.role !== 'ADMIN' && shareholder.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [shareholder, router]);

  if (!shareholder || (shareholder.role !== 'ADMIN' && shareholder.role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
