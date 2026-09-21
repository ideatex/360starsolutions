"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { api } from '@/lib/api';
import { 
  UserPlus, User, ShieldCheck, Mail, Phone, Calendar, CreditCard, 
  MapPin, Building, Landmark, Upload, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle, HelpCircle, Lock,
  Eye, EyeOff, Key
} from 'lucide-react';
import { 
  getIndianStates, 
  getDistrictsByState, 
  lookupPincode 
} from '@/lib/indianLocations';

const DEFAULT_INDIAN_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Bank of Baroda",
  "Punjab National Bank (PNB)",
  "Canara Bank",
  "Union Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Bank",
  "UCO Bank",
  "IDBI Bank",
  "Federal Bank",
  "YES Bank",
  "Punjab & Sind Bank",
  "Indian Overseas Bank",
  "Bandhan Bank",
  "RBL Bank",
  "IDFC FIRST Bank",
];

export default function ShareholderSignupPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Personal
    name: '',
    phone: '',
    dob: '',
    pan: '',
    // Step 2: Address
    addressBuilding: '',
    addressArea: '',
    addressState: '',
    addressDistrict: '',
    addressCity: '',
    addressPincode: '',
    // Step 3: Banking Details
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankBranch: '',
    bankIfsc: '',
    // Step 4: Account Type & Contribution
    accountType: 'CONTRIBUTION', // CONTRIBUTION or ZERO_CONTRIBUTION
    contributionAmount: '100000',
    contributionDate: new Date().toISOString().split('T')[0],
    paymentProofUrl: '',
    paymentProofFileName: '',
  });

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodePostOffices, setPincodePostOffices] = useState<string[]>([]);

  // PAN format validation: AAAAA9999A
  const isPanValid = (pan: string) => {
    if (!pan) return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
  };

  // Indian locations cascading
  const indianStates = getIndianStates();
  const districts = form.addressState ? getDistrictsByState(form.addressState) : [];

  // Real-time Pincode Lookup
  const handlePincodeChange = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, addressPincode: cleanPin }));

    if (cleanPin.length === 6) {
      setIsLookingUpPincode(true);
      try {
        const result = await lookupPincode(cleanPin);
        if (result) {
          setPincodePostOffices(result.postOffices || []);
          setForm((prev) => ({
            ...prev,
            addressState: result.state || prev.addressState,
            addressDistrict: result.district || prev.addressDistrict,
            addressCity: prev.addressCity || result.city || (result.postOffices && result.postOffices[0]) || '',
          }));
          toast({ 
            title: "Pincode Verified", 
            description: `Auto-filled: ${result.district}, ${result.state}`, 
            type: "success" 
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLookingUpPincode(false);
      }
    } else {
      setPincodePostOffices([]);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Payment receipt file must not exceed 5MB.", type: "warning" });
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid File Type", description: "Only JPEG, PNG, WEBP images and PDF files are allowed.", type: "warning" });
      return;
    }

    setIsUploadingFile(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/registrations/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({
        ...prev,
        paymentProofUrl: res.data.fileUrl,
        paymentProofFileName: res.data.fileName || file.name,
      }));
      toast({ title: "Receipt Uploaded", description: "Payment proof attached successfully.", type: "success" });
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Error uploading receipt.');
      toast({ title: "Upload Failed", description: err.response?.data?.message || 'Could not upload file.', type: "error" });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const validateStep1 = () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast({ title: "Name Required", description: "Please enter applicant's full name (at least 2 characters).", type: "warning" });
      return false;
    }
    const cleanPhone = form.phone.replace(/[^0-9]/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast({ title: "Invalid Mobile Number", description: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.", type: "warning" });
      return false;
    }
    if (!form.pan.trim() || !isPanValid(form.pan)) {
      toast({ title: "Invalid PAN Card", description: "PAN must follow standard format: AAAAA9999A (e.g. ABCDE1234F).", type: "warning" });
      return false;
    }
    if (!form.dob) {
      toast({ title: "Date of Birth Required", description: "Please select applicant's date of birth.", type: "warning" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.addressBuilding.trim() || !form.addressState || !form.addressDistrict || !form.addressCity.trim() || !form.addressPincode.trim()) {
      toast({ title: "Incomplete Address", description: "Please complete all address fields.", type: "warning" });
      return false;
    }
    if (form.addressPincode.replace(/\D/g, '').length !== 6) {
      toast({ title: "Invalid Pincode", description: "Pincode must be exactly 6 digits.", type: "warning" });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!form.bankName || !form.bankAccountName.trim() || !form.bankAccountNumber.trim() || !form.bankIfsc.trim()) {
      toast({ title: "Banking Details Required", description: "Please complete all bank account details.", type: "warning" });
      return false;
    }
    const cleanAcc = form.bankAccountNumber.replace(/\D/g, '');
    if (!/^\d{10,16}$/.test(cleanAcc)) {
      toast({ title: "Invalid Account Number", description: "Bank account number must be between 10 and 16 digits containing only numbers.", type: "warning" });
      return false;
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(form.bankIfsc.trim().toUpperCase())) {
      toast({ title: "Invalid IFSC Code", description: "IFSC must follow standard format: ABCD0123456", type: "warning" });
      return false;
    }
    return true;
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.accountType === 'CONTRIBUTION') {
      const amt = Number(form.contributionAmount);
      if (!amt || amt < 100000 || amt % 100000 !== 0) {
        toast({ title: "Invalid Amount", description: "Contribution amount must be in multiples of ₹1,00,000 (minimum ₹1,00,000).", type: "warning" });
        return;
      }
      if (!form.paymentProofUrl) {
        toast({ title: "Payment Proof Required", description: "Please upload the payment deposit receipt (photo or PDF).", type: "warning" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        pan: form.pan.trim().toUpperCase(),
        dob: form.dob,
        accountType: form.accountType,
        contributionDate: form.contributionDate,
        referrerId: shareholder?.id || shareholder?.shareholderId, // Auto-locked to logged-in shareholder
        addressBuilding: form.addressBuilding.trim(),
        addressArea: form.addressArea.trim(),
        addressState: form.addressState,
        addressDistrict: form.addressDistrict,
        addressCity: form.addressCity,
        addressPincode: form.addressPincode,
        bankName: form.bankName,
        bankAccountName: form.bankAccountName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankBranch: form.bankBranch.trim(),
        bankIfsc: form.bankIfsc.trim().toUpperCase(),
      };

      if (form.accountType === 'CONTRIBUTION') {
        payload.contributionAmount = Number(form.contributionAmount);
        payload.paymentProofUrl = form.paymentProofUrl;
        payload.paymentProofFileName = form.paymentProofFileName;
      }

      const res = await api.post('/registrations', payload);
      setSubmittedRequest(res.data);
      toast({ 
        title: "Registration Submitted", 
        description: "Application successfully submitted to the Registration Queue for Super Admin approval.", 
        type: "success" 
      });
    } catch (err: any) {
      toast({ 
        title: "Submission Failed", 
        description: err.response?.data?.message || "Could not submit registration. Please check fields.", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRequest(null);
    setStep(1);
    setForm({
      name: '',
      phone: '',
      dob: '',
      pan: '',
      addressBuilding: '',
      addressArea: '',
      addressState: '',
      addressDistrict: '',
      addressCity: '',
      addressPincode: '',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankBranch: '',
      bankIfsc: '',
      accountType: 'CONTRIBUTION',
      contributionAmount: '100000',
      contributionDate: new Date().toISOString().split('T')[0],
      paymentProofUrl: '',
      paymentProofFileName: '',
    });
  };

  if (submittedRequest) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="app-card text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Registration Request Submitted!</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
              The registration application for <strong className="text-gray-900 dark:text-white">{submittedRequest.name}</strong> has been routed to the Super Admin Registration Queue for verification.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-200 dark:border-gray-800 text-left space-y-3 max-w-lg mx-auto">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Application ID:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{submittedRequest.id}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Applicant Name:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{submittedRequest.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Applicant Mobile:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{submittedRequest.phone}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Sponsor (Direct Referrer):</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">{shareholder?.name} ({shareholder?.shareholderId})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Review Status:</span>
              <span className="badge-warning">
                Pending Admin Approval
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all shadow-theme-xs flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Register Another Direct Referral
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="app-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              Network Expansion
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-brand-600 dark:text-brand-400" /> Direct Referral Registration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Register a new shareholder into your direct referral network.
          </p>
        </div>

        {/* Sponsor Banner */}
        <div className="bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded-lg">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Direct Referrer (Locked)
            </span>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
              {shareholder?.name || shareholder?.shareholderId} ({shareholder?.shareholderId})
            </span>
          </div>
        </div>
      </div>

      {/* Step Navigation Pill - Toggleable between sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 select-none">
        {[
          { num: 1, label: 'Personal & PAN', icon: User },
          { num: 2, label: 'Address', icon: MapPin },
          { num: 3, label: 'Banking Info', icon: Landmark },
          { num: 4, label: 'Contribution & Proof', icon: CreditCard },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              type="button"
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-theme-xs'
                  : isDone
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? 'bg-brand-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {isDone ? '✓' : s.num}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="app-card overflow-hidden">
        <form onSubmit={handleSubmitRegistration} className="space-y-6">
          
          {/* STEP 1: Personal Information */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Step 1: Personal & PAN Information</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enter applicant's legal identity details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium font-mono text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    PAN Card Number * (AAAAA9999A)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      required
                      value={form.pan}
                      onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className={`w-full px-3.5 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none text-xs font-bold font-mono uppercase ${
                        form.pan && !isPanValid(form.pan)
                          ? 'border-rose-500 focus:border-rose-500 text-rose-500'
                          : form.pan && isPanValid(form.pan)
                          ? 'border-emerald-500 focus:border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-800 focus:border-brand-500'
                      }`}
                    />
                    {form.pan && (
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold">
                        {isPanValid(form.pan) ? '✓ Valid' : '✗ 10 chars format'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Date of Birth * (Must be 18+)
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Account Provisioning Notice */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 flex items-start gap-3">
                  <div className="p-1.5 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Admin Security & Credential Setup
                    </span>
                    <span className="text-[11px] text-gray-600 dark:text-gray-300 block mt-0.5 leading-relaxed">
                      Initial login credentials and security parameters will be securely provisioned by the Super Admin in the Registration Queue upon document and payment verification. Credentials will be dispatched directly to the applicant's mobile number via SMS.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-theme-xs"
                >
                  Continue to Address <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Address Details */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Step 2: Residential Address</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enter full residential address details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Building / Flat / House No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressBuilding}
                    onChange={(e) => setForm({ ...form, addressBuilding: e.target.value })}
                    placeholder="e.g. Flat 402, Royal Residency"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Street / Area / Landmark
                  </label>
                  <input
                    type="text"
                    value={form.addressArea}
                    onChange={(e) => setForm({ ...form, addressArea: e.target.value })}
                    placeholder="e.g. MG Road, Near City Mall"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Pincode (6 Digits) *
                    </label>
                    {isLookingUpPincode && (
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
                        Resolving location...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={form.addressPincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="e.g. 110001 (Auto-resolves district & state)"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-bold font-mono text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Entering a 6-digit pincode automatically fills State, District & City.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    State (India) *
                  </label>
                  <select
                    required
                    value={form.addressState}
                    onChange={(e) => setForm({ ...form, addressState: e.target.value, addressDistrict: '' })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value="">Select Indian State / UT</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    District *
                  </label>
                  <select
                    required
                    value={form.addressDistrict}
                    onChange={(e) => setForm({ ...form, addressDistrict: e.target.value })}
                    disabled={!form.addressState}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">{form.addressState ? "Select District" : "Select State First"}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    City / Town / Area *
                  </label>
                  {pincodePostOffices.length > 0 ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        required
                        list="postOfficeList"
                        value={form.addressCity}
                        onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
                        placeholder="Select or enter city/locality"
                        className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                      />
                      <datalist id="postOfficeList">
                        {pincodePostOffices.map((po) => (
                          <option key={po} value={po} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={form.addressCity}
                      onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
                      placeholder="e.g. Connaught Place or Andheri"
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-theme-xs"
                >
                  Continue to Banking <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Banking Information */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Step 3: Bank Account Information</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Used for profit distributions and payout credits.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Bank Name *
                  </label>
                  <select
                    required
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value="">Select Bank</option>
                    {DEFAULT_INDIAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                    placeholder="Must match PAN name"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="e.g. 123456789012"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium font-mono text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={form.bankBranch}
                    onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                    placeholder="e.g. Andheri East"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    IFSC Code * (ABCD0123456)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    required
                    value={form.bankIfsc}
                    onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-bold font-mono uppercase text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep3()) setStep(4);
                  }}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-theme-xs"
                >
                  Continue to Contribution <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Contribution & Payment Proof */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Step 4: Account Type & Payment Proof</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select membership package and attach proof of deposit.</p>
              </div>

              {/* Account Type Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setForm({ ...form, accountType: 'CONTRIBUTION' })}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    form.accountType === 'CONTRIBUTION'
                      ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-brand-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Contribution Account</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      form.accountType === 'CONTRIBUTION' ? 'border-brand-500 bg-brand-600 text-white text-[10px]' : 'border-gray-400'
                    }`}>
                      {form.accountType === 'CONTRIBUTION' && '✓'}
                    </span>
                  </div>
                  <p className="text-xs mt-2 text-gray-500 dark:text-gray-400 font-medium">
                    Standard Investor Account. Full profit share distribution and referral unlocks enabled upon approved capital contribution.
                  </p>
                </div>

                <div
                  onClick={() => setForm({ ...form, accountType: 'ZERO_CONTRIBUTION' })}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    form.accountType === 'ZERO_CONTRIBUTION'
                      ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Zero Contribution Account</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      form.accountType === 'ZERO_CONTRIBUTION' ? 'border-amber-500 bg-amber-500 text-white text-[10px]' : 'border-gray-400'
                    }`}>
                      {form.accountType === 'ZERO_CONTRIBUTION' && '✓'}
                    </span>
                  </div>
                  <p className="text-xs mt-2 text-gray-500 dark:text-gray-400 font-medium">
                    Entry without upfront investment. 100% of gratitude earnings withheld in holding balance until reaching ₹1,00,000 threshold.
                  </p>
                </div>
              </div>

              {/* Date of Investment & Contribution Amount */}
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Date of Investment *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.contributionDate}
                      onChange={(e) => setForm({ ...form, contributionDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Synchronizes across system for profit cycles and calculation eligibility.
                    </p>
                  </div>

                  {form.accountType === 'CONTRIBUTION' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Contribution Amount (Multiples of ₹1,00,000) *
                      </label>
                      <select
                        value={form.contributionAmount}
                        onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-bold font-mono text-gray-900 dark:text-white cursor-pointer"
                      >
                        <option value="100000">₹1,00,000 (1 Unit)</option>
                        <option value="200000">₹2,00,000 (2 Units)</option>
                        <option value="300000">₹3,00,000 (3 Units)</option>
                        <option value="500000">₹5,00,000 (5 Units)</option>
                        <option value="1000000">₹10,00,000 (10 Units)</option>
                        <option value="1500000">₹15,00,000 (15 Units)</option>
                        <option value="2500000">₹25,00,000 (25 Units)</option>
                        <option value="5000000">₹50,00,000 (50 Units)</option>
                      </select>
                    </div>
                  )}
                </div>

                {form.accountType === 'CONTRIBUTION' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Upload Payment Proof / Bank Deposit Slip * (Photo or PDF)
                    </label>
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors bg-gray-50/50 dark:bg-gray-900/40">
                      <input
                        type="file"
                        id="receiptUpload"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="receiptUpload" className="cursor-pointer space-y-2 block">
                        <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto">
                          {isUploadingFile ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>
                        {form.paymentProofFileName ? (
                          <div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                              ✓ {form.paymentProofFileName}
                            </span>
                            <span className="text-[11px] text-gray-400">Click to replace file</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                              {isUploadingFile ? 'Uploading receipt...' : 'Click to upload payment receipt'}
                            </span>
                            <span className="text-[11px] text-gray-400">Supported: JPEG, PNG, WEBP, PDF (Max 5MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Review summary info */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-xs space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Applicant:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{form.name} ({form.phone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">PAN:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{form.pan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Direct Referrer:</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{shareholder?.name} ({shareholder?.shareholderId})</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFile}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-theme-xs"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSubmitting ? 'Submitting Application...' : 'Submit to Registration Queue'}
                </button>
              </div>
            </motion.div>
          )}

        </form>
      </div>
    </div>
  );
}
