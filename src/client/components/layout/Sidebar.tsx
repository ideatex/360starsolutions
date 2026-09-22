"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  LayoutDashboard, UserPlus, Megaphone, Network, Target, 
  Landmark, UserCircle, BarChart3, UserCheck, Users, Award, 
  ArrowRightLeft, FileSpreadsheet, FileText, Edit3, Settings, 
  LogOut, ChevronLeft, ChevronRight, ShieldAlert, ArrowLeftRight,
  BookOpen, Bell
} from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const userGroups: NavGroup[] = [
  {
    title: "MENU",
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Add Referral', href: '/dashboard/signup', icon: UserPlus },
      { name: 'Notifications', href: '/dashboard/announcements', icon: Bell },
      { name: 'Founder\'s Thoughts', href: '/dashboard/founder', icon: BookOpen },
    ],
  },

  {
    title: "GROWTH & EARNINGS",
    items: [
      { name: 'Referral Tree', href: '/dashboard/referral-tree', icon: Network },
      { name: 'Referral Progress', href: '/dashboard/referral-progress', icon: Target },
      { name: 'Payouts', href: '/dashboard/profit-sharing', icon: Landmark },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { name: 'Profile & Security', href: '/dashboard/profile', icon: UserCircle },
    ],
  },
];

const adminGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { name: 'Dashboard', href: '/admin', icon: BarChart3 },
      { name: 'Registration Queue', href: '/admin/registrations', icon: UserCheck },
      { name: 'Shareholders', href: '/admin/shareholders', icon: Users },
    ],
  },
  {
    title: "FINANCIAL ENGINE",
    items: [
      { name: 'Rank Engine', href: '/admin/ranks', icon: Award },
      { name: 'Payout Batches', href: '/admin/payouts', icon: Landmark },
      { name: 'Withdrawals', href: '/admin/withdrawals', icon: ArrowRightLeft },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { name: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
      { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
      { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
      { name: 'Founder\'s Thoughts', href: '/admin/founder', icon: Edit3 },
      { name: 'Business Config', href: '/admin/config', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shareholder = useAuthStore((state) => state.shareholder);
  const logout = useAuthStore((state) => state.logout);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const { isCollapsed, toggleCollapse, isMobileOpen, setMobileOpen } = useSidebarStore();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Sign Out",
      description: "Are you sure you want to end your active session?",
      confirmText: "Sign Out",
      variant: "danger"
    });
    if (!ok) return;

    try {
      await api.post('/auth/logout');
    } catch (e) {}
    logout();
    toast({ title: "Signed Out", description: "You have been logged out successfully.", type: "success" });
    router.push('/auth/login');
  };

  const isAdminPath = pathname.startsWith('/admin');
  const showAdminToggle = shareholder?.role === 'ADMIN' || shareholder?.role === 'SUPER_ADMIN';
  const currentGroups = isAdminPath ? adminGroups : userGroups;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 select-none">
      {/* Brand Header */}
      <div className="h-18 flex items-center justify-between px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <Link href={isAdminPath ? "/admin" : "/dashboard"} className="flex items-center gap-3 overflow-hidden py-1">
          <img 
            src="/logo-369.png" 
            alt="360 Star Logo" 
            className="h-9 w-auto max-w-[42px] object-contain shrink-0 drop-shadow-xs" 
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight leading-none text-gray-900 dark:text-white">
                360 STAR
              </span>
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-0.5">
                {isAdminPath ? (shareholder?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN PANEL') : 'SHAREHOLDER'}
              </span>
            </div>
          )}
        </Link>
        
        {/* Collapse toggle button on desktop */}
        <button 
          onClick={toggleCollapse}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-5 px-3.5 space-y-6 custom-scrollbar">
        {currentGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed ? (
              <h2 className="px-3 mb-2 text-[11px] font-bold tracking-wider text-gray-400 dark:text-gray-400 uppercase">
                {group.title}
              </h2>
            ) : (
              <div className="h-px bg-gray-200 dark:bg-gray-800 my-2 mx-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === '/admin' || item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                      isActive 
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 font-bold shadow-theme-xs' 
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full" />
                    )}
                    <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                    }`} />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile & Controls */}
      <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-2.5 bg-gray-50/50 dark:bg-gray-900/40">
        {/* Admin / Investor Switcher */}
        {showAdminToggle && (
          <div>
            {!isCollapsed ? (
              <Link 
                href={isAdminPath ? "/dashboard" : "/admin"}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-500/40 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all shadow-theme-xs"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-brand-500" />
                  <span>{isAdminPath ? "Switch to Investor View" : "Switch to Admin View"}</span>
                </div>
                <ChevronRight size={13} className="text-gray-400" />
              </Link>
            ) : (
              <Link
                href={isAdminPath ? "/dashboard" : "/admin"}
                className="flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/15 transition-all cursor-pointer shadow-theme-xs"
                title={isAdminPath ? "Switch to Investor View" : "Switch to Admin View"}
              >
                <ArrowLeftRight size={16} />
              </Link>
            )}
          </div>
        )}

        {/* User Card & Sign Out */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-theme-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8.5 w-8.5 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0 border border-brand-200 dark:border-brand-500/30">
                {(shareholder?.name || shareholder?.shareholderId || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {shareholder?.name || shareholder?.shareholderId}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                  {shareholder?.shareholderId || shareholder?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2.5 rounded-xl text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Shell */}
      <aside 
        className={`fixed top-0 left-0 h-screen z-30 hidden lg:flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-68'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.5 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-gray-950"
            />
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-68 bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
