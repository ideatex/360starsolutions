"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

export default function FirstTimePasswordResetModal() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword);
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Only display if user is logged in and flagged with mustChangePassword
  const isOpen = Boolean(shareholder && shareholder.mustChangePassword);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current temporary password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password cannot be identical to your temporary password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/shareholders/me/password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      setIsSuccess(true);
      toast({
        title: 'Password Updated Successfully',
        description: 'Your permanent password has been saved. Your account is now secured.',
        type: 'success',
      });

      setTimeout(() => {
        setMustChangePassword(false);
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password. Please verify your current temporary password.';
      setErrorMessage(msg);
      toast({
        title: 'Password Reset Failed',
        description: msg,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 dark:from-amber-500/20 dark:via-amber-600/20 dark:to-orange-500/20 border-b border-amber-200/50 dark:border-amber-800/40 p-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                  First Login Security
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Reset Temporary Password
                </h3>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
              Welcome to 360 Star Solutions! You are currently using a temporary password. For your account security, please create a permanent password to continue.
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            {isSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Security Update Complete!
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Redirecting to your dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Current Temporary Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter SMS temporary password"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirm Permanent Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:via-amber-700 hover:to-orange-600 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Save & Activate Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
