"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Bell, Search, LogOut, Menu, X, Check, Trash, Archive, 
  CheckSquare, ChevronRight, Inbox, User, Shield, ChevronDown, 
  ExternalLink, Mail, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';

export default function Topbar() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const { toggleMobile } = useSidebarStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const { data: notifications, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/notifications');
      return res.data;
    },
    enabled: !!shareholder,
  });

  // WebSocket Connection
  useEffect(() => {
    if (!shareholder) return;
    const token = useAuthStore.getState().token;
    if (!token) return;

    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    const baseUrl = (envUrl && !envUrl.includes('localhost'))
      ? envUrl.replace('/api/v1', '') 
      : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002');
      
    const socket = io(baseUrl, {
      auth: { token },
      query: { token },
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('message:received', () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:received', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [shareholder, queryClient]);

  // Mutations
  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/shareholders/me/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/shareholders/me/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notifications Read", description: "All notifications have been marked as read.", type: "success" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/shareholders/me/notifications/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shareholders/me/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

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

  const activeNotifications = notifications?.filter((n: any) => !n.isDeleted && !n.isArchived) || [];
  const unreadCount = activeNotifications.filter((n: any) => !n.isRead).length || 0;

  // Breadcrumbs generator
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part, index) => {
      const href = '/' + parts.slice(0, index + 1).join('/');
      const label = part
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return { label, href, isLast: index === parts.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();
  const [selectedNotifForModal, setSelectedNotifForModal] = useState<any>(null);

  const getNotificationTargetRoute = (notif: any) => {
    const isAdmin = shareholder?.role === 'SUPER_ADMIN' || shareholder?.role === 'ADMIN';
    if (!notif) return isAdmin ? '/admin' : '/dashboard';
    const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
    
    if (text.includes('founder') || text.includes('thought') || text.includes('vision')) {
      return isAdmin ? '/admin/founder' : '/dashboard/founder';
    }
    if (text.includes('registration') || text.includes('signup') || text.includes('applicant') || text.includes('referral queue')) {
      return isAdmin ? '/admin/registrations' : '/dashboard/signup';
    }
    if (text.includes('shareholder') || text.includes('financial change') || text.includes('bank details') || text.includes('profile')) {
      return isAdmin ? '/admin/shareholders' : '/dashboard/profile';
    }
    if (text.includes('payout') || text.includes('dividend') || text.includes('profit')) {
      return isAdmin ? '/admin/payouts' : '/dashboard/profit-sharing';
    }
    if (text.includes('withdrawal') || text.includes('holding balance')) {
      return isAdmin ? '/admin/withdrawals' : '/dashboard/profit-sharing';
    }
    if (text.includes('rank')) {
      return isAdmin ? '/admin/ranks' : '/dashboard/referral-progress';
    }
    if (text.includes('investor') || text.includes('contribution')) {
      return isAdmin ? '/admin/shareholders' : '/dashboard/profit-sharing';
    }
    return isAdmin ? '/admin' : '/dashboard/announcements';
  };

  const handleTakeMeThere = (notif: any) => {
    const route = getNotificationTargetRoute(notif);
    setSelectedNotifForModal(null);
    router.push(route);
  };

  return (
    <header className="sticky top-0 z-30 flex h-18 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6">
      <div className="flex grow items-center justify-between gap-4">
        {/* Left Side: Mobile toggle & Breadcrumb Trail */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden cursor-pointer"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold select-none">
            <Link 
              href={pathname.startsWith('/admin') ? '/admin' : '/dashboard'} 
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              {pathname.startsWith('/admin') ? 'Admin Panel' : 'Investor Portal'}
            </Link>
            {breadcrumbs.map((crumb) => (
              (crumb.href === '/admin' || crumb.href === '/dashboard') ? null : (
                <React.Fragment key={crumb.href}>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
                  {crumb.isLast ? (
                    <span className="font-bold text-gray-900 dark:text-white tracking-wide">{crumb.label}</span>
                  ) : (
                    <Link 
                      href={crumb.href} 
                      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              )
            ))}
          </nav>
        </div>

        {/* Center: Search Field */}
        <div className="hidden md:flex relative w-64 lg:w-80">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </span>
          <input
            type="text"
            placeholder="Search dashboard..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-12 text-xs text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            ⌘K
          </span>
        </div>

        {/* Right Side: Quick Action Links, Theme Toggle, Notification Bell, User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Founder's Thoughts Link */}
          <Link href={shareholder?.role === 'SUPER_ADMIN' || shareholder?.role === 'ADMIN' ? '/admin/founder' : '/dashboard/founder'} className="hidden sm:block">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              pathname === '/dashboard/founder' || pathname === '/admin/founder'
                ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}>
              <Mail className="w-3.5 h-3.5" />
              <span>Founder's Thoughts</span>
            </span>
          </Link>

          {/* Dark / Light Mode Toggler */}
          <ThemeToggleButton />

          {/* Notifications Center */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer shadow-theme-xs"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-50"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      Notifications ({unreadCount})
                    </span>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => markAllReadMutation.mutate()} 
                          className="p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all" 
                          title="Mark all as read"
                        >
                          <CheckSquare size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => setIsNotifOpen(false)} 
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/80 custom-scrollbar py-1">
                    {isNotificationsLoading ? (
                      <div className="py-6 space-y-2 px-3">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3 animate-pulse" />
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-5/6 animate-pulse" />
                      </div>
                    ) : activeNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">All caught up!</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">No unread notifications.</p>
                      </div>
                    ) : (
                      activeNotifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-xl transition-all flex justify-between gap-2.5 items-start ${
                            !n.isRead ? 'bg-brand-50/50 dark:bg-brand-500/10' : ''
                          }`}
                        >
                          <div 
                            className="space-y-0.5 flex-1 cursor-pointer" 
                            onClick={() => {
                              if (!n.isRead) readMutation.mutate(n.id);
                              setSelectedNotifForModal(n);
                              setIsNotifOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs leading-snug line-clamp-1 ${!n.isRead ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{n.title}</p>
                              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold shrink-0 hover:underline">View</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal line-clamp-2">{n.message}</p>
                            <p className="text-[9px] text-gray-400 font-mono mt-1">{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            {!n.isRead && (
                              <button onClick={() => readMutation.mutate(n.id)} className="p-1 hover:bg-brand-50 hover:text-brand-600 rounded text-gray-400 transition-all" title="Mark read">
                                <Check size={12} />
                              </button>
                            )}
                            <button onClick={() => archiveMutation.mutate(n.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 transition-all" title="Archive">
                              <Archive size={12} />
                            </button>
                            <button onClick={() => deleteMutation.mutate(n.id)} className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 transition-all" title="Delete">
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Link
                    href="/dashboard/announcements"
                    onClick={() => setIsNotifOpen(false)}
                    className="block text-center py-2 text-xs font-bold text-brand-600 dark:text-brand-400 border-t border-gray-100 dark:border-gray-800 hover:underline"
                  >
                    View All Announcements
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserOpen(!isUserOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs border border-brand-200 dark:border-brand-500/30 shadow-theme-xs">
                {(shareholder?.name || shareholder?.shareholderId || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {shareholder?.name || shareholder?.shareholderId}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-tight">
                  {shareholder?.shareholderId}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUserOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isUserOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-50 space-y-2"
                >
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3 px-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {shareholder?.name || 'Shareholder Account'}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                      {shareholder?.email || shareholder?.phone || shareholder?.shareholderId}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="badge-brand">
                        <Shield className="w-3 h-3" />
                        {shareholder?.role}
                      </span>
                      {shareholder?.rank && (
                        <span className="badge-success">
                          {shareholder.rank}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsUserOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span>Profile & Financial Info</span>
                    </Link>

                    {shareholder?.role === 'SUPER_ADMIN' || shareholder?.role === 'ADMIN' ? (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <Shield className="w-4 h-4 text-brand-500" />
                        <span>Admin Console</span>
                      </Link>
                    ) : null}
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                    <button
                      onClick={() => {
                        setIsUserOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Announcement / Notification Full View Modal */}
      <AnimatePresence>
        {selectedNotifForModal && (
          <div key={selectedNotifForModal.id || 'notif-modal'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-theme-xl relative space-y-4 max-h-[85vh] flex flex-col font-outfit"
            >
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedNotifForModal.priority === 'HIGH' 
                        ? 'badge-error' 
                        : selectedNotifForModal.priority === 'MEDIUM' 
                        ? 'badge-warning' 
                        : 'badge-brand'
                    }`}>
                      {selectedNotifForModal.priority || 'NORMAL'} PRIORITY
                    </span>
                    {((selectedNotifForModal.message || '').includes('(FounderRef:') || selectedNotifForModal.title?.toLowerCase().includes("founder")) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                        FOUNDER'S THOUGHTS
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{selectedNotifForModal.title}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    Received: {new Date(selectedNotifForModal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedNotifForModal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNotifForModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 py-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                {(selectedNotifForModal.message || '').replace(/\(FounderRef:[^\)]+\)/gi, '').replace(/\(Ref:[^\)]+\)/gi, '').trim() || selectedNotifForModal.message}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => handleTakeMeThere(selectedNotifForModal)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-theme-xs flex items-center gap-1.5 cursor-pointer select-none"
                >
                  Take me there <ArrowRight size={13} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      archiveMutation.mutate(selectedNotifForModal.id);
                      setSelectedNotifForModal(null);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                  >
                    Archive
                  </button>
                  <button
                    onClick={() => setSelectedNotifForModal(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </header>
  );
}
