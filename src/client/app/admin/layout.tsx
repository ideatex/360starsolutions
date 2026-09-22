"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const shareholder = useAuthStore((state) => state.shareholder);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!shareholder) {
      router.replace('/auth/login');
    } else if (shareholder.role !== 'ADMIN' && shareholder.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [shareholder, isHydrated, router]);

  if (!isHydrated || !shareholder || (shareholder.role !== 'ADMIN' && shareholder.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Sidebar />
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-68'
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
