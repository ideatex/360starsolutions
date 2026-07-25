"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  LayoutDashboard, Wallet, TrendingUp, Network, ArrowRightLeft, 
  ShieldCheck, ShieldAlert, LogOut, MessageSquare, BookOpen, Coins,
  ChevronLeft, ChevronRight, Settings, Users, Landmark, FileText, Megaphone, Edit3, Award, BarChart3, Target, PieChart, FileDown, UserCircle, Key
} from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const userLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Referral Tree', href: '/dashboard/referral-tree', icon: Network },
  { name: 'Referral Progress', href: '/dashboard/referral-progress', icon: Target },
  { name: 'Profit Sharing', href: '/dashboard/profit-sharing', icon: PieChart },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircle },
];

const adminLinks = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Shareholder Management', href: '/admin/shareholders', icon: Users },
  { name: 'Payout Batches', href: '/admin/payouts', icon: Landmark },
  { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { name: 'Founder\'s Thoughts', href: '/admin/founder', icon: Edit3 },
  { name: 'Business Config', href: '/admin/config', icon: Settings },
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
      description: "Are you sure you want to end your active workspace session?",
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
  
  // Decide which link array to render
  const currentLinks = isAdminPath ? adminLinks : userLinks;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-sidebar text-foreground select-none relative">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border-subtle shrink-0">
        <Link href={isAdminPath ? "/admin" : "/dashboard"} className="flex items-center gap-2.5 overflow-hidden">
          <div className="bg-brand-primary p-2 rounded-xl text-white shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-white"
            >
              360 Star
            </motion.span>
          )}
        </Link>
        
        {/* Collapse button on desktop */}
        <button 
          onClick={toggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg border border-border-subtle hover:bg-muted dark:hover:bg-secondary text-muted-foreground transition-all shrink-0 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {currentLinks.map((link) => {
          const isActive = link.href === '/admin' || link.href === '/dashboard'
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(link.href + '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold tracking-wide transition-all duration-200 border ${
                isActive 
                  ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary dark:border-brand-primary/40 shadow-sm' 
                  : 'border-transparent text-muted-foreground hover:bg-muted/70 dark:hover:bg-secondary/60 hover:text-foreground'
              }`}
              title={isCollapsed ? link.name : undefined}
            >
              {/* Left active indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-brand-primary rounded-r-full shadow-glow"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-brand-primary font-bold' : 'text-muted-foreground'}`} />
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {link.name}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Controls & Mode Switcher */}
      <div className="p-4 border-t border-border-subtle shrink-0 space-y-3">
        {/* Toggle between Admin and Shareholder interfaces */}
        {showAdminToggle && !isCollapsed && (
          <div className="bg-muted dark:bg-secondary/40 p-2.5 rounded-2xl border border-border-subtle flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Interface Switch</p>
            {isAdminPath ? (
              <Link 
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between p-2 bg-white dark:bg-card border border-border-subtle hover:border-brand-primary/30 rounded-xl text-xs font-bold text-brand-primary transition-all shadow-sm"
              >
                <span>Investor View</span>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <Link 
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between p-2 bg-white dark:bg-card border border-border-subtle hover:border-brand-accent/30 rounded-xl text-xs font-bold text-brand-accent transition-all shadow-sm"
              >
                <span>Admin View</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Small collapsed toggle icon indicator */}
        {showAdminToggle && isCollapsed && (
          <Link
            href={isAdminPath ? "/dashboard" : "/admin"}
            className="flex justify-center p-2.5 rounded-xl border border-border-subtle bg-muted dark:bg-secondary hover:bg-brand-primary/10 hover:text-brand-primary text-muted-foreground transition-all cursor-pointer"
            title={isAdminPath ? "Switch to Investor View" : "Switch to Admin View"}
          >
            <ShieldAlert size={16} />
          </Link>
        )}

        <button 
          onClick={handleLogout}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/35 border border-transparent hover:border-red-100 dark:hover:border-red-900/40 transition-all cursor-pointer ${isCollapsed ? 'px-0' : ''}`}
          title="Sign Out"
        >
          <LogOut size={14} className="shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Shell */}
      <aside 
        className={`fixed top-0 left-0 h-screen border-r border-border-subtle hidden lg:flex flex-col z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay and Shell */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.4 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-64 bg-white h-full shadow-2xl flex flex-col z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

