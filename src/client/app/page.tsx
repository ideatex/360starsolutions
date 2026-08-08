"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function RootPage() {
  const router = useRouter();
  const shareholder = useAuthStore((state) => state.shareholder);

  useEffect(() => {
    if (shareholder) {
      router.replace('/dashboard/home');
    } else {
      router.replace('/auth/login');
    }
  }, [shareholder, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
