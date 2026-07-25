"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [shareholderId, setshareholderId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/login', { shareholderId, password });
      return data;
    },
    onSuccess: (data) => {
      login(data.shareholder, data.access_token);
      toast({ 
        title: "Welcome Back", 
        description: `Successfully authenticated as ${data.shareholder.shareholderId}`, 
        type: "success" 
      });
      if (data.shareholder.role === 'ADMIN' || data.shareholder.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Access Denied", 
        description: error.response?.data?.message || 'Login failed. Please verify credentials.', 
        type: "error" 
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareholderId || !password) {
      toast({ title: "Inputs Required", description: "Please enter both shareholderId and password.", type: "warning" });
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#070913] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial gradient glow effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full bg-white/[0.02] backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-primary/10 rounded-2xl text-brand-primary border border-brand-primary/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">360 STAR</h1>
          <p className="text-gray-400 mt-2 text-xs font-semibold uppercase tracking-wider">Enterprise Capital Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Shareholder ID</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-gray-500 w-4.5 h-4.5" />
              <input
                type="text"
                required
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-xs text-white placeholder-gray-500 transition-all font-medium"
                value={shareholderId}
                onChange={(e) => setshareholderId(e.target.value)}
                placeholder="SH100001"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-gray-500 w-4.5 h-4.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-11 pr-11 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-xs text-white placeholder-gray-500 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 mt-4 text-xs tracking-wider uppercase cursor-pointer"
          >
            {loginMutation.isPending ? 'Authenticating...' : 'Login'}
            {!loginMutation.isPending && <ArrowRight size={14} />}
          </button>
        </form>


      </motion.div>
    </div>
  );
}

