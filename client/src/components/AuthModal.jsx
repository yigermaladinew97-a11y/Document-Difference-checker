import React, { useState, useRef } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, Sparkles, CheckCircle2, Shield, ArrowRight, Camera, Upload, Trash2 } from 'lucide-react';
import { loginWithEmail, signupWithEmail } from '../utils/authClient';
import UserAvatar from './UserAvatar';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  reasonMessage = null,
  onSuccess
}) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupPhoto, setSignupPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const signupFileInputRef = useRef(null);

  const handleSignupPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setSignupPhoto(dataUrl);
        setError(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let user;
      if (mode === 'signup') {
        user = await signupWithEmail(name, email, password, signupPhoto);
      } else {
        user = await loginWithEmail(email, password);
      }

      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] rounded-3xl p-5 sm:p-8 shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                Doc<span className="text-[#FF5E1E]">Diff</span> Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                PRO ACCOUNT
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {reasonMessage || 'Sign in to access your cloud history and export tools'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === 'signup'
                ? 'bg-[#FF5E1E] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              {/* Profile Photo (PP) selector during signup */}
              <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08]">
                <div className="relative shrink-0 cursor-pointer" onClick={() => signupFileInputRef.current?.click()}>
                  <UserAvatar name={name || 'User'} avatar={signupPhoto} size="md" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      signupFileInputRef.current?.click();
                    }}
                    className="absolute -bottom-1 -right-1 p-1 bg-[#FF5E1E] text-white rounded-full shadow-xs border border-white dark:border-slate-900"
                    title="Upload photo"
                  >
                    <Camera className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => signupFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-[#FF5E1E] hover:underline flex items-center space-x-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{signupPhoto ? 'Change Photo (PP)' : 'Add Profile Photo (PP)'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 truncate">
                    {signupPhoto ? 'Custom photo attached' : 'Optional · Auto-defaults to gradient monogram'}
                  </p>
                </div>

                {signupPhoto && (
                  <button
                    type="button"
                    onClick={() => setSignupPhoto(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <input
                  type="file"
                  ref={signupFileInputRef}
                  onChange={handleSignupPhotoChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yigermal Adinew"
                    className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password {mode === 'signup' && <span className="text-slate-400 font-normal">(6+ characters)</span>}
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Processing...' : mode === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Member Benefits */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Sync comparisons across computers &amp; phones</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Download Redline Word (.docx) &amp; Excel (.xlsx) markups</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Zero server storage lock-in — export full JSON backups anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
