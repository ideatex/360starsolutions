"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Search, LogOut, Menu, X, Check, Trash, Archive, CheckSquare, ChevronRight, Inbox, MailOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import Link from 'next/link';

export default function Topbar() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const { isCollapsed, toggleMobile } = useSidebarStore();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <header className="h-16 bg-white/80 dark:bg-sidebar/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumbs / Mobile trigger */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleMobile}
          className="p-2 text-muted-foreground hover:bg-muted dark:hover:bg-secondary rounded-xl lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic breadcrumbs list */}
        <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold select-none">
          <Link href={pathname.startsWith('/admin') ? '/admin' : '/dashboard'} className="text-muted-foreground hover:text-foreground transition-all">
            {pathname.startsWith('/admin') ? 'Admin' : 'Overview'}
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            // Skip the first level if it matches admin/dashboard
            (crumb.href === '/admin' || crumb.href === '/dashboard') ? null : (
              <React.Fragment key={crumb.href}>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                {crumb.isLast ? (
                  <span className="text-foreground font-bold tracking-wide">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-all">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            )
          ))}
        </nav>
      </div>

      {/* Global Actions Panel */}
      <div className="flex items-center gap-4 ml-auto relative">
        {/* Desktop Search Field */}
        <div className="hidden md:flex relative w-48 lg:w-60">
          <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search CRM..."
            className="w-full pl-9 pr-8 py-1.5 bg-muted/50 focus:bg-white dark:focus:bg-card border border-border-subtle rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-muted-foreground transition-all"
          />
          <span className="absolute right-2.5 top-2 px-1 py-0.5 rounded border border-border-subtle bg-white dark:bg-card text-[9px] font-mono text-muted-foreground select-none">
            Ctrl+K
          </span>
        </div>

        {/* Navigation Quick Links */}
        <div className="flex items-center gap-1">
          <Link href="/dashboard/founder">
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer border transition-all ${
              pathname === '/dashboard/founder'
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                : 'bg-muted/40 border-border-subtle hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}>
              Letters
            </span>
          </Link>
        </div>

        <div className="h-6 w-px bg-border-subtle mx-1 hidden sm:block"></div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative p-2 rounded-full transition-colors cursor-pointer ${
              isOpen ? 'bg-muted dark:bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-sidebar">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Center Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-card border border-border-subtle shadow-premium rounded-3xl overflow-hidden z-50 py-2"
              >
                <div className="flex justify-between items-center px-4 py-2 border-b border-border-subtle bg-muted/20">
                  <span className="font-extrabold text-gray-900 dark:text-white text-xs">Notifications ({unreadCount})</span>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllReadMutation.mutate()} 
                        className="p-1 hover:bg-muted dark:hover:bg-secondary text-brand-primary rounded-lg transition-all" 
                        title="Mark all as read"
                      >
                        <CheckSquare size={13} />
                      </button>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="p-1 hover:bg-muted dark:hover:bg-secondary text-muted-foreground rounded-lg transition-all"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                
                <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle custom-scrollbar">
                  {isNotificationsLoading ? (
                    <div className="py-8 space-y-3 px-4">
                      <div className="h-3 bg-muted rounded-full w-2/3 animate-pulse"></div>
                      <div className="h-2 bg-muted rounded-full w-5/6 animate-pulse"></div>
                      <div className="h-2.5 bg-muted rounded-full w-1/2 animate-pulse"></div>
                    </div>
                  ) : activeNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-[11px] font-bold text-muted-foreground">All caught up!</p>
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5">No unarchived notifications found.</p>
                    </div>
                  ) : (
                    activeNotifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-muted/30 dark:hover:bg-secondary/20 transition-all flex justify-between gap-3 items-start ${
                          !n.isRead ? 'bg-brand-primary/5 dark:bg-brand-primary/5' : ''
                        }`}
                      >
                        <div 
                          className="space-y-0.5 flex-1 cursor-pointer" 
                          onClick={() => {
                            if (!n.isRead) readMutation.mutate(n.id);
                            setSelectedNotifForModal(n);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-[11px] leading-snug line-clamp-1 ${!n.isRead ? 'font-extrabold text-gray-900 dark:text-white' : 'text-muted-foreground'}`}>{n.title}</p>
                            <span className="text-[9px] text-brand-primary font-bold shrink-0 hover:underline">Full View</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/90 dark:text-gray-400 leading-normal line-clamp-2">{n.message}</p>
                          <p className="text-[8px] text-muted-foreground/60 font-mono mt-1">{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {!n.isRead && (
                            <button onClick={() => readMutation.mutate(n.id)} className="p-1 hover:bg-brand-primary/10 hover:text-brand-primary rounded text-muted-foreground transition-all" title="Mark read">
                              <Check size={11} />
                            </button>
                          )}
                          <button onClick={() => archiveMutation.mutate(n.id)} className="p-1 hover:bg-muted dark:hover:bg-secondary rounded text-muted-foreground transition-all" title="Archive">
                            <Archive size={11} />
                          </button>
                          <button onClick={() => deleteMutation.mutate(n.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 rounded text-muted-foreground transition-all" title="Delete">
                            <Trash size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href="/dashboard/announcements"
                  onClick={() => setIsOpen(false)}
                  className="block text-center py-2 text-xs font-bold text-brand-primary border-t border-border-subtle bg-muted/20 hover:bg-muted/40 transition-all"
                >
                  View All Announcements
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification / Announcement Full View Modal */}
        <AnimatePresence>
          {selectedNotifForModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-card border border-border-subtle rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-start border-b border-border-subtle pb-3 shrink-0">
                  <div>
                    <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-1.5 ${
                      selectedNotifForModal.priority === 'HIGH' 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' 
                        : selectedNotifForModal.priority === 'MEDIUM' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    }`}>
                      {selectedNotifForModal.priority || 'NORMAL'} PRIORITY
                    </span>
                    <h3 className="text-base font-bold text-foreground leading-snug">{selectedNotifForModal.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      Received: {new Date(selectedNotifForModal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(selectedNotifForModal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedNotifForModal(null)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted dark:hover:bg-secondary transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Full Message Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 py-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap bg-muted/10 p-4 rounded-2xl border border-border-subtle">
                  {selectedNotifForModal.message}
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle pt-3 shrink-0">
                  <Link
                    href="/dashboard/announcements"
                    onClick={() => setSelectedNotifForModal(null)}
                    className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    View All Announcements <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        archiveMutation.mutate(selectedNotifForModal.id);
                        setSelectedNotifForModal(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-border-subtle text-xs font-semibold hover:bg-muted dark:hover:bg-secondary transition-all cursor-pointer"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => setSelectedNotifForModal(null)}
                      className="px-4 py-1.5 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-sm cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="h-6 w-px bg-border-subtle mx-1 hidden sm:block"></div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-extrabold text-sm select-none shadow-xs">
            {(shareholder?.name || shareholder?.shareholderId || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

