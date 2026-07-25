"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  UserCircle, ShieldCheck, Mail, Phone, MapPin, Building, 
  CreditCard, UserCheck, Activity, Landmark, Lock, KeyRound, CheckCircle2 
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { toast } = useToast();
  const logout = useAuthStore((state) => state.logout);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['myProfileDetails'],
    queryFn: async () => {
      const res = await api.get('/shareholders/me/profile');
      return res.data;
    },
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
      await api.post('/shareholders/me/change-password', {
        currentPassword,
        newPassword
      });
      
      toast({ 
        title: 'Password Updated', 
        description: 'Your password has been successfully changed. Please log in again.', 
        type: 'success' 
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Force re-login
      setTimeout(() => {
        logout();
      }, 2000);
      
    } catch (error: any) {
      toast({ 
        title: 'Update Failed', 
        description: error.response?.data?.message || 'Could not change password. Check your current password.', 
        type: 'error' 
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="border-b border-border pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Account Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">View your registered details and manage your account security.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="bg-secondary/40 p-8 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
              <UserCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{profile?.name}</h2>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-card px-2.5 py-1 rounded-md border border-border">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                  UID: {profile?.customId}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-card px-2.5 py-1 rounded-md border border-border">
                  <Landmark className="w-3.5 h-3.5 text-brand-accent" />
                  INV ID: {profile?.investorId}
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  profile?.status === 'ACTIVE' 
                    ? 'bg-brand-success/10 text-brand-success border-brand-success/20' 
                    : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                  {profile?.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-2 min-w-[200px] w-full sm:w-auto shadow-sm">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider">Profile Status</span>
              <span className="text-brand-success">100% Complete</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-brand-success rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Identity & Contact */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-primary" /> Identity & Contact
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Shareholder ID</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" /> {profile?.shareholderId}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> {profile?.phone}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Residential Address</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> 
                    <span className="leading-relaxed">{profile?.address}</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Referred By</label>
                  <p className="text-sm font-semibold text-foreground mt-1 bg-secondary inline-flex px-2 py-1 rounded-md border border-border">
                    {profile?.referrer}
                  </p>
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-accent" /> Financial Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Type</label>
                  <p className={`text-sm font-semibold mt-1 inline-flex px-2.5 py-1 rounded-md border ${
                    profile?.accountType === 'Investor' 
                      ? 'bg-brand-success/10 text-brand-success border-brand-success/20' 
                      : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                  }`}>
                    {profile?.accountType}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Bank Name</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-muted-foreground" /> {profile?.bankDetails?.bankName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Name</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-muted-foreground" /> {profile?.bankDetails?.accountName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Number</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2 font-mono">
                    <CreditCard className="w-4 h-4 text-muted-foreground" /> {profile?.bankDetails?.accountNumber}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Branch</label>
                    <p className="text-sm font-semibold text-foreground mt-1">{profile?.bankDetails?.branch}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">IFSC Code</label>
                    <p className="text-sm font-semibold text-foreground mt-1 font-mono">{profile?.bankDetails?.ifsc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security (Change Password) */}
            <div className="space-y-6 md:col-span-2 mt-2 pt-6 border-t border-border">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-info" /> Account Security
              </h3>
              
              <div className="bg-secondary/20 rounded-xl border border-border overflow-hidden">
                <div className="bg-secondary/40 p-5 border-b border-border flex items-start gap-4">
                  <div className="p-2.5 bg-brand-warning/10 text-brand-warning rounded-lg border border-brand-warning/20 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Change Password</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Update your account password to keep your profile secure.</p>
                  </div>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Current Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input 
                          type="password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="input-base pl-8 text-sm py-2"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">New Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="input-base pl-8 text-sm py-2"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Confirm Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="input-base pl-8 text-sm py-2"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <Button 
                      type="submit" 
                      className="px-6 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm text-xs h-9"
                      disabled={isPasswordLoading}
                    >
                      {isPasswordLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
