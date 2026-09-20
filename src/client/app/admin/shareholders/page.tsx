"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, UserPlus, ShieldAlert, Edit3, X, Check, Eye, Trash2, Key, 
  RotateCcw, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Landmark, MapPin, User, Coins, Wallet, Plus, FileText, FileSpreadsheet,
  ShieldCheck, UserCheck, CheckSquare, Square, Settings, Sliders, CheckCircle2, Clock
} from 'lucide-react';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/exportUtils';
import { 
  getIndianStates, 
  getDistrictsByState, 
  getCitiesByDistrict, 
  getPincodesByCity 
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
  "Jammu & Kashmir Bank",
  "Karur Vysya Bank",
  "South Indian Bank"
];

export default function AdminUsersPage() {
  const shareholder = useAuthStore((state) => state.shareholder);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('SHAREHOLDER');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Admin Creation Modal state
  const [isAdminCreateOpen, setIsAdminCreateOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    shareholderId: '',
    name: '',
    phone: '',
    password: '',
    permissions: {
      shareholders: { view: true, create: true, edit: true, delete: false, approve: false },
      contributions: { view: true, create: false, edit: false, delete: false, approve: true },
      payouts: { view: true, create: true, edit: true, delete: false, approve: true },
      ranks: { view: true, create: false, edit: true, delete: false, approve: true },
      withdrawals: { view: true, create: false, edit: false, delete: false, approve: true },
      financial_requests: { view: true, create: false, edit: false, delete: false, approve: true },
      system_settings: { view: true, create: false, edit: true, delete: false, approve: false },
    } as Record<string, Record<string, boolean>>,
  });

  // Financial Change Requests Modal state
  const [isFinancialRequestsOpen, setIsFinancialRequestsOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedFinancialRequest, setSelectedFinancialRequest] = useState<any>(null);
  const [financialRejectionReason, setFinancialRejectionReason] = useState('');

  // Bank options & Add bank modal state
  const [bankList, setBankList] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom_indian_banks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.from(new Set([...DEFAULT_INDIAN_BANKS, ...parsed]));
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_INDIAN_BANKS;
  });

  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBankInput, setNewBankInput] = useState('');
  const [addBankTarget, setAddBankTarget] = useState<'create' | 'edit'>('create');

  const handleAddNewBank = () => {
    const trimmed = newBankInput.trim();
    if (!trimmed) {
      toast({ title: "Validation Error", description: "Please enter a valid bank name.", type: "warning" });
      return;
    }
    if (!bankList.includes(trimmed)) {
      const updated = [...bankList, trimmed];
      setBankList(updated);
      if (typeof window !== 'undefined') {
        const customOnly = updated.filter(b => !DEFAULT_INDIAN_BANKS.includes(b));
        localStorage.setItem('custom_indian_banks', JSON.stringify(customOnly));
      }
    }
    if (addBankTarget === 'create') {
      setCreateForm(prev => ({ ...prev, bankName: trimmed }));
    } else {
      setEditForm(prev => ({ ...prev, bankName: trimmed }));
    }
    setNewBankInput('');
    setIsAddBankModalOpen(false);
    toast({ title: "Bank Name Added", description: `"${trimmed}" added to bank dropdown and selected.`, type: "success" });
  };

  const isAccountNumberValid = (accNum: string) => {
    if (!accNum) return true;
    return /^\d{15}$/.test(accNum);
  };

  const isPanValid = (panStr: string) => {
    if (!panStr) return true;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panStr.trim().toUpperCase());
  };

  // Wizard Creation Step
  const [wizardStep, setWizardStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [referrerName, setReferrerName] = useState('');
  const [isValidatingReferrer, setIsValidatingReferrer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    shareholderId: '',
    password: '',
    role: 'SHAREHOLDER',
    accountType: 'CONTRIBUTION',
    withholdingPercentage: '20',
    status: 'ACTIVE',
    name: '',
    phone: '',
    pan: '',
    dob: '',
    addressBuilding: '',
    addressArea: '',
    addressCity: '',
    addressDistrict: '',
    addressPincode: '',
    addressState: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankBranch: '',
    bankIfsc: '',
    referrerId: '',
    contributionAmount: '',
    contributionMode: 'Bank Transfer',
    contributionDate: new Date().toISOString().split('T')[0],
    issuedAgreement: false,
    issuedCheque: false,
    validityMonths: '12',
  });

  const [editForm, setEditForm] = useState<any>({
    shareholderId: '',
    firstName: '',
    lastName: '',
    phone: '',
    pan: '',
    accountType: 'CONTRIBUTION',
    withholdingPercentage: '20',
    dob: '',
    addressBuilding: '',
    addressArea: '',
    addressCity: '',
    addressDistrict: '',
    addressPincode: '',
    addressState: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankBranch: '',
    bankIfsc: '',
    referrerId: '',
    contributionAmount: '',
    contributionMode: 'Bank Transfer',
    contributionDate: new Date().toISOString().split('T')[0],
    issuedAgreement: false,
    issuedCheque: false,
    validityMonths: '12',
  });

  // Fetch Shareholders
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const res = await api.get('/shareholders', {
        params: { search, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 15 },
      });
      return res.data;
    },
  });

  // Disable Mutation
  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/shareholders/${id}/disable`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({ title: "Account Disabled", description: "The shareholder account access has been suspended.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error disabling shareholder', type: "error" });
    },
  });

  // Enable / Restore Mutation
  const enableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/shareholders/${id}/enable`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({ title: "Account Activated", description: "The shareholder account access has been restored.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error activating shareholder', type: "error" });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shareholders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsDeleteOpen(false);
      setSelectedUser(null);
      toast({ title: "Account Deleted", description: "The shareholder has been soft-deleted from active system indices.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error deleting shareholder', type: "error" });
    },
  });

  // Fetch Pending Financial Requests
  const { data: financialRequestsData } = useQuery({
    queryKey: ['adminFinancialRequests'],
    queryFn: async () => {
      const res = await api.get('/shareholders/admin/financial-requests?status=PENDING');
      return res.data;
    },
  });

  const pendingFinancialCount = financialRequestsData?.total || financialRequestsData?.data?.length || 0;

  // Create Admin User Mutation (Super Admin Only)
  const createAdminUserMutation = useMutation({
    mutationFn: async () => {
      await api.post('/shareholders/admin', adminForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsAdminCreateOpen(false);
      setAdminForm({
        shareholderId: '',
        name: '',
        phone: '',
        password: '',
        permissions: {
          shareholders: { view: true, create: true, edit: true, delete: false, approve: false },
          contributions: { view: true, create: false, edit: false, delete: false, approve: true },
          payouts: { view: true, create: true, edit: true, delete: false, approve: true },
          ranks: { view: true, create: false, edit: true, delete: false, approve: true },
          withdrawals: { view: true, create: false, edit: false, delete: false, approve: true },
          financial_requests: { view: true, create: false, edit: false, delete: false, approve: true },
          system_settings: { view: true, create: false, edit: true, delete: false, approve: false },
        },
      });
      toast({ title: "Admin Account Created", description: "New Admin operator registered with defined task permissions.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Admin Creation Failed", description: err.response?.data?.message || 'Error creating admin user', type: "error" });
    },
  });

  // Approve Financial Request Mutation
  const approveFinancialRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/shareholders/admin/financial-requests/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinancialRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({ title: "Financial Request Approved", description: "Shareholder banking & PAN details updated successfully.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Approval Failed", description: err.response?.data?.message || 'Error approving request', type: "error" });
    },
  });

  // Reject Financial Request Mutation
  const rejectFinancialRequestMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/shareholders/admin/financial-requests/${selectedFinancialRequest.id}/reject`, {
        reason: financialRejectionReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinancialRequests'] });
      setRejectModalOpen(false);
      setSelectedFinancialRequest(null);
      setFinancialRejectionReason('');
      toast({ title: "Financial Request Rejected", description: "Request status updated to Rejected.", type: "warning" });
    },
    onError: (err: any) => {
      toast({ title: "Rejection Failed", description: err.response?.data?.message || 'Error rejecting request', type: "error" });
    },
  });

  // Admin Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.trim().length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      return api.post(`/shareholders/${selectedUser.id}/reset-password`, {
        password: newPassword.trim(),
      });
    },
    onSuccess: (res) => {
      toast({
        title: "Password Reset Successfully",
        description: res.data?.message || `Password for ${selectedUser?.shareholderId} has been reset.`,
        type: "success"
      });
      setIsResetOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast({
        title: "Password Reset Failed",
        description: err.response?.data?.message || err.message || 'Error resetting password',
        type: "error"
      });
    },
  });

  // Fetch Next ID when wizard opens
  React.useEffect(() => {
    if (isCreateOpen) {
      setHighestStepReached(1);
      setWizardStep(1);
      api.get('/shareholders/next-id').then(res => {
        setCreateForm(prev => ({ ...prev, shareholderId: res.data.nextId }));
      }).catch(console.error);
    }
  }, [isCreateOpen]);

  // Validate Referrer Code
  const validateReferrer = async (code: string) => {
    if (!code) {
      setReferrerName('');
      return;
    }
    setIsValidatingReferrer(true);
    try {
      const res = await api.get(`/shareholders/validate-referral/${code}`);
      setReferrerName(res.data.name);
    } catch (err: any) {
      setReferrerName('');
      toast({ title: "Invalid Referrer", description: err.response?.data?.message || "Referrer ID not found", type: "error" });
    } finally {
      setIsValidatingReferrer(false);
    }
  };

  const handleStepperClick = (step: number) => {
    if (step <= highestStepReached) {
      setWizardStep(step);
    }
  };

  // Create Mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post('/shareholders', createForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsCreateOpen(false);
      setWizardStep(1);
      setCreateForm({
        shareholderId: '',
        password: '',
        role: 'SHAREHOLDER',
        accountType: 'CONTRIBUTION',
        withholdingPercentage: '20',
        status: 'ACTIVE',
        name: '',
        phone: '',
        pan: '',
        dob: '',
        addressBuilding: '',
        addressArea: '',
        addressCity: '',
        addressDistrict: '',
        addressPincode: '',
        addressState: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankName: '',
        bankBranch: '',
        bankIfsc: '',
        referrerId: '',
        contributionAmount: '',
        contributionMode: 'Bank Transfer',
        contributionDate: new Date().toISOString().split('T')[0],
        issuedAgreement: false,
        issuedCheque: false,
        validityMonths: '12',
      });
      toast({ title: "Shareholder Account Registered", description: "A new client profile and initial placements have been registered.", type: "success" });
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        const errorList = Object.entries(errors).map(([field, msg]) => `• ${field}: ${msg}`).join('\n');
        toast({ title: "Validation Failed", description: `Please check creation values:\n${errorList}`, type: "error" });
      } else {
        toast({ title: "Registration Error", description: err.response?.data?.message || 'Error creating shareholder', type: "error" });
      }
    },
  });

  // Edit Shareholder Mutation
  const editUserMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/shareholders/${selectedUser.id}`, editForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsEditOpen(false);
      setSelectedUser(null);
      toast({ title: "Profile Updated", description: "Successfully updated shareholder coordinates and parameters.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.response?.data?.message || 'Error updating shareholder profile', type: "error" });
    },
  });

  // Approve Contribution Mutation
  const approveContributionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/investors/contributions/${id}/approve`);
    },
    onSuccess: (_, contributionId) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          contributions: selectedUser.contributions.map((c: any) =>
            c.id === contributionId ? { ...c, status: 'APPROVED' } : c
          )
        });
      }
      toast({ title: "Contribution Approved", description: "Capital verified. Shareholder classified as Active Investor.", type: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.response?.data?.message || 'Error approving contribution', type: "error" });
    },
  });

  // Reject Contribution Mutation
  const rejectContributionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/investors/contributions/${id}/reject`);
    },
    onSuccess: (_, contributionId) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          contributions: selectedUser.contributions.map((c: any) =>
            c.id === contributionId ? { ...c, status: 'REJECTED' } : c
          )
        });
      }
      toast({ title: "Contribution Rejected", description: "Deposit transaction status flagged as Rejected.", type: "warning" });
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.response?.data?.message || 'Error rejecting contribution', type: "error" });
    },
  });

  const isSuperAdmin = shareholder?.role === 'SUPER_ADMIN';

  const isIfscValid = (ifsc: string) => {
    if (!ifsc) return true; // optional
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const handleOpenEdit = (u: any) => {
    setSelectedUser(u);
    setEditForm({
      shareholderId: u.shareholderId,
      firstName: u.firstName || (u.name ? u.name.split(' ')[0] : ''),
      lastName: u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : ''),
      phone: u.phone || '',
      pan: u.pan || '',
      accountType: u.accountType || 'CONTRIBUTION',
      withholdingPercentage: u.withholdingPercentage != null ? String(u.withholdingPercentage) : (u.accountType === 'ZERO_CONTRIBUTION' ? '20' : '0'),
      dob: u.dob ? u.dob.split('T')[0] : '',
      addressBuilding: u.addressBuilding || '',
      addressArea: u.addressArea || '',
      addressCity: u.addressCity || '',
      addressDistrict: u.addressDistrict || '',
      addressPincode: u.addressPincode || '',
      addressState: u.addressState || '',
      bankAccountName: u.bankAccountName || '',
      bankAccountNumber: u.bankAccountNumber || '',
      bankName: u.bankName || '',
      bankBranch: u.bankBranch || '',
      bankIfsc: u.bankIfsc || '',
      referrerId: u.parentId || '',
      contributionAmount: '',
      contributionMode: 'Bank Transfer',
      contributionDate: new Date().toISOString().split('T')[0],
      issuedAgreement: u.contributions?.[0]?.issuedAgreement ?? false,
      issuedCheque: u.contributions?.[0]?.issuedCheque ?? false,
      validityMonths: '12',
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (u: any) => {
    setSelectedUser(u);
    setIsViewOpen(true);
  };

  const triggerDisableToggle = async (u: any) => {
    const isActivating = u.status === 'DISABLED' || u.status === 'AUTO_ARCHIVED';
    const descriptionText = isActivating 
      ? `This will restore account access permissions for ${u.shareholderId}. Do you wish to proceed?`
      : `This will suspend active login privileges for ${u.shareholderId}. The shareholder will be blocked from their dashboard. Do you wish to proceed?`;
      
    const ok = await confirm({
      title: isActivating ? "Activate Shareholder Account" : "Suspend Shareholder Account",
      description: descriptionText,
      confirmText: isActivating ? "Activate" : "Suspend",
      variant: isActivating ? "success" : "danger"
    });

    if (ok) {
      if (isActivating) {
        enableMutation.mutate(u.id);
      } else {
        disableMutation.mutate(u.id);
      }
    }
  };

  const handleExportShareholdersCSV = () => {
    const list = usersData?.users || [];
    if (list.length === 0) {
      toast({ title: "No Data", description: "No shareholders available to export.", type: "warning" });
      return;
    }
    const columns: ExportColumn[] = [
      { header: 'Shareholder ID', key: 'shareholderId' },
      { header: 'Name', key: 'name' },
      { header: 'Phone', key: 'phone' },
      { header: 'Role', key: 'role' },
      { header: 'Account Type', key: 'accountType', formatter: (v) => v === 'ZERO_CONTRIBUTION' ? 'Zero Contribution' : 'Standard' },
      { header: 'Withholding %', key: 'withholdingPercentage', formatter: (v, row) => row.accountType === 'ZERO_CONTRIBUTION' ? `${v ?? 20}%` : '0% (N/A)' },
      { header: 'Status', key: 'status' },
      { header: 'Referral Code', key: 'referralCode' },
      { header: 'Bank Name', key: 'bankName' },
      { header: 'Bank Account', key: 'bankAccountNumber' },
      { header: 'IFSC Code', key: 'bankIfsc' },
    ];
    exportToCSV('shareholders_directory', columns, list);
    toast({ title: "CSV Downloaded", description: "Exported shareholder directory to CSV.", type: "success" });
  };

  const handleExportShareholdersPDF = () => {
    const list = usersData?.users || [];
    if (list.length === 0) {
      toast({ title: "No Data", description: "No shareholders available to export.", type: "warning" });
      return;
    }
    const columns: ExportColumn[] = [
      { header: 'ID', key: 'shareholderId' },
      { header: 'Name', key: 'name' },
      { header: 'Phone', key: 'phone', formatter: (v) => v || '-' },
      { header: 'Role', key: 'role' },
      { header: 'Account Type', key: 'accountType', formatter: (v) => v === 'ZERO_CONTRIBUTION' ? 'Zero Contribution' : 'Standard' },
      { header: 'Withholding %', key: 'withholdingPercentage', formatter: (v, row) => row.accountType === 'ZERO_CONTRIBUTION' ? `${v ?? 20}%` : '0% (N/A)' },
      { header: 'Status', key: 'status' },
      { header: 'Bank Name', key: 'bankName', formatter: (v) => v || '-' },
      { header: 'Account No.', key: 'bankAccountNumber', formatter: (v) => v || '-' },
      { header: 'IFSC Code', key: 'bankIfsc', formatter: (v) => v || '-' },
    ];
    exportToPDF(
      'shareholders_directory',
      'Shareholder Directory Report',
      `Filter: ${roleFilter || 'All Roles'} | ${statusFilter || 'All Statuses'}`,
      columns,
      list,
      [{ label: 'Total Shareholders', value: list.length }]
    );
    toast({ title: "PDF Generated", description: "Opened printable shareholder report.", type: "success" });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Shareholder Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage shareholder lifecycle coordinates, bank details, and network links.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsFinancialRequestsOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-all shadow-theme-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs relative"
          >
            <Clock size={14} /> 
            <span>Financial Requests</span>
            {pendingFinancialCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingFinancialCount}
              </span>
            )}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdminCreateOpen(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-3.5 py-2 rounded-xl transition-all shadow-theme-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <ShieldCheck size={14} /> 
              <span>Create Admin</span>
            </button>
          )}
          <button
            onClick={handleExportShareholdersCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-all shadow-theme-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
          >
            <FileSpreadsheet size={14} /> 
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportShareholdersPDF}
            className="bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-all shadow-theme-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
          >
            <FileText size={14} /> 
            <span>PDF</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-theme-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
          >
            <UserPlus size={14} /> 
            <span>Creation Wizard</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 flex flex-col md:flex-row gap-3 items-center select-none">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search ID, shareholder ID, name, or referral code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 dark:bg-gray-800/50 dark:border-gray-700 focus:outline-none focus:border-brand-500 text-xs font-medium dark:text-white"
          />
        </div>
        <div className="flex gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer shadow-theme-xs"
          >
            <option value="">All Roles</option>
            <option value="SHAREHOLDER">Shareholder</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer shadow-theme-xs"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="AUTO_ARCHIVED">Auto Archived</option>
            <option value="RESTORED">Restored</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
      </div>

      {/* Shareholders Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs font-semibold">Loading shareholder database...</p>
          </div>
        ) : usersData?.data?.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-2.5 opacity-30" />
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No Shareholders Found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">No accounts found matching query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Shareholder ID</th>
                  <th className="px-5 py-3.5">Phone / Location</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Account Type</th>
                  <th className="px-5 py-3.5">Withholding %</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Total Contribution</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-200 font-medium">
                {usersData?.data?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-gray-950 dark:text-white">{u.name || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-extrabold text-brand-primary">
                      {u.shareholderId}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{u.phone || '-'}</div>
                      {u.addressCity && <div className="text-[10px] text-muted-foreground">{u.addressCity}{u.addressState ? `, ${u.addressState}` : ''}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        u.role === 'SUPER_ADMIN' 
                          ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/40' 
                          : u.role === 'ADMIN'
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
                          : 'bg-gray-50 dark:bg-secondary/40 text-gray-700 dark:text-gray-300 border-border-subtle'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        u.accountType === 'ZERO_CONTRIBUTION'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                          : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                      }`}>
                        {u.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.accountType === 'ZERO_CONTRIBUTION' ? (
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 cursor-pointer text-[10px]"
                          title="Click to edit withholding %"
                        >
                          <span>{u.withholdingPercentage != null ? `${u.withholdingPercentage}%` : '20%'}</span>
                          <Edit3 size={10} className="opacity-60" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold">0% (N/A)</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${
                        u.status === 'ACTIVE' || u.status === 'RESTORED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' 
                          : u.status === 'DISABLED' || u.status === 'BLOCKED'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/40'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      ₹{(u.contributions
                        ? u.contributions
                            .filter((c: any) => c.status === 'APPROVED')
                            .reduce((sum: number, c: any) => sum + Number(c.amount), 0)
                        : 0
                      ).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedUser(u); setIsResetOpen(true); }}
                        className="px-2 py-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800/40 inline-flex items-center gap-1 transition-all cursor-pointer shadow-theme-xs"
                        title="Reset Shareholder Password"
                      >
                        <Key size={11} />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={() => handleOpenView(u)}
                        className="p-1.5 hover:bg-muted dark:hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 hover:bg-muted dark:hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title="Edit Shareholder"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => triggerDisableToggle(u)}
                        disabled={u.status === 'AUTO_ARCHIVED' && !isSuperAdmin}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          u.status === 'AUTO_ARCHIVED' && !isSuperAdmin 
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        title={u.status === 'DISABLED' || u.status === 'AUTO_ARCHIVED' ? 'Activate Account' : 'Suspend Account'}
                      >
                        {u.status === 'DISABLED' || u.status === 'AUTO_ARCHIVED' ? <Check size={14} /> : <ShieldAlert size={14} />}
                      </button>
                      <button
                        onClick={() => { setSelectedUser(u); setIsDeleteOpen(true); }}
                        className="p-2 hover:bg-red-50 hover:text-red-650 rounded-xl text-muted-foreground transition-all cursor-pointer"
                        title="Delete Shareholder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && usersData?.lastPage > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border-subtle mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Page {page} of {usersData?.lastPage || 1}</span>
          <button
            onClick={() => setPage(p => Math.min(usersData?.lastPage || 1, p + 1))}
            disabled={page >= (usersData?.lastPage || 1)}
            className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-muted dark:hover:bg-secondary cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}

      {/* CREATE SHAREHOLDER MULTI-STEP WIZARD */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white dark:bg-card rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Register Shareholder Wizard</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Configure client parameters sequentially.</p>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"><X size={16} /></button>
              </div>

              {/* Step indicator */}
              <div className="px-6 py-3.5 bg-brand-primary/5 border-b border-brand-primary/10 flex items-center justify-between text-[10px] font-bold text-brand-primary select-none">
                <span onClick={() => handleStepperClick(1)} className={`cursor-pointer hover:underline ${wizardStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>1. Account</span>
                <ArrowRight size={10} />
                <span onClick={() => handleStepperClick(2)} className={`cursor-pointer hover:underline ${highestStepReached >= 2 ? 'opacity-100' : 'opacity-40'}`}>2. Personal</span>
                <ArrowRight size={10} />
                <span onClick={() => handleStepperClick(3)} className={`cursor-pointer hover:underline ${highestStepReached >= 3 ? 'opacity-100' : 'opacity-40'}`}>3. Bank</span>
                <ArrowRight size={10} />
                <span onClick={() => handleStepperClick(4)} className={`cursor-pointer hover:underline ${highestStepReached >= 4 ? 'opacity-100' : 'opacity-40'}`}>4. Referrer</span>
                <ArrowRight size={10} />
                <span onClick={() => handleStepperClick(5)} className={`cursor-pointer hover:underline ${highestStepReached >= 5 ? 'opacity-100' : 'opacity-40'}`}>5. Capital</span>
                <ArrowRight size={10} />
                <span onClick={() => handleStepperClick(6)} className={`cursor-pointer hover:underline ${highestStepReached >= 6 ? 'opacity-100' : 'opacity-40'}`}>6. Review</span>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {wizardStep === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 1: Account Parameters</h4>
                    <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl flex items-center gap-3">
                      <User className="text-brand-primary w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Business Configuration ID Format</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Shareholder ID / Admin ID format is strictly governed by the active <strong>Business Configuration</strong> module rules (Prefix + Padded Counter).</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shareholder / Admin ID *</label>
                        <span className="text-[9px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">Configured Pattern</span>
                      </div>
                      <input 
                        type="text" 
                        required 
                        value={createForm.shareholderId} 
                        onChange={e => setCreateForm({...createForm, shareholderId: e.target.value.toUpperCase()})} 
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 tracking-wider" 
                        placeholder="e.g. SH100001" 
                      />
                      <p className="text-[9px] text-muted-foreground">Auto-generated sequential ID based on active Business Configuration.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Password *</label>
                      <input type="password" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Role</label>
                      <select value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer">
                        <option value="SHAREHOLDER">Shareholder</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Type *</label>
                        <select 
                          value={createForm.accountType} 
                          onChange={e => {
                            const newType = e.target.value;
                            setCreateForm(prev => ({
                              ...prev,
                              accountType: newType,
                              withholdingPercentage: newType === 'ZERO_CONTRIBUTION' ? (prev.withholdingPercentage && prev.withholdingPercentage !== '0' ? prev.withholdingPercentage : '20') : '0',
                            }));
                          }} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                        >
                          <option value="CONTRIBUTION">Standard Contribution Account</option>
                          <option value="ZERO_CONTRIBUTION">Zero Contribution Account</option>
                        </select>
                        <p className="text-[9px] text-muted-foreground">Standard gets full profit & gratitude share; Zero Contribution applies gratitude withholding.</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gratitude Share Withholding (%)</label>
                          {createForm.accountType !== 'ZERO_CONTRIBUTION' && (
                            <span className="text-[9px] font-semibold text-gray-500 bg-secondary px-1.5 py-0.5 rounded">Not Applicable</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            step="0.1"
                            disabled={createForm.accountType !== 'ZERO_CONTRIBUTION'}
                            value={createForm.accountType === 'ZERO_CONTRIBUTION' ? createForm.withholdingPercentage : ''} 
                            onChange={e => setCreateForm({...createForm, withholdingPercentage: e.target.value})} 
                            className={`w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 ${createForm.accountType !== 'ZERO_CONTRIBUTION' ? 'opacity-40 cursor-not-allowed bg-muted/40' : ''}`} 
                            placeholder={createForm.accountType !== 'ZERO_CONTRIBUTION' ? "0% (Standard Account - No Withholding)" : "20"} 
                          />
                          <span className="text-xs font-bold text-gray-500">%</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {createForm.accountType === 'ZERO_CONTRIBUTION' 
                            ? "Admin setting for % of gratitude share withheld by system for zero contribution accounts." 
                            : "Withholding is not applicable for Standard Contribution accounts."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 2: Personal Profile & Details</h4>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name *</label>
                      <input type="text" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="John Doe" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number *</label>
                        <input type="text" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="+91 9876543210" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">PAN Card Number</label>
                        <input type="text" maxLength={10} value={createForm.pan} onChange={e => setCreateForm({...createForm, pan: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="ABCDE1234F" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</label>
                        <input type="date" value={createForm.dob} onChange={e => setCreateForm({...createForm, dob: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1 pt-2">Complete Address Coordinates</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Building / Street</label>
                        <input type="text" value={createForm.addressBuilding} onChange={e => setCreateForm({...createForm, addressBuilding: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="Apt 4B, 12 Elm St" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area / Locality</label>
                        <input type="text" value={createForm.addressArea} onChange={e => setCreateForm({...createForm, addressArea: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="Greenwood" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">State (India) *</label>
                        <select 
                          value={createForm.addressState} 
                          onChange={e => {
                            const val = e.target.value;
                            setCreateForm(prev => ({ ...prev, addressState: val, addressDistrict: '', addressCity: '', addressPincode: '' }));
                          }} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 bg-white cursor-pointer"
                        >
                          <option value="">Select Indian State / UT...</option>
                          {getIndianStates().map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">District *</label>
                        <select 
                          value={createForm.addressDistrict} 
                          onChange={e => {
                            const val = e.target.value;
                            setCreateForm(prev => ({ ...prev, addressDistrict: val, addressCity: '', addressPincode: '' }));
                          }} 
                          disabled={!createForm.addressState}
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 bg-white cursor-pointer disabled:opacity-50"
                        >
                          <option value="">{createForm.addressState ? "Select District..." : "Select State First"}</option>
                          {getDistrictsByState(createForm.addressState).map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">City / Locality *</label>
                        <select 
                          value={createForm.addressCity} 
                          onChange={e => {
                            const val = e.target.value;
                            const pins = getPincodesByCity(createForm.addressState, createForm.addressDistrict, val);
                            setCreateForm(prev => ({ 
                              ...prev, 
                              addressCity: val, 
                              addressPincode: pins.length > 0 ? pins[0] : prev.addressPincode 
                            }));
                          }} 
                          disabled={!createForm.addressDistrict}
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 bg-white cursor-pointer disabled:opacity-50"
                        >
                          <option value="">{createForm.addressDistrict ? "Select City..." : "Select District First"}</option>
                          {getCitiesByDistrict(createForm.addressState, createForm.addressDistrict).map(ct => (
                            <option key={ct} value={ct}>{ct}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pincode *</label>
                        {getPincodesByCity(createForm.addressState, createForm.addressDistrict, createForm.addressCity).length > 0 ? (
                          <select 
                            value={createForm.addressPincode} 
                            onChange={e => setCreateForm({ ...createForm, addressPincode: e.target.value })} 
                            className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 bg-white cursor-pointer"
                          >
                            <option value="">Select Pincode...</option>
                            {getPincodesByCity(createForm.addressState, createForm.addressDistrict, createForm.addressCity).map(pin => (
                              <option key={pin} value={pin}>{pin}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            maxLength={6}
                            value={createForm.addressPincode} 
                            onChange={e => setCreateForm({ ...createForm, addressPincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} 
                            className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" 
                            placeholder="6-digit Pincode" 
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 3: Bank Details</h4>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Name</label>
                      <input type="text" value={createForm.bankAccountName} onChange={e => setCreateForm({...createForm, bankAccountName: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                      <input 
                        type="text" 
                        value={createForm.bankAccountNumber} 
                        onChange={e => setCreateForm({...createForm, bankAccountNumber: e.target.value})} 
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" 
                        placeholder="Enter account number" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name (Indian Banks)</label>
                          <button
                            type="button"
                            onClick={() => { setAddBankTarget('create'); setIsAddBankModalOpen(true); }}
                            className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus size={12} /> Add Bank
                          </button>
                        </div>
                        <select 
                          value={createForm.bankName} 
                          onChange={e => {
                            if (e.target.value === 'ADD_NEW') {
                              setAddBankTarget('create');
                              setIsAddBankModalOpen(true);
                            } else {
                              setCreateForm({...createForm, bankName: e.target.value});
                            }
                          }} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-bold text-muted-foreground bg-white dark:bg-card focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                        >
                          <option value="">Select Indian Bank...</option>
                          {bankList.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="ADD_NEW" className="font-bold text-brand-primary">+ Add New Bank...</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Branch</label>
                        <input type="text" value={createForm.bankBranch} onChange={e => setCreateForm({...createForm, bankBranch: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="Downtown Branch" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC / Routing Code</label>
                      <input 
                        type="text" 
                        value={createForm.bankIfsc} 
                        onChange={e => setCreateForm({...createForm, bankIfsc: e.target.value.toUpperCase()})} 
                        className={`w-full px-4 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 ${createForm.bankIfsc && !isIfscValid(createForm.bankIfsc) ? 'border-red-500 bg-red-500/5' : 'border-border-subtle'}`} 
                        placeholder="ABCD0123456" 
                      />
                      {createForm.bankIfsc && !isIfscValid(createForm.bankIfsc) && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Expected IFSC format: 4 uppercase characters, a zero, 6 alpha-numeric digits.</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {wizardStep === 4 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 4: Referral Links</h4>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Referrer Shareholder ID *</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={createForm.referrerId} 
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            setCreateForm({...createForm, referrerId: val});
                            if (val.length >= 3) {
                              validateReferrer(val);
                            } else {
                              setReferrerName('');
                            }
                          }} 
                          onBlur={(e) => validateReferrer(e.target.value)} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 font-mono uppercase" 
                          placeholder="e.g. SH000000 or SH100001" 
                        />
                      </div>
                      {isValidatingReferrer && <p className="text-[10px] text-brand-primary mt-1">Validating referrer...</p>}
                      {referrerName && <p className="text-[10px] text-emerald-500 mt-1 font-bold">✓ Valid Referrer: {referrerName}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                        Enter the Shareholder ID of the parent referrer. Referral code is equal to Shareholder ID.
                      </p>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 5 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 5: Capital Contribution</h4>
                    
                    {createForm.accountType === 'ZERO_CONTRIBUTION' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                        <strong>Zero Contribution Account:</strong> Capital deposit is optional (can be ₹0). The system will withhold {createForm.withholdingPercentage}% of Gratitude commissions into holding ledger until requirements are met.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contribution Fund (₹)</label>
                        <input type="number" value={createForm.contributionAmount} onChange={e => setCreateForm({...createForm, contributionAmount: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35" placeholder="5000" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Mode</label>
                        <select value={createForm.contributionMode} onChange={e => setCreateForm({...createForm, contributionMode: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer">
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Online Payment">Online Payment</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Investment *</label>
                        <input type="date" required value={createForm.contributionDate} onChange={e => setCreateForm({...createForm, contributionDate: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary dark:bg-secondary/35 text-muted-foreground" />
                        <p className="text-[9px] text-muted-foreground">Syncs with system profit calculations</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fund Validity</label>
                        <select value={createForm.validityMonths} onChange={e => setCreateForm({...createForm, validityMonths: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer">
                          <option value="1">1 Month</option>
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="4">4 Months</option>
                          <option value="5">5 Months</option>
                          <option value="6">6 Months</option>
                          <option value="7">7 Months</option>
                          <option value="8">8 Months</option>
                          <option value="9">9 Months</option>
                          <option value="10">10 Months</option>
                          <option value="11">11 Months</option>
                          <option value="12">12 Months</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2.5 pt-2 select-none">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={createForm.issuedAgreement} onChange={e => setCreateForm({...createForm, issuedAgreement: e.target.checked})} className="rounded text-brand-primary focus:ring-brand-primary w-4.5 h-4.5" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Issued Legal Agreement Paperwork</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={createForm.issuedCheque} onChange={e => setCreateForm({...createForm, issuedCheque: e.target.checked})} className="rounded text-brand-primary focus:ring-brand-primary w-4.5 h-4.5" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Issued Verification Security Cheque</span>
                      </label>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 6 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 6: Review Parameters</h4>
                    <div className="bg-muted/30 dark:bg-secondary/15 rounded-2xl p-4 text-xs space-y-3 border border-border-subtle">
                      <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border-subtle">
                        <div><strong className="text-muted-foreground">shareholderId:</strong> {createForm.shareholderId}</div>
                        <div><strong className="text-muted-foreground">Role:</strong> {createForm.role}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border-subtle">
                        <div><strong className="text-muted-foreground">Account Type:</strong> {createForm.accountType === 'ZERO_CONTRIBUTION' ? 'Zero Contribution' : 'Standard Contribution'}</div>
                        <div><strong className="text-muted-foreground">Withholding Rate:</strong> {createForm.withholdingPercentage}%</div>
                      </div>
                      <div className="pb-2 border-b border-border-subtle">
                        <strong className="text-muted-foreground">Full Name:</strong> {createForm.name || '-'}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border-subtle">
                        <div><strong className="text-muted-foreground">Phone:</strong> {createForm.phone || '-'}</div>
                        <div><strong className="text-muted-foreground">PAN Card:</strong> {createForm.pan || '-'}</div>
                      </div>
                      <div className="pb-2 border-b border-border-subtle">
                        <strong className="text-muted-foreground">DOB:</strong> {createForm.dob || '-'}
                      </div>
                      <div className="pb-2 border-b border-border-subtle leading-relaxed">
                        <strong className="text-muted-foreground block mb-1">Address Coordinates:</strong>
                        {createForm.addressBuilding && `${createForm.addressBuilding}, `}
                        {createForm.addressArea && `${createForm.addressArea}, `}
                        {createForm.addressCity && `${createForm.addressCity}, `}
                        {createForm.addressDistrict && `${createForm.addressDistrict}, `}
                        {createForm.addressState && `${createForm.addressState} - `}
                        {createForm.addressPincode}
                        {!createForm.addressBuilding && '-'}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border-subtle">
                        <div><strong className="text-muted-foreground">Bank Account Name:</strong> {createForm.bankAccountName || '-'}</div>
                        <div><strong className="text-muted-foreground">Account Number:</strong> {createForm.bankAccountNumber || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border-subtle">
                        <div><strong className="text-muted-foreground">Bank Name:</strong> {createForm.bankName || '-'}</div>
                        <div><strong className="text-muted-foreground">Branch:</strong> {createForm.bankBranch || '-'}</div>
                        <div><strong className="text-muted-foreground">IFSC:</strong> {createForm.bankIfsc || '-'}</div>
                      </div>
                      <div className="pb-2 border-b border-border-subtle">
                        <strong className="text-muted-foreground">Referrer Identifier:</strong> {createForm.referrerId || 'None'}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><strong className="text-muted-foreground">Fund Amount:</strong> ₹{createForm.contributionAmount || '0'}</div>
                        <div><strong className="text-muted-foreground">Mode:</strong> {createForm.contributionMode}</div>
                        <div><strong className="text-muted-foreground">Validity:</strong> {createForm.validityMonths} Mos</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold">
                        <span className={createForm.issuedAgreement ? 'text-emerald-600 font-bold flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                          {createForm.issuedAgreement ? '✓ Signed Agreement Issued' : '✕ Agreement Not Issued'}
                        </span>
                        <span className={createForm.issuedCheque ? 'text-emerald-600 font-bold flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                          {createForm.issuedCheque ? '✓ Company Cheque Issued' : '✕ Cheque Not Issued'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Wizard Footer Controls */}
              <div className="p-4 border-t border-border-subtle bg-muted/10 flex items-center justify-between select-none">
                {wizardStep > 1 ? (
                  <button
                    onClick={() => setWizardStep(s => s - 1)}
                    className="flex items-center gap-1 px-4 py-2 border border-border-subtle rounded-xl hover:bg-muted dark:hover:bg-secondary text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                ) : (
                  <div></div>
                )}

                {wizardStep < 6 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1) {
                        if (!createForm.shareholderId || !createForm.password) {
                          toast({ title: "Inputs Required", description: "Account ID and password details are required.", type: "warning" });
                          return;
                        }
                        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
                        if (!passwordRegex.test(createForm.password)) {
                          toast({ title: "Weak Password", description: "Password must be at least 8 characters, with uppercase, lowercase, numeric, and special characters.", type: "warning" });
                          return;
                        }
                      }
                      if (wizardStep === 2) {
                        if (!createForm.name?.trim()) {
                          toast({ title: "Input Required", description: "Name field is required.", type: "warning" });
                          return;
                        }
                        if (createForm.pan) {
                          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                          if (!panRegex.test(createForm.pan.trim().toUpperCase())) {
                            toast({ title: "Invalid PAN Format", description: "Standard Indian PAN format: AAAAA9999A (e.g. ABCDE1234F).", type: "warning" });
                            return;
                          }
                        }
                        if (createForm.dob) {
                          const age = (new Date().getTime() - new Date(createForm.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                          if (age < 18) {
                            toast({ title: "Age Restriction", description: "Shareholder must be at least 18 years old.", type: "warning" });
                            return;
                          }
                        }
                      }
                      if (wizardStep === 3) {
                        if (createForm.bankAccountNumber && !isAccountNumberValid(createForm.bankAccountNumber)) {
                          toast({ title: "Account Number Mismatch", description: "Bank Account Number must be strictly 15 numeric digits.", type: "warning" });
                          return;
                        }
                        if (createForm.bankIfsc && !isIfscValid(createForm.bankIfsc)) {
                          toast({ title: "IFSC Mismatch", description: "Please enter a valid IFSC code block.", type: "warning" });
                          return;
                        }
                      }
                      setWizardStep(s => s + 1);
                      setHighestStepReached(Math.max(highestStepReached, wizardStep + 1));
                    }}
                    className="flex items-center gap-1 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase tracking-wider"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => createUserMutation.mutate()}
                    disabled={createUserMutation.isPending}
                    className="flex items-center gap-1 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase tracking-wider disabled:opacity-50"
                  >
                    {createUserMutation.isPending ? 'Registering...' : 'Register Shareholder'} <Check size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT SHAREHOLDER PROFILE MODAL */}
      <AnimatePresence>
        {isEditOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white dark:bg-card rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle"
            >
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Shareholder Profile</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Updating metadata coordinates for: {selectedUser.shareholderId}</p>
                </div>
                <button onClick={() => { setIsEditOpen(false); setSelectedUser(null); }} className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* Personal Coordinates */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1"><User size={13} className="inline mr-1" /> Personal details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name</label>
                      <input type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
                      <input type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">PAN Card Number</label>
                      <input type="text" maxLength={10} value={editForm.pan} onChange={e => setEditForm({...editForm, pan: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold uppercase focus:outline-none" placeholder="ABCDE1234F" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</label>
                      <input type="date" value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Type</label>
                      <select 
                        value={editForm.accountType} 
                        onChange={e => {
                          const newType = e.target.value;
                          setEditForm(prev => ({
                            ...prev,
                            accountType: newType,
                            withholdingPercentage: newType === 'ZERO_CONTRIBUTION' ? (prev.withholdingPercentage && prev.withholdingPercentage !== '0' ? prev.withholdingPercentage : '20') : '0',
                          }));
                        }} 
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="CONTRIBUTION">Standard Contribution Account</option>
                        <option value="ZERO_CONTRIBUTION">Zero Contribution Account</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gratitude Share Withholding (%)</label>
                        {editForm.accountType !== 'ZERO_CONTRIBUTION' && (
                          <span className="text-[9px] font-semibold text-gray-500 bg-secondary px-1.5 py-0.5 rounded">Not Applicable</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.1"
                          disabled={editForm.accountType !== 'ZERO_CONTRIBUTION'}
                          value={editForm.accountType === 'ZERO_CONTRIBUTION' ? editForm.withholdingPercentage : ''} 
                          onChange={e => setEditForm({...editForm, withholdingPercentage: e.target.value})} 
                          className={`w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none dark:bg-secondary/35 ${editForm.accountType !== 'ZERO_CONTRIBUTION' ? 'opacity-40 cursor-not-allowed bg-muted/40' : ''}`} 
                          placeholder={editForm.accountType !== 'ZERO_CONTRIBUTION' ? "0% (Standard Account - No Withholding)" : "20"} 
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {editForm.accountType === 'ZERO_CONTRIBUTION' 
                          ? "Saved percentage is applied during all subsequent payout calculations." 
                          : "Withholding is not applicable for Standard Contribution accounts."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Complete Address */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1"><MapPin size={13} className="inline mr-1" /> Address details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Building / Street</label>
                      <input type="text" value={editForm.addressBuilding} onChange={e => setEditForm({...editForm, addressBuilding: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area / Locality</label>
                      <input type="text" value={editForm.addressArea} onChange={e => setEditForm({...editForm, addressArea: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">State (India)</label>
                      <select 
                        value={editForm.addressState} 
                        onChange={e => {
                          const val = e.target.value;
                          setEditForm(prev => ({ ...prev, addressState: val, addressDistrict: '', addressCity: '', addressPincode: '' }));
                        }} 
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-card bg-white cursor-pointer"
                      >
                        <option value="">Select Indian State...</option>
                        {getIndianStates().map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">District</label>
                      <select 
                        value={editForm.addressDistrict} 
                        onChange={e => {
                          const val = e.target.value;
                          setEditForm(prev => ({ ...prev, addressDistrict: val, addressCity: '', addressPincode: '' }));
                        }} 
                        disabled={!editForm.addressState}
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-card bg-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{editForm.addressState ? "Select District..." : "Select State First"}</option>
                        {getDistrictsByState(editForm.addressState).map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">City / Locality</label>
                      <select 
                        value={editForm.addressCity} 
                        onChange={e => {
                          const val = e.target.value;
                          const pins = getPincodesByCity(editForm.addressState, editForm.addressDistrict, val);
                          setEditForm(prev => ({ 
                            ...prev, 
                            addressCity: val, 
                            addressPincode: pins.length > 0 ? pins[0] : prev.addressPincode 
                          }));
                        }} 
                        disabled={!editForm.addressDistrict}
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-card bg-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{editForm.addressDistrict ? "Select City..." : "Select District First"}</option>
                        {getCitiesByDistrict(editForm.addressState, editForm.addressDistrict).map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pincode</label>
                      {getPincodesByCity(editForm.addressState, editForm.addressDistrict, editForm.addressCity).length > 0 ? (
                        <select 
                          value={editForm.addressPincode} 
                          onChange={e => setEditForm({ ...editForm, addressPincode: e.target.value })} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none dark:bg-card bg-white cursor-pointer"
                        >
                          <option value="">Select Pincode...</option>
                          {getPincodesByCity(editForm.addressState, editForm.addressDistrict, editForm.addressCity).map(pin => (
                            <option key={pin} value={pin}>{pin}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          maxLength={6}
                          value={editForm.addressPincode} 
                          onChange={e => setEditForm({ ...editForm, addressPincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} 
                          className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-semibold focus:outline-none" 
                          placeholder="6-digit Pincode" 
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1"><Landmark size={13} className="inline mr-1" /> Bank details</h4>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Name</label>
                    <input type="text" value={editForm.bankAccountName} onChange={e => setEditForm({...editForm, bankAccountName: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                    <input 
                      type="text" 
                      value={editForm.bankAccountNumber} 
                      onChange={e => setEditForm({...editForm, bankAccountNumber: e.target.value})} 
                      className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none dark:bg-secondary/35" 
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name (Indian Banks)</label>
                        <button
                          type="button"
                          onClick={() => { setAddBankTarget('edit'); setIsAddBankModalOpen(true); }}
                          className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add Bank
                        </button>
                      </div>
                      <select 
                        value={editForm.bankName} 
                        onChange={e => {
                          if (e.target.value === 'ADD_NEW') {
                            setAddBankTarget('edit');
                            setIsAddBankModalOpen(true);
                          } else {
                            setEditForm({...editForm, bankName: e.target.value});
                          }
                        }} 
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-bold text-muted-foreground bg-white dark:bg-card focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                      >
                        <option value="">Select Indian Bank...</option>
                        {bankList.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        <option value="ADD_NEW" className="font-bold text-brand-primary">+ Add New Bank...</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Branch</label>
                      <input type="text" value={editForm.bankBranch} onChange={e => setEditForm({...editForm, bankBranch: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC Code</label>
                    <input 
                      type="text" 
                      value={editForm.bankIfsc} 
                      onChange={e => setEditForm({...editForm, bankIfsc: e.target.value.toUpperCase()})} 
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none ${editForm.bankIfsc && !isIfscValid(editForm.bankIfsc) ? 'border-red-500 bg-red-500/5' : 'border-border-subtle'}`} 
                    />
                  </div>
                </div>

                {/* Referral Links */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1">Referral links</h4>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent Referrer ID / Code</label>
                    <input type="text" value={editForm.referrerId} onChange={e => setEditForm({...editForm, referrerId: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none font-mono" placeholder="Leave empty to clear referrer" />
                  </div>
                </div>

                {/* Additional Contribution */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1"><Coins size={13} className="inline mr-1 text-brand-primary" /> Additional Capital Placement</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (₹)</label>
                      <input type="number" value={editForm.contributionAmount} onChange={e => setEditForm({...editForm, contributionAmount: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-extrabold focus:outline-none" placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Mode</label>
                      <select value={editForm.contributionMode} onChange={e => setEditForm({...editForm, contributionMode: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white text-xs font-bold text-muted-foreground focus:outline-none">
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Online Payment">Online Payment</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Placement Date</label>
                      <input type="date" value={editForm.contributionDate} onChange={e => setEditForm({...editForm, contributionDate: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fund Validity</label>
                      <select value={editForm.validityMonths} onChange={e => setEditForm({...editForm, validityMonths: e.target.value})} className="w-full px-4 py-2.5 border border-border-subtle rounded-xl bg-white dark:bg-card text-xs font-bold text-muted-foreground focus:outline-none cursor-pointer">
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="4">4 Months</option>
                        <option value="5">5 Months</option>
                        <option value="6">6 Months</option>
                        <option value="7">7 Months</option>
                        <option value="8">8 Months</option>
                        <option value="9">9 Months</option>
                        <option value="10">10 Months</option>
                        <option value="11">11 Months</option>
                        <option value="12">12 Months</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-2 select-none">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={editForm.issuedAgreement} onChange={e => setEditForm({...editForm, issuedAgreement: e.target.checked})} className="rounded text-brand-primary focus:ring-brand-primary w-4.5 h-4.5" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Issued Legal Agreement Paperwork</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={editForm.issuedCheque} onChange={e => setEditForm({...editForm, issuedCheque: e.target.checked})} className="rounded text-brand-primary focus:ring-brand-primary w-4.5 h-4.5" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Issued Verification Security Cheque</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle bg-muted/10 flex items-center justify-end gap-3 select-none">
                <button
                  onClick={() => { setIsEditOpen(false); setSelectedUser(null); }}
                  className="px-4 py-2.5 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editForm.bankAccountNumber && !isAccountNumberValid(editForm.bankAccountNumber)) {
                      toast({ title: "Validation Error", description: "Bank Account Number must be strictly 15 numeric digits.", type: "warning" });
                      return;
                    }
                    editUserMutation.mutate();
                  }}
                  disabled={editUserMutation.isPending}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase tracking-wider"
                >
                  {editUserMutation.isPending ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW DETAILS DRAWER (Slide-over) */}
      <AnimatePresence>
        {isViewOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-end z-55">
            <div className="absolute inset-0" onClick={() => { setIsViewOpen(false); setSelectedUser(null); }}></div>
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 220 }} 
              className="bg-white dark:bg-card max-w-lg w-full h-full shadow-2xl relative z-10 flex flex-col border-l border-border-subtle"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedUser.name || [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || 'Shareholder Profile'}
                  </h3>
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5 font-mono">
                    {selectedUser.shareholderId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsResetOpen(true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800/40 inline-flex items-center gap-1 cursor-pointer transition-all"
                    title="Reset Shareholder Password"
                  >
                    <Key size={12} /> Reset Password
                  </button>
                  <button onClick={() => { setIsViewOpen(false); setSelectedUser(null); }} className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"><X size={16} /></button>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs custom-scrollbar">
                <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 space-y-2 select-none">
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Account Status</span> <strong className="text-brand-primary font-bold uppercase">{selectedUser.status}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Account Role</span> <strong className="text-gray-800 dark:text-gray-250 font-bold">{selectedUser.role}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Referral Code</span> <strong className="text-gray-950 dark:text-white font-mono font-bold">{selectedUser.referralCode}</strong></div>
                  {selectedUser.disabledAt && (
                    <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold"><span className="text-muted-foreground">Disabled Date</span> <strong>{new Date(selectedUser.disabledAt).toLocaleDateString()}</strong></div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border-subtle pb-1">Personal & Contact</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border-subtle">
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px]">Full Name</span> 
                      <strong className="text-gray-900 dark:text-white font-bold text-sm">
                        {selectedUser.name || [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || '-'}
                      </strong>
                    </div>
                    <div><span className="text-muted-foreground block text-[10px]">First Name</span> <strong className="text-gray-800 dark:text-white font-bold">{selectedUser.firstName || '-'}</strong></div>
                    <div><span className="text-muted-foreground block text-[10px]">Last Name</span> <strong className="text-gray-800 dark:text-white font-bold">{selectedUser.lastName || '-'}</strong></div>
                    <div className="col-span-2 pt-2"><span className="text-muted-foreground block text-[10px]">Shareholder ID</span> <strong className="text-gray-800 dark:text-white font-mono text-xs select-text">{selectedUser.shareholderId}</strong></div>
                    <div className="pt-2"><span className="text-muted-foreground block text-[10px]">Phone</span> <strong className="text-gray-800 dark:text-white font-semibold">{selectedUser.phone || '-'}</strong></div>
                    <div className="pt-2"><span className="text-muted-foreground block text-[10px]">PAN Card</span> <strong className="text-brand-primary font-mono font-bold text-xs">{selectedUser.pan || '-'}</strong></div>
                    <div className="pt-2"><span className="text-muted-foreground block text-[10px]">City</span> <strong className="text-gray-800 dark:text-white font-semibold">{selectedUser.addressCity || '-'}</strong></div>
                    <div className="pt-2"><span className="text-muted-foreground block text-[10px]">DOB</span> <strong className="text-gray-800 dark:text-white font-semibold">{selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : '-'}</strong></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border-subtle pb-1">Coordinates Address</h4>
                  <div className="bg-muted/20 p-4 rounded-2xl border border-border-subtle leading-relaxed text-gray-800 dark:text-gray-200">
                    {selectedUser.addressBuilding && <div><span className="text-muted-foreground text-[10px] block font-bold">Building/Street</span> <strong className="font-semibold">{selectedUser.addressBuilding}</strong></div>}
                    {selectedUser.addressArea && <div className="mt-2.5"><span className="text-muted-foreground text-[10px] block font-bold">Area</span> <strong className="font-semibold">{selectedUser.addressArea}</strong></div>}
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      {selectedUser.addressCity && <div><span className="text-muted-foreground text-[10px] block font-bold">City</span> <strong className="font-semibold">{selectedUser.addressCity}</strong></div>}
                      {selectedUser.addressDistrict && <div><span className="text-muted-foreground text-[10px] block font-bold">District</span> <strong className="font-semibold">{selectedUser.addressDistrict}</strong></div>}
                      {selectedUser.addressState && <div><span className="text-muted-foreground text-[10px] block font-bold">State</span> <strong className="font-semibold">{selectedUser.addressState}</strong></div>}
                    </div>
                    {selectedUser.addressPincode && <div className="mt-2.5"><span className="text-muted-foreground text-[10px] block font-bold">Pincode</span> <strong className="font-semibold">{selectedUser.addressPincode}</strong></div>}
                    {!selectedUser.addressBuilding && <span className="text-muted-foreground/60 italic">- No address details logged -</span>}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border-subtle pb-1">Bank Coordinates</h4>
                  <div className="bg-muted/20 p-4 rounded-2xl border border-border-subtle space-y-2">
                    <div><span className="text-muted-foreground block text-[10px]">Account Name</span> <strong className="text-gray-800 dark:text-white font-bold">{selectedUser.bankAccountName || '-'}</strong></div>
                    <div><span className="text-muted-foreground block text-[10px]">Account Number</span> <strong className="text-gray-800 dark:text-white font-mono font-bold">{selectedUser.bankAccountNumber || '-'}</strong></div>
                    <div className="grid grid-cols-3 gap-2 pt-1.5">
                      <div><span className="text-muted-foreground block text-[10px]">Bank Name</span> <strong className="text-gray-800 dark:text-white font-semibold">{selectedUser.bankName || '-'}</strong></div>
                      <div><span className="text-muted-foreground block text-[10px]">Branch</span> <strong className="text-gray-800 dark:text-white font-semibold">{selectedUser.bankBranch || '-'}</strong></div>
                      <div><span className="text-muted-foreground block text-[10px]">IFSC</span> <strong className="text-gray-800 dark:text-white font-mono font-bold">{selectedUser.bankIfsc || '-'}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border-subtle pb-1">Document & Compliance Issuance</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      (selectedUser.contributions?.some((c: any) => c.issuedAgreement) || selectedUser.issuedAgreement)
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Company Agreement</p>
                          <p className="text-[10px] opacity-80">
                            {(selectedUser.contributions?.some((c: any) => c.issuedAgreement) || selectedUser.issuedAgreement)
                              ? 'Signed & Issued'
                              : 'Not Issued / Pending'}
                          </p>
                        </div>
                      </div>
                      {(selectedUser.contributions?.some((c: any) => c.issuedAgreement) || selectedUser.issuedAgreement) ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-500/20 border border-emerald-500/30 uppercase">Yes (Issued)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/20 border border-amber-500/30 uppercase">No (Pending)</span>
                      )}
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      (selectedUser.contributions?.some((c: any) => c.issuedCheque) || selectedUser.issuedCheque)
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Company Issued Cheque</p>
                          <p className="text-[10px] opacity-80">
                            {(selectedUser.contributions?.some((c: any) => c.issuedCheque) || selectedUser.issuedCheque)
                              ? 'Security Cheque Issued'
                              : 'Not Issued / Pending'}
                          </p>
                        </div>
                      </div>
                      {(selectedUser.contributions?.some((c: any) => c.issuedCheque) || selectedUser.issuedCheque) ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-500/20 border border-emerald-500/30 uppercase">Yes (Issued)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/20 border border-amber-500/30 uppercase">No (Pending)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border-subtle pb-1">Contributions Registry</h4>
                  {selectedUser.contributions && selectedUser.contributions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.contributions.map((c: any) => (
                        <div key={c.id} className="p-3.5 border border-border-subtle rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs bg-white dark:bg-card">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 dark:text-white">₹{Number(c.amount).toLocaleString()}</span>
                              <span className="text-gray-300 dark:text-gray-700">|</span>
                              <span className="text-muted-foreground font-semibold">{c.mode}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                c.status === 'APPROVED' 
                                  ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/40' 
                                  : c.status === 'REJECTED' 
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/40' 
                                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                              }`}>
                                {c.status || 'APPROVED'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                c.issuedAgreement
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground border-border-subtle'
                              }`}>
                                Agreement: {c.issuedAgreement ? 'Issued ✓' : 'Not Issued'}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                c.issuedCheque
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground border-border-subtle'
                              }`}>
                                Cheque: {c.issuedCheque ? 'Issued ✓' : 'Not Issued'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold">{new Date(c.date).toLocaleDateString()}</span>
                            {(c.status === 'PENDING' || !c.status) && (
                              <div className="flex gap-1 ml-2 select-none">
                                <button
                                  onClick={() => approveContributionMutation.mutate(c.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-lg text-[9px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectContributionMutation.mutate(c.id)}
                                  className="bg-red-650 hover:bg-red-700 text-white font-bold px-2 py-1 rounded-lg text-[9px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">No contributions logged in this ledger.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET PASSWORD CONFIRMATION MODAL */}
      <AnimatePresence>
        {isResetOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-border-subtle">
              <button onClick={() => { setIsResetOpen(false); setSelectedUser(null); setNewPassword(''); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg transition-all cursor-pointer"><X size={16} /></button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-amber-600"><Key size={20} /> Reset Shareholder Password</h3>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mb-4 leading-relaxed">
                Set a new password or generate a random password for shareholder account access.
              </p>

              {/* Shareholder Profile Details Badge */}
              <div className="p-3 bg-secondary/40 rounded-xl border border-border-subtle mb-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shareholder:</span>
                  <span className="font-bold text-foreground">{selectedUser.name || [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.shareholderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono font-bold text-brand-primary">{selectedUser.shareholderId}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile:</span>
                    <span className="font-mono text-muted-foreground">{selectedUser.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">New Password * (Min 6 chars)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let pass = 'Star@';
                        for (let i = 0; i < 4; i++) {
                          pass += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setNewPassword(pass);
                      }}
                      className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Generate Random
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showResetPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (e.g. Star@2026)"
                      className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 dark:bg-secondary/35 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showResetPassword ? <Eye size={14} /> : <Eye size={14} className="opacity-50" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsResetOpen(false); setSelectedUser(null); setNewPassword(''); }}
                    className="flex-1 py-2.5 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-muted-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetPasswordMutation.isPending || !newPassword || newPassword.trim().length < 6}
                    onClick={() => resetPasswordMutation.mutate()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {resetPasswordMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={14} />}
                    {resetPasswordMutation.isPending ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-border-subtle">
              <button onClick={() => { setIsDeleteOpen(false); setSelectedUser(null); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg transition-all cursor-pointer"><X size={16} /></button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-red-600"><AlertTriangle /> Soft Delete Account</h3>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to soft delete the shareholder <strong className="text-gray-800 dark:text-gray-200">{selectedUser.shareholderId}</strong>? The shareholder status will transition to <strong className="text-red-700 dark:text-red-400 font-bold uppercase">DELETED</strong>, blocking access, but they will not be permanently deleted from database archives.
              </p>
              <div className="flex gap-3 select-none">
                <button onClick={() => { setIsDeleteOpen(false); setSelectedUser(null); }} className="flex-1 py-2.5 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-gray-650 cursor-pointer">Cancel</button>
                <button onClick={() => deleteMutation.mutate(selectedUser.id)} className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer uppercase tracking-wider">Confirm Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD NEW INDIAN BANK MODAL */}
      <AnimatePresence>
        {isAddBankModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-border-subtle">
              <button onClick={() => { setIsAddBankModalOpen(false); setNewBankInput(''); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg transition-all cursor-pointer"><X size={16} /></button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-brand-primary"><Landmark size={20} /> Add New Indian Bank Name</h3>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mb-5 leading-relaxed">
                Add an official Indian bank name to the operator dropdown selection list.
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name *</label>
                  <input
                    type="text"
                    value={newBankInput}
                    onChange={e => setNewBankInput(e.target.value)}
                    placeholder="e.g. Saraswat Cooperative Bank"
                    className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none dark:bg-secondary/35"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 select-none pt-2">
                  <button onClick={() => { setIsAddBankModalOpen(false); setNewBankInput(''); }} className="flex-1 py-2.5 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-gray-500 cursor-pointer">Cancel</button>
                  <button onClick={handleAddNewBank} className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer uppercase tracking-wider">Add Bank</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE ADMIN ACCOUNT MODAL (SUPER ADMIN ONLY) */}
      <AnimatePresence>
        {isAdminCreateOpen && isSuperAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card rounded-3xl max-w-3xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle"
            >
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Admin Operator</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Register a system administrator with a granular task permission matrix.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminCreateOpen(false)}
                  className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* Credentials */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border-subtle pb-1">
                    1. Admin Identity & Credentials
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin ID / Username *</label>
                      <input
                        type="text"
                        required
                        value={adminForm.shareholderId}
                        onChange={(e) => setAdminForm({ ...adminForm, shareholderId: e.target.value.toUpperCase() })}
                        placeholder="e.g. ADM001"
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-secondary/35"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Full Name *</label>
                      <input
                        type="text"
                        required
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                        placeholder="e.g. Operations Manager"
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-secondary/35"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-secondary/35"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password *</label>
                      <input
                        type="password"
                        required
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-secondary/35"
                      />
                    </div>
                  </div>
                </div>

                {/* Granular Task Permissions Matrix */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-1">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      2. Granular Task Permission Matrix
                    </h4>
                    <span className="text-[10px] text-muted-foreground">Select enabled administrative capabilities</span>
                  </div>

                  <div className="border border-border-subtle rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-muted/30 border-b border-border-subtle text-[10px] font-bold text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3">Module</th>
                          <th className="px-3 py-3 text-center">View</th>
                          <th className="px-3 py-3 text-center">Create</th>
                          <th className="px-3 py-3 text-center">Edit</th>
                          <th className="px-3 py-3 text-center">Delete</th>
                          <th className="px-3 py-3 text-center">Approve</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle font-medium">
                        {[
                          { id: 'shareholders', label: 'Shareholder Management' },
                          { id: 'contributions', label: 'Contribution Approvals' },
                          { id: 'payouts', label: 'Payout Batches & Statement Processing' },
                          { id: 'ranks', label: 'Rank Engine & Manual Allotment' },
                          { id: 'withdrawals', label: 'Withdrawal Processing' },
                          { id: 'financial_requests', label: 'Financial Information Changes' },
                          { id: 'system_settings', label: 'System Configuration' },
                        ].map((module) => {
                          const perms = adminForm.permissions[module.id] || { view: false, create: false, edit: false, delete: false, approve: false };
                          return (
                            <tr key={module.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                                {module.label}
                              </td>
                              {['view', 'create', 'edit', 'delete', 'approve'].map((action) => (
                                <td key={action} className="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perms[action])}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setAdminForm((prev) => ({
                                        ...prev,
                                        permissions: {
                                          ...prev.permissions,
                                          [module.id]: {
                                            ...(prev.permissions[module.id] || {}),
                                            [action]: checked,
                                          },
                                        },
                                      }));
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle bg-muted/10 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsAdminCreateOpen(false)}
                  className="px-4 py-2 border border-border-subtle rounded-xl hover:bg-muted text-xs font-bold text-muted-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createAdminUserMutation.isPending || !adminForm.shareholderId || !adminForm.password}
                  onClick={() => {
                    if (!adminForm.shareholderId || !adminForm.name || !adminForm.password) {
                      toast({ title: "Required Fields", description: "Admin ID, Name, and Password are required.", type: "warning" });
                      return;
                    }
                    createAdminUserMutation.mutate();
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  {createAdminUserMutation.isPending ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINANCIAL INFORMATION CHANGE REQUESTS MODAL */}
      <AnimatePresence>
        {isFinancialRequestsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card rounded-3xl max-w-4xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle"
            >
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Financial Change Requests</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Review and approve or reject shareholder banking and PAN updates.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFinancialRequestsOpen(false)}
                  className="p-1 hover:bg-muted dark:hover:bg-secondary rounded-lg text-muted-foreground transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {(!financialRequestsData?.data || financialRequestsData.data.length === 0) ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-success" />
                    <p className="text-sm font-bold text-foreground">No Pending Financial Requests</p>
                    <p className="text-xs text-muted-foreground mt-1">All shareholder profile and financial change submissions have been processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {financialRequestsData.data.map((req: any) => (
                      <div key={req.id} className="p-5 border border-border-subtle rounded-2xl bg-muted/10 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border-subtle pb-3">
                          <div>
                            <span className="font-bold text-sm text-foreground">{req.shareholder?.name}</span>
                            <span className="ml-2 font-mono text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
                              {req.shareholder?.shareholderId}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            Submitted: {new Date(req.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-card p-3.5 rounded-xl border border-border-subtle space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Details</p>
                            <p><span className="text-muted-foreground">PAN:</span> <span className="font-mono font-semibold">{req.shareholder?.pan || 'None'}</span></p>
                            <p><span className="text-muted-foreground">Bank:</span> <span className="font-semibold">{req.shareholder?.bankName || 'None'} ({req.shareholder?.bankBranch || 'N/A'})</span></p>
                            <p><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold">{req.shareholder?.bankAccountName || req.shareholder?.name}</span></p>
                            <p><span className="text-muted-foreground">Account No:</span> <span className="font-mono font-semibold">{req.shareholder?.bankAccountNumber || 'None'}</span></p>
                            <p><span className="text-muted-foreground">IFSC:</span> <span className="font-mono font-semibold">{req.shareholder?.bankIfsc || 'None'}</span></p>
                          </div>

                          <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20 space-y-1.5">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Requested Updates</p>
                            <p><span className="text-muted-foreground">PAN:</span> <span className="font-mono font-bold text-foreground">{req.pan || req.shareholder?.pan || 'Unchanged'}</span></p>
                            <p><span className="text-muted-foreground">Bank:</span> <span className="font-bold text-foreground">{req.bankName || 'Unchanged'} ({req.bankBranch || 'N/A'})</span></p>
                            <p><span className="text-muted-foreground">Account Name:</span> <span className="font-bold text-foreground">{req.bankAccountName || req.shareholder?.name}</span></p>
                            <p><span className="text-muted-foreground">Account No:</span> <span className="font-mono font-bold text-foreground">{req.bankAccountNumber || 'Unchanged'}</span></p>
                            <p><span className="text-muted-foreground">IFSC:</span> <span className="font-mono font-bold text-foreground">{req.bankIfsc || 'Unchanged'}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFinancialRequest(req);
                              setRejectModalOpen(true);
                            }}
                            className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          >
                            Reject Request
                          </button>
                          <button
                            type="button"
                            disabled={approveFinancialRequestMutation.isPending}
                            onClick={() => approveFinancialRequestMutation.mutate(req.id)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <Check size={14} /> Approve & Apply Updates
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT FINANCIAL REQUEST MODAL */}
      <AnimatePresence>
        {rejectModalOpen && selectedFinancialRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-border-subtle"
            >
              <h3 className="text-base font-bold text-foreground mb-2">Reject Financial Change Request</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Please provide a rejection reason to inform shareholder {selectedFinancialRequest.shareholder?.name}.
              </p>
              <textarea
                value={financialRejectionReason}
                onChange={(e) => setFinancialRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g. IFSC code mismatch with bank branch)"
                className="w-full p-3 border border-border-subtle rounded-xl text-xs focus:outline-none dark:bg-secondary/35 min-h-[80px]"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setRejectModalOpen(false); setSelectedFinancialRequest(null); }}
                  className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejectFinancialRequestMutation.isPending}
                  onClick={() => rejectFinancialRequestMutation.mutate()}
                  className="px-5 py-2 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
