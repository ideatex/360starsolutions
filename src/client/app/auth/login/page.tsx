"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff, KeyRound, Smartphone, CheckCircle2, X, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [shareholderId, setshareholderId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const shareholder = useAuthStore((state) => state.shareholder);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isHydrated && shareholder) {
      if (shareholder.role === 'ADMIN' || shareholder.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isHydrated, shareholder, router]);

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

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
      const message = error.response?.data?.message 
        || (error.code === 'ERR_NETWORK' || !error.response 
            ? 'Unable to connect to authentication server. Please ensure the backend is running.' 
            : 'Login failed. Please verify credentials.');
      toast({ 
        title: error.response?.data?.message ? "Access Denied" : "Connection Error", 
        description: message, 
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

  // Forgot Password - Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast({ title: "Input Required", description: "Please enter your Shareholder ID or Registered Mobile Number.", type: "warning" });
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/send-otp', { identifier: forgotIdentifier.trim() });
      setMaskedPhone(res.data.maskedPhone || '');
      toast({ 
        title: "OTP Sent", 
        description: res.data.message || `OTP sent to your registered mobile number (${res.data.maskedPhone || ''}).`, 
        type: "success" 
      });
      setForgotStep(2);
    } catch (err: any) {
      toast({ 
        title: "Request Failed", 
        description: err.response?.data?.message || "Could not send OTP. Please check your ID/Phone.", 
        type: "error" 
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Forgot Password - Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      toast({ title: "OTP Required", description: "Please enter the 6-digit OTP sent to your phone.", type: "warning" });
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/verify-otp', {
        shareholderId: forgotIdentifier.trim(),
        otp: forgotOtp.trim(),
      });
      setResetToken(res.data.resetToken);
      toast({ title: "OTP Verified", description: "Please set a new password.", type: "success" });
      setForgotStep(3);
    } catch (err: any) {
      toast({ 
        title: "Verification Failed", 
        description: err.response?.data?.message || "Invalid or expired OTP.", 
        type: "error" 
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Forgot Password - Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({ title: "Input Required", description: "Please enter and confirm your new password.", type: "warning" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters long.", type: "warning" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", type: "warning" });
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/reset', {
        resetToken,
        newPassword,
      });
      toast({ 
        title: "Password Updated", 
        description: res.data.message || "Your password has been reset successfully. Please log in.", 
        type: "success" 
      });
      setIsForgotOpen(false);
      setForgotStep(1);
      setForgotIdentifier('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setshareholderId(forgotIdentifier);
    } catch (err: any) {
      toast({ 
        title: "Reset Failed", 
        description: err.response?.data?.message || "Could not reset password. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden font-outfit">
      {/* Background ambient gradient glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-2xl shadow-theme-xl border border-gray-200 dark:border-gray-800 relative z-10"
      >
        <div className="text-center mb-8">
          <img 
            src="/logo-369.png" 
            alt="360 Star Logo" 
            className="h-16 sm:h-20 max-w-[200px] w-auto mx-auto object-contain mb-3 drop-shadow-xs" 
          />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sign in to your Shareholder & Partner Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Shareholder ID</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
                value={shareholderId}
                onChange={(e) => setshareholderId(e.target.value)}
                placeholder="e.g. 360SS001"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotStep(1);
                  setForgotIdentifier(shareholderId);
                  setIsForgotOpen(true);
                }}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-theme-xs disabled:opacity-50 flex items-center justify-center gap-2 mt-5 text-xs tracking-wide cursor-pointer"
          >
            {loginMutation.isPending ? 'Authenticating...' : 'Sign In'}
            {!loginMutation.isPending && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            Protected by Product 360 Security Infrastructure
          </p>
        </div>
      </motion.div>

      {/* Forgot Password OTP Modal */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-theme-xl border border-gray-200 dark:border-gray-800 relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-xl">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Reset Password</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                      {forgotStep === 1 && "Verify your registered account"}
                      {forgotStep === 2 && `Enter OTP sent to ${maskedPhone || 'your mobile'}`}
                      {forgotStep === 3 && "Create your new secure password"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsForgotOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Steps Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      forgotStep >= step ? 'bg-brand-500' : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  />
                ))}
              </div>

              {/* Step 1: Request Mobile OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Shareholder ID or Mobile Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. SH100001 or 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-theme-xs"
                  >
                    {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {isForgotLoading ? 'Sending OTP...' : 'Send Mobile OTP'}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        6-Digit Mobile OTP
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isForgotLoading}
                        className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 text-center tracking-widest text-lg font-mono font-bold text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-1/3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-2/3 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-theme-xs"
                    >
                      {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isForgotLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Set New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-theme-xs"
                  >
                    {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isForgotLoading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


