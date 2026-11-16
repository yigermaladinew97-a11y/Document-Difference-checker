import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Briefcase,
  Building,
  ShieldCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  Save,
  LogOut,
  Palette,
  Layers,
  FileDiff,
  Cloud,
  Volume2
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { updateUserProfile, generateLocalSvgAvatar } from '../utils/authClient';

const GRADIENT_THEMES = [
  { id: 'orange', name: 'Electric Orange', color: '#FF5E1E' },
  { id: 'indigo', name: 'Royal Indigo', color: '#4F46E5' },
  { id: 'emerald', name: 'Emerald Green', color: '#059669' },
  { id: 'cyan', name: 'Sky Cyan', color: '#0284C7' },
  { id: 'violet', name: 'Deep Violet', color: '#7C3AED' },
  { id: 'amber', name: 'Sunset Amber', color: '#D97706' }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onLogout,
  historyCount = 0
}) {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name || '');
  const [title, setTitle] = useState(currentUser.title || 'Document Intelligence Specialist');
  const [organization, setOrganization] = useState(currentUser.organization || 'Professional User');
  const [selectedTheme, setSelectedTheme] = useState('orange');
  const [currentAvatar, setCurrentAvatar] = useState(currentUser.avatar);
  const [autoCloudSync, setAutoCloudSync] = useState(currentUser.preferences?.autoCloudSync ?? true);
  const [soundEnabled, setSoundEnabled] = useState(currentUser.preferences?.soundEnabled ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    setName(currentUser.name || '');
    setTitle(currentUser.title || 'Document Intelligence Specialist');
    setOrganization(currentUser.organization || 'Professional User');
    setCurrentAvatar(currentUser.avatar);
    setAutoCloudSync(currentUser.preferences?.autoCloudSync ?? true);
    setSoundEnabled(currentUser.preferences?.soundEnabled ?? true);
  }, [currentUser]);

  // When user selects a color theme, regenerate their avatar SVG with their initials
  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    const newSvg = generateLocalSvgAvatar(name || currentUser.name, themeId);
    setCurrentAvatar(newSvg);
  };

  // Re-generate avatar when name changes if using SVG avatar
  const handleNameChange = (newName) => {
    setName(newName);
    if (!currentAvatar || currentAvatar.startsWith('data:image/svg+xml')) {
      const newSvg = generateLocalSvgAvatar(newName || 'User', selectedTheme);
      setCurrentAvatar(newSvg);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const updated = await updateUserProfile({
        name,
        title,
        organization,
        avatar: currentAvatar,
        preferences: {
          autoCloudSync,
          soundEnabled
        }
      });

      if (onUserUpdated) onUserUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Member';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Member';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 select-none flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-50 via-[#FFF4EF]/60 to-slate-50 dark:from-slate-900 dark:via-[#FF5E1E]/10 dark:to-slate-900 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5E1E] text-white flex items-center justify-center shadow-md shadow-[#FF5E1E]/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                  User Profile &amp; Preferences
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF5E1E]/15 text-[#FF5E1E] border border-[#FF5E1E]/30">
                  PRO MEMBER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Manage your identity, role, theme, and cloud workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Top Profile Card with Avatar Customizer */}
          <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Live Avatar Preview */}
            <div className="flex flex-col items-center space-y-2 shrink-0">
              <UserAvatar
                name={name || currentUser.name}
                avatar={currentAvatar}
                size="xl"
                className="shadow-md"
              />
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {currentUser.plan?.toUpperCase() || 'PRO'} USER
              </span>
            </div>

            {/* Avatar Color Picker & Quick Info */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {name || 'Your Name'}
                </h4>
                <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
              </div>

              {/* Theme Palette */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 justify-center sm:justify-start">
                  <Palette className="w-3.5 h-3.5 text-[#FF5E1E]" />
                  <span>Avatar Color Theme</span>
                </label>
                <div className="flex items-center space-x-2 justify-center sm:justify-start">
                  {GRADIENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-7 h-7 rounded-full transition-transform duration-150 flex items-center justify-center ${
                        selectedTheme === theme.id
                          ? 'ring-2 ring-offset-2 ring-[#FF5E1E] scale-110'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: theme.color }}
                      title={theme.name}
                    >
                      {selectedTheme === theme.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF5E1E]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Yigermal Adinew"
                  required
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.1] rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
                />
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    <span>Email Address</span>
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] rounded-2xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Job Title / Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                  <span>Job Title / Specialization</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Contract Counsel / QA Lead"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.1] rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
                />
              </div>

              {/* Organization / Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Organization / Team</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Legal &amp; Compliance Team"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.1] rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
                />
              </div>
            </div>

            {/* Account Stats & Membership Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-white/[0.08] text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Account Plan</span>
                <p className="text-sm font-black text-[#FF5E1E]">PRO UNLIMITED</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-white/[0.08] text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Member Since</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formatDate(currentUser.createdAt)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-white/[0.08] text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Diffs Run</span>
                <p className="text-sm font-black text-indigo-500">
                  {currentUser.stats?.comparisonsCount || historyCount || 1}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-white/[0.08] text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cloud Synced</span>
                <p className="text-sm font-black text-emerald-500">
                  {historyCount} files
                </p>
              </div>
            </div>

            {/* Workspace Preferences Toggles */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-3">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                Preferences
              </span>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Cloud className="w-4 h-4 text-[#FF5E1E]" />
                  <span>Auto-Sync Comparisons to Cloud Storage</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCloudSync(!autoCloudSync)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    autoCloudSync ? 'bg-[#FF5E1E]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      autoCloudSync ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <span>Audio Chimes &amp; Sound Haptics</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Error & Success Feedback */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600">
                {errorMessage}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-600 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onLogout) onLogout();
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold bg-[#FF5E1E] hover:bg-[#E04A0E] text-white shadow-md shadow-[#FF5E1E]/20 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
