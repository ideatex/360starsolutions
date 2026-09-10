"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  User, Phone, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, 
  Upload, FileText, AlertCircle, Sparkles, Building2, Coins, HelpCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'CONTRIBUTION' | 'ZERO_CONTRIBUTION'>('CONTRIBUTION');
  const [referrerCode, setReferrerCode] = useState('');
  const [referrerInfo, setReferrerInfo] = useState<{ valid: boolean; name?: string; shareholderId?: string; message?: string } | null>(null);
  const [isCheckingReferrer, setIsCheckingReferrer] = useState(false);

  // Contribution State
  const [contributionAmount, setContributionAmount] = useState<number>(100000);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  // Real-time referrer validation debounce
  useEffect(() => {
    if (!referrerCode.trim()) {
      setReferrerInfo(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingReferrer(true);
      try {
        const res = await api.get(`/registrations/verify-referrer/${encodeURIComponent(referrerCode.trim())}`);
        setReferrerInfo(res.data);
      } catch (err: any) {
        setReferrerInfo({ valid: false, message: 'Invalid or inactive referrer' });
      } finally {
        setIsCheckingReferrer(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [referrerCode]);

  // Handle proof upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Payment proof must be under 5MB.', type: 'error' });
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid Format', description: 'Please upload a JPEG, PNG, WEBP, or PDF receipt.', type: 'error' });
      return;
    }

    setProofFile(file);
    setIsUploadingProof(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/registrations/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProofUrl(res.data.fileUrl);
      setProofFileName(res.data.originalName || file.name);
      toast({ title: 'Receipt Uploaded', description: 'Payment proof attached successfully.', type: 'success' });
    } catch (err: any) {
      toast({ 
        title: 'Upload Failed', 
        description: err.response?.data?.message || 'Could not upload payment proof. Please try again.', 
        type: 'error' 
      });
      setProofFile(null);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: 'Validation Error', description: 'Please enter applicant full name.', type: 'warning' });
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      toast({ title: 'Validation Error', description: 'Please provide a valid 10-digit mobile number.', type: 'warning' });
      return;
    }

    if (referrerCode.trim() && referrerInfo && !referrerInfo.valid) {
      toast({ title: 'Invalid Referrer', description: 'Please correct or clear the sponsor/referrer code.', type: 'error' });
      return;
    }

    if (accountType === 'CONTRIBUTION') {
      if (!contributionAmount || contributionAmount < 100000 || contributionAmount % 100000 !== 0) {
        toast({ 
          title: 'Invalid Contribution', 
          description: 'Contribution must be at least ₹1,00,000 and an exact multiple of ₹1,00,000.', 
          type: 'warning' 
        });
        return;
      }
      if (!proofUrl) {
        toast({ title: 'Payment Receipt Required', description: 'Please attach proof of payment/bank transfer.', type: 'warning' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: cleanPhone,
        accountType,
        referrerId: referrerInfo?.valid ? referrerInfo.id || referrerCode.trim() : undefined,
      };

      if (accountType === 'CONTRIBUTION') {
        payload.contributionAmount = contributionAmount;
        payload.paymentProofUrl = proofUrl;
        payload.paymentProofFileName = proofFileName;
      }

      const res = await api.post('/registrations', payload);
      setSubmittedRequest(res.data);
      toast({ 
        title: 'Registration Submitted', 
        description: 'Your application has been received and is pending admin review.', 
        type: 'success' 
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit registration request. Please try again.';
      toast({ title: 'Submission Error', description: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-brand-primary/5 blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full bg-white dark:bg-slate-900 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/auth/login" className="inline-block">
            <img 
              src="/logo-360.png" 
              alt="Logo" 
              className="h-16 sm:h-20 max-w-[200px] w-auto mx-auto object-contain mb-3 drop-shadow-xs" 
            />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] font-extrabold tracking-wider uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Product 360 Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Member Registration Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Complete your onboarding details. All applications undergo verification before account activation.
          </p>
        </div>

        {/* Confirmation Screen */}
        {submittedRequest ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase">
                PENDING ADMIN REVIEW
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Application Submitted Successfully!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Thank you, <strong>{submittedRequest.name}</strong>. Your registration request has been queued for verification.
              </p>
            </div>

            {/* Tracking Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 text-left text-xs space-y-3 max-w-md mx-auto">
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                <span className="text-slate-500 font-medium">Request Reference ID</span>
                <span className="font-mono font-bold text-brand-primary">{submittedRequest.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                <span className="text-slate-500 font-medium">Registered Mobile</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{submittedRequest.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                <span className="text-slate-500 font-medium">Account Category</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {submittedRequest.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution Account' : 'Standard Contribution Account'}
                </span>
              </div>
              {submittedRequest.contributionAmount && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Contribution Fund</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(submittedRequest.contributionAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium max-w-md mx-auto flex items-start gap-3 text-left">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
              <span>
                Once an administrator reviews your application and payment receipt, your User ID and secure login password will be dispatched directly to your mobile via SMS.
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-primary text-white text-xs font-extrabold uppercase tracking-wider hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                Go to Member Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Main Signup Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-black">1</span>
                Applicant Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number (10 Digits) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Referrer / Sponsor Lookup */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Sponsor / Referrer ID (Optional)
                  </label>
                  {isCheckingReferrer && (
                    <span className="text-[10px] text-brand-primary font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying sponsor...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter Sponsor ID (e.g. USR100001)"
                    value={referrerCode}
                    onChange={(e) => setReferrerCode(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-all ${
                      referrerInfo?.valid
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : referrerInfo && !referrerInfo.valid
                        ? 'border-red-500/80 focus:border-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-brand-primary'
                    }`}
                  />
                </div>
                {referrerInfo && (
                  <div className={`mt-1.5 text-[11px] font-bold flex items-center gap-1.5 ${
                    referrerInfo.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}>
                    {referrerInfo.valid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Sponsor Verified: <strong>{referrerInfo.name}</strong> ({referrerInfo.shareholderId})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{referrerInfo.message || 'Invalid or inactive sponsor ID'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Account Type Selector */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-black">2</span>
                Choose Account Type
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Contribution Account */}
                <div
                  onClick={() => setAccountType('CONTRIBUTION')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    accountType === 'CONTRIBUTION'
                      ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                    <input
                      type="radio"
                      checked={accountType === 'CONTRIBUTION'}
                      onChange={() => setAccountType('CONTRIBUTION')}
                      className="accent-brand-primary"
                    />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Standard Contribution Account
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Invest capital starting at ₹1,00,000. Full eligibility for <strong>5% Monthly Profit Sharing</strong> + Gratitude Share commissions.
                  </p>
                </div>

                {/* Zero Contribution Account */}
                <div
                  onClick={() => setAccountType('ZERO_CONTRIBUTION')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    accountType === 'ZERO_CONTRIBUTION'
                      ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <input
                      type="radio"
                      checked={accountType === 'ZERO_CONTRIBUTION'}
                      onChange={() => setAccountType('ZERO_CONTRIBUTION')}
                      className="accent-brand-primary"
                    />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Zero Contribution Account
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Zero upfront capital. Earn Gratitude Share referral commissions with <strong>20% withholding</strong> until ₹1,00,000 auto-conversion.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Contribution & Proof Section (if Contribution Account) */}
            <AnimatePresence>
              {accountType === 'CONTRIBUTION' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
                >
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-black">3</span>
                    Contribution Amount & Payment Proof
                  </h3>

                  {/* Amount Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Contribution Amount (Min ₹1,00,000, multiples of ₹1,00,000) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min={100000}
                        step={100000}
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    {/* Quick Amount Chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[100000, 200000, 300000, 500000, 1000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setContributionAmount(amt)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                            contributionAmount === amt
                              ? 'bg-brand-primary text-white border-brand-primary'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ₹{(amt / 100000).toFixed(0)} Lakh
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Receipt Upload */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Upload Bank Transfer / Deposit Receipt *
                    </label>

                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-brand-primary/60 transition-colors bg-slate-50/50 dark:bg-slate-800/30 relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        disabled={isUploadingProof}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-1 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-1">
                          {isUploadingProof ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5" />
                          )}
                        </div>
                        {proofFileName ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Attached: {proofFileName}</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              Click or drag and drop payment receipt here
                            </p>
                            <p className="text-[10px] text-slate-400">
                              JPEG, PNG, WEBP, or PDF (Max 5MB)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingProof}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 text-xs tracking-wider uppercase cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Registration Request <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            {/* Footer Navigation */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Already registered?{' '}
                <Link href="/auth/login" className="text-brand-primary hover:underline font-bold">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
