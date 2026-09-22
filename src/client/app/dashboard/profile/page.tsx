"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  UserCircle, ShieldCheck, Mail, Phone, MapPin, Building, 
  CreditCard, UserCheck, Activity, Landmark, Lock, KeyRound, 
  CheckCircle2, AlertCircle, Edit3, X, Clock, FileText, Send, Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  // Fetch Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['myProfileDetails'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/profile');
      return res.data;
    },
  });

  // Fetch Pending Financial Change Request
  const { data: financialRequest, isLoading: isRequestLoading } = useQuery({
    queryKey: ['myFinancialChangeRequest'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/financial-change-request');
      return res.data;
    },
  });

  // Financial Change Request Modal State
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [financialForm, setFinancialForm] = useState({
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankBranch: '',
    bankIfsc: '',
  });
  const [isSubmittingFinancial, setIsSubmittingFinancial] = useState(false);

  // Open financial modal and populate current details
  const openFinancialModal = () => {
    setFinancialForm({
      bankName: profile?.bankDetails?.bankName || '',
      bankAccountName: profile?.bankDetails?.accountName || profile?.name || '',
      bankAccountNumber: profile?.bankDetails?.accountNumber || '',
      bankBranch: profile?.bankDetails?.branch || '',
      bankIfsc: profile?.bankDetails?.ifsc || '',
    });
    setIsFinancialModalOpen(true);
  };

  const isIfscValid = (ifsc: string) => {
    if (!ifsc) return false;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
  };

  const isAccountNumberValid = (acc: string) => {
    if (!acc) return false;
    const clean = acc.replace(/[^0-9]/g, '');
    return /^\d{10,16}$/.test(clean);
  };

  const handleFinancialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (financialForm.bankAccountNumber && !isAccountNumberValid(financialForm.bankAccountNumber)) {
      toast({
        title: 'Invalid Account Number',
        description: 'Bank account number must be between 10 and 16 digits.',
        type: 'warning',
      });
      return;
    }

    if (financialForm.bankIfsc && !isIfscValid(financialForm.bankIfsc)) {
      toast({
        title: 'Invalid IFSC Format',
        description: 'Format: ABCD0123456 (11 characters)',
        type: 'warning',
      });
      return;
    }

    setIsSubmittingFinancial(true);
    try {
      await api.post('/shareholders/me/financial-change-request', {
        ...financialForm,
        bankAccountNumber: financialForm.bankAccountNumber.trim(),
        bankIfsc: financialForm.bankIfsc.trim().toUpperCase(),
      });

      toast({
        title: 'Change Request Submitted',
        description: 'Your request has been forwarded to the Super Admin for approval.',
        type: 'success',
      });

      setIsFinancialModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['myFinancialChangeRequest'] });
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.response?.data?.message || 'Failed to submit financial change request.',
        type: 'error',
      });
    } finally {
      setIsSubmittingFinancial(false);
    }
  };

  // Change Password with OTP State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpStep, setOtpStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Request OTP for password change
  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Validation Error', description: 'All password fields are required.', type: 'warning' });
      return;
    }

    if (newPassword.length < 8) {
      toast({ title: 'Validation Error', description: 'New password must be at least 8 characters long.', type: 'warning' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Validation Error', description: 'New passwords do not match.', type: 'warning' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      const res = await api.post('/auth/change-password-otp/send');
      setMaskedPhone(res.data?.maskedPhone || 'your registered mobile');
      setOtpStep('otp');
      toast({
        title: 'OTP Sent',
        description: `6-digit verification code sent to ${res.data?.maskedPhone || 'your registered mobile'}.`,
        type: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Could Not Send OTP',
        description: error.response?.data?.message || 'Failed to dispatch verification OTP. Check your phone record.',
        type: 'error',
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Verify OTP and complete password change
  const handleVerifyPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit verification code.', type: 'warning' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      await api.post('/auth/change-password-otp/verify', {
        currentPassword,
        newPassword,
        otp: otpCode.trim(),
      });

      toast({
        title: 'Password Changed Successfully',
        description: 'Your password has been updated. Please sign in with your new credentials.',
        type: 'success',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpStep('form');

      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.response?.data?.message || 'Invalid or expired OTP code.',
        type: 'error',
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-10 bg-secondary rounded-xl w-1/3 animate-pulse"></div>
        <div className="h-[400px] bg-secondary rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const hasPendingFinancial = financialRequest?.data && financialRequest.data.status === 'PENDING';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6 pb-12 font-outfit"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Account Profile</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            View your registered credentials, tax identification, and manage financial and security details.
          </p>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/15 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 border border-brand-200 dark:border-brand-800/40">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile?.name}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-theme-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                  UID: {profile?.customId || profile?.shareholderId}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-theme-xs">
                  <Landmark className="w-3.5 h-3.5 text-brand-500" />
                  INV ID: {profile?.investorId || 'N/A'}
                </span>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                  profile?.status === 'ACTIVE' 
                    ? 'badge-success' 
                    : 'badge-warning'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                  {profile?.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 min-w-[180px] w-full sm:w-auto shadow-theme-xs">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">KYC Status</span>
              <span className="text-success-600 dark:text-success-400">Verified</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-success-500 rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            
            {/* Identity & Contact */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2.5 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-500" /> Identity & Contact
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shareholder ID</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {profile?.shareholderId}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">PAN Card Number</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2 font-mono">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    {profile?.pan ? (
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-bold text-brand-600 dark:text-brand-400">
                        {profile.pan}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {profile?.phone}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Residential Address</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> 
                    <span className="leading-relaxed">{profile?.address || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Referred By</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 bg-gray-50 dark:bg-gray-800/60 inline-flex px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                    {profile?.referrer || 'Direct / Platform'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-500" /> Financial Information
                </h3>
                <button
                  type="button"
                  onClick={openFinancialModal}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Request Edit
                </button>
              </div>

              {hasPendingFinancial && (
                <div className="p-3 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 rounded-xl flex items-start gap-3">
                  <Clock className="w-4 h-4 text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-warning-700 dark:text-warning-400">Update Pending Review</p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Your financial update request is pending Super Admin approval.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Account Type</label>
                  <p className={`text-xs font-semibold mt-1 inline-flex px-2.5 py-0.5 rounded-full ${
                    profile?.accountType === 'Investor' || profile?.accountType === 'CONTRIBUTION'
                      ? 'badge-success' 
                      : 'badge-warning'
                  }`}>
                    {profile?.accountType || 'CONTRIBUTION'}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bank Name</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-gray-400" /> {profile?.bankDetails?.bankName || 'Not Set'}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Account Holder Name</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2">
                    <UserCircle className="w-3.5 h-3.5 text-gray-400" /> {profile?.bankDetails?.accountName || profile?.name || 'Not Set'}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bank Account Number</label>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 flex items-center gap-2 font-mono">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> {profile?.bankDetails?.accountNumber || 'Not Set'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Branch</label>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">{profile?.bankDetails?.branch || 'Not Set'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">IFSC Code</label>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {profile?.bankDetails?.ifsc || 'Not Set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security (Change Password with Mobile OTP) */}
            <div className="space-y-4 md:col-span-2 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-500" /> Account Security & Password
              </h3>
              
              <div className="bg-gray-50/60 dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded-lg shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Change Password via Mobile OTP</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        For enhanced security, password changes require OTP verification on your registered phone number ({profile?.phone}).
                      </p>
                    </div>
                  </div>
                  {otpStep === 'otp' && (
                    <button
                      type="button"
                      onClick={() => setOtpStep('form')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline cursor-pointer"
                    >
                      Cancel & Back
                    </button>
                  )}
                </div>
                
                {otpStep === 'form' ? (
                  <form onSubmit={handleRequestPasswordOtp} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Current Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input 
                            type="password" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Current password"
                            required
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">New Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            required
                            className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border rounded-xl text-xs font-medium focus:outline-none text-gray-900 dark:text-white ${
                              newPassword && newPassword.length < 8
                                ? 'border-rose-500 focus:border-rose-500'
                                : newPassword && newPassword.length >= 8
                                ? 'border-emerald-500/60 focus:border-emerald-500'
                                : 'border-gray-200 dark:border-gray-700 focus:border-brand-500'
                            }`}
                          />
                        </div>
                        {newPassword && newPassword.length < 8 && (
                          <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" /> Minimum 8 characters required
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            required
                            className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border rounded-xl text-xs font-medium focus:outline-none text-gray-900 dark:text-white ${
                              confirmPassword && confirmPassword !== newPassword
                                ? 'border-rose-500 focus:border-rose-500'
                                : confirmPassword && confirmPassword === newPassword
                                ? 'border-emerald-500/60 focus:border-emerald-500'
                                : 'border-gray-200 dark:border-gray-700 focus:border-brand-500'
                            }`}
                          />
                        </div>
                        {confirmPassword && confirmPassword !== newPassword && (
                          <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" /> Passwords do not match
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit" 
                        className="px-5 bg-brand-500 hover:bg-brand-600 text-white shadow-theme-xs text-xs h-9 flex items-center gap-2 rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                        disabled={isPasswordLoading}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isPasswordLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPasswordOtp} className="p-6 space-y-4 max-w-lg">
                    <div className="p-3.5 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-xl flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-brand-500 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-gray-900 dark:text-white">Enter 6-Digit Verification Code</p>
                        <p className="text-gray-500 dark:text-gray-400">OTP has been sent to {maskedPhone}.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">6-Digit OTP</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        required
                        className="w-full text-center tracking-[0.5em] text-xl font-bold font-mono py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleRequestPasswordOtp}
                        disabled={isPasswordLoading}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                      <button
                        type="submit"
                        disabled={isPasswordLoading || otpCode.length !== 6}
                        className="px-5 bg-success-500 hover:bg-success-600 text-white shadow-theme-xs text-xs h-9 rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isPasswordLoading ? 'Verifying...' : 'Confirm & Update Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Financial Information Change Request Modal */}
      <AnimatePresence>
        {isFinancialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-500" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Request Financial Information Update</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFinancialModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFinancialSubmit} className="p-6 space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updates to banking credentials require approval from the Super Admin before taking effect on your payout distributions. (PAN card is permanent and cannot be modified).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={financialForm.bankName}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Branch Name</label>
                    <input
                      type="text"
                      value={financialForm.bankBranch}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankBranch: e.target.value })}
                      placeholder="e.g. Connaught Place"
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={financialForm.bankAccountName}
                    onChange={(e) => setFinancialForm({ ...financialForm, bankAccountName: e.target.value })}
                    placeholder="Full name as per bank record"
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={financialForm.bankAccountNumber}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankAccountNumber: e.target.value.replace(/\D/g, '') })}
                      placeholder="Account number"
                      className={`w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none ${
                        financialForm.bankAccountNumber && !isAccountNumberValid(financialForm.bankAccountNumber)
                          ? 'border-rose-500 focus:border-rose-500'
                          : financialForm.bankAccountNumber && isAccountNumberValid(financialForm.bankAccountNumber)
                          ? 'border-emerald-500/60 focus:border-emerald-500'
                          : 'border-gray-200 dark:border-gray-700 focus:border-brand-500'
                      }`}
                    />
                    {financialForm.bankAccountNumber && !isAccountNumberValid(financialForm.bankAccountNumber) && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" /> 10-16 digits required
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={financialForm.bankIfsc}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankIfsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0001234"
                      maxLength={11}
                      className={`w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border rounded-xl text-xs uppercase font-mono font-bold text-gray-900 dark:text-white focus:outline-none ${
                        financialForm.bankIfsc && !isIfscValid(financialForm.bankIfsc)
                          ? 'border-rose-500 focus:border-rose-500 text-rose-500'
                          : financialForm.bankIfsc && isIfscValid(financialForm.bankIfsc)
                          ? 'border-emerald-500/60 focus:border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-700 focus:border-brand-500'
                      }`}
                    />
                    {financialForm.bankIfsc && !isIfscValid(financialForm.bankIfsc) && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" /> Invalid IFSC (e.g. HDFC0001234)
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsFinancialModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFinancial}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-theme-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingFinancial ? 'Submitting...' : 'Submit Change Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
