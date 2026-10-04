import React, { useState, useRef } from 'react';
import { User, MonthlyKPI, Contract } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  LogOut,
  Edit2,
  CheckCircle2,
  Lock,
  Camera,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  KeyRound,
  Save,
  X
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  kpi: MonthlyKPI;
  contracts: Contract[];
  language: Language;
  onUpdateUser: (u: User) => void;
  onLogout: () => void;
}

export function ProfileView({
  currentUser,
  kpi,
  contracts,
  language,
  onUpdateUser,
  onLogout,
}: ProfileViewProps) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [title, setTitle] = useState(currentUser.title || '');
  const [branch, setBranch] = useState(currentUser.branch || 'Phuket Head Office');

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Alert Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const myContracts = contracts.filter((c) => c.agentId === currentUser.id);
  const myTotalCommission = myContracts.reduce((sum, c) => sum + (c.commissionAmount ?? c.commission ?? 0), 0);

  const formatTHB = (n: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
  };

  // Avatar File Selection & Live Preview
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'ขนาดไฟล์รูปภาพเกินกำหนด (สูงสุด 5MB)' : 'File size exceeds 5MB limit',
      });
      return;
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG และ WEBP' : 'Only JPG, PNG, and WEBP images are supported',
      });
      return;
    }

    // Read and preview immediately
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);

      // Upload directly to backend
      setIsUploadingAvatar(true);
      setFeedback(null);

      try {
        const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
        const res = await fetch('/api/auth/profile/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-user-id': currentUser.id,
            'x-user-name': currentUser.name,
            'x-user-role': currentUser.role,
          },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload avatar');
        }

        const updatedUser: User = {
          ...currentUser,
          avatar: data.avatarUrl,
        };
        onUpdateUser(updatedUser);
        setFeedback({
          type: 'success',
          message: language === 'th' ? 'อัปโหลดและบันทึกรูปโปรไฟล์สำเร็จ' : 'Avatar updated successfully',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to upload avatar',
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({ avatar: '' }),
      });

      if (!res.ok) throw new Error('Failed to remove avatar');

      setAvatarPreview(null);
      onUpdateUser({
        ...currentUser,
        avatar: '',
      });
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'ลบรูปโปรไฟล์เรียบร้อยแล้ว' : 'Avatar removed successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Save General Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          title: title.trim(),
          branch: branch.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedUser: User = {
        ...currentUser,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        title: data.user.title,
        branch: data.user.branch,
      };

      onUpdateUser(updatedUser);
      setIsEditing(false);
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' : 'Profile updated successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Change Password Submission
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : 'New password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' : 'New passwords do not match',
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' : 'Password changed successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayAvatar = avatarPreview || currentUser.avatar;

  return (
    <div className="space-y-6 w-full pb-12 font-sans">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-200'
              : 'bg-red-950/80 border border-red-700/80 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0F1218] border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-red-600/30 shadow-2xl bg-slate-800 flex items-center justify-center">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-slate-500" />
              )}
            </div>

            {/* Online Indicator */}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0F1218]" />

            {/* Upload Trigger overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold cursor-pointer"
              title="Upload new avatar"
            >
              {isUploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5 text-white" />
                  <span>{language === 'th' ? 'เปลี่ยนรูป' : 'Change'}</span>
                </>
              )}
            </button>

            {/* Hidden native file input supporting desktop and mobile camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">
                {currentUser.role}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-medium">{currentUser.branch}</span>
            </div>

            <h2 className="text-2xl font-bold font-serif text-white mt-1.5 truncate">
              {currentUser.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              @{currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user')} • {currentUser.title || currentUser.role}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </span>
              {currentUser.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{currentUser.phone}</span>
                </span>
              )}
            </div>

            {/* Avatar Quick Actions */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-red-400" />
                <span>{language === 'th' ? 'อัปโหลดรูปภาพ' : 'Upload Avatar'}</span>
              </button>
              {displayAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/60 text-xs font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{language === 'th' ? 'ลบรูปภาพ' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setIsChangingPassword(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? (language === 'th' ? 'ยกเลิก' : 'Cancel') : (language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile')}</span>
            </button>
            <button
              onClick={() => {
                setIsChangingPassword(!isChangingPassword);
                setIsEditing(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-semibold transition-all border border-red-800/80"
            >
              <KeyRound className="w-3.5 h-3.5 text-red-400" />
              <span>{isChangingPassword ? (language === 'th' ? 'ยกเลิก' : 'Cancel') : (language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Password')}</span>
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ชื่อผู้ใช้ (Username)' : 'Username'}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'อีเมล' : 'Email'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ตำแหน่งงาน' : 'Job Title'}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Change Password Form */}
        {isChangingPassword && (
          <form onSubmit={handleChangePasswordSubmit} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)' : 'New Password'}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{language === 'th' ? 'อัปเดตรหัสผ่านใหม่' : 'Update Password'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* KPI & Commission Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Monthly Target</span>
          <span className="text-2xl font-serif font-bold text-slate-900 block mt-1">
            {formatTHB(Number(currentUser.monthlyTarget) || 20000000)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Sales & Rental Target</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Commission Earned</span>
          <span className="text-2xl font-serif font-bold text-emerald-700 block mt-1">
            {formatTHB(Number(currentUser.monthlyCommission) || myTotalCommission || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Accumulated earnings</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Deals Closed</span>
          <span className="text-2xl font-serif font-bold text-blue-900 block mt-1">
            {currentUser.completedDeals || myContracts.length || 0} / {currentUser.targetDeals || 5}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Active transactions closed</span>
        </div>
      </div>

      {/* Security & Active Session Box */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <h3 className="font-bold text-sm text-slate-900">
            {language === 'th' ? 'ความปลอดภัยและการเข้าสู่ระบบ' : 'Security & Active Session'}
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <p className="font-bold text-xs text-slate-800">
              {language === 'th' ? 'เซสชันปัจจุบัน (Active Session)' : 'Active Authentication Session'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Signed in as <strong className="text-slate-700">{currentUser.email}</strong> with <strong className="text-slate-700">{currentUser.role}</strong> role in PostgreSQL.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.navLogout}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
