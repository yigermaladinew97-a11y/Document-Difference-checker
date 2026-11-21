import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, CheckCircle2, Shield, ArrowRight, ArrowLeft, RefreshCw, Sparkles, Upload, Trash2 } from 'lucide-react';
import { loginWithEmail, signupWithEmail, verify2FACode, resend2FACode } from '../utils/authClient';
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

  // 2FA State
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState(null); // { tempToken, email, devCode }
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const digitInputRefs = useRef([]);
  const timerRef = useRef(null);
  const signupFileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendCountdown(45);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
      let result;
      if (mode === 'signup') {
        result = await signupWithEmail(name, email, password, signupPhoto);
      } else {
        result = await loginWithEmail(email, password);
      }

      // Check if server requires Two-Factor Authentication (2FA)
      if (result && result.requires2FA) {
        setTwoFactorData({
          tempToken: result.tempToken,
          email: result.email,
          devCode: result.devCode
        });
        setOtpDigits(['', '', '', '', '', '']);
        setIsTwoFactorStep(true);
        setError(null);
        startResendTimer();
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 150);
        return;
      }

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA Digit Input Change
  const handleDigitChange = (idx, val) => {
    const clean = val.replace(/\D/g, '');
    const updated = [...otpDigits];

    if (clean.length > 1) {
      // User pasted or typed multiple characters
      const chars = clean.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (i < 6) updated[i] = c;
      });
      setOtpDigits(updated);
      const nextIdx = Math.min(chars.length, 5);
      digitInputRefs.current[nextIdx]?.focus();
      if (chars.length === 6) {
        verifyOtpSubmission(updated.join(''));
      }
      return;
    }

    updated[idx] = clean;
    setOtpDigits(updated);
    setError(null);

    if (clean && idx < 5) {
      digitInputRefs.current[idx + 1]?.focus();
    }

    // Auto-verify when all 6 digits are filled
    if (clean && updated.every((d) => d !== '')) {
      verifyOtpSubmission(updated.join(''));
    }
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      digitInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      digitInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      digitInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length > 0) {
      const updated = ['', '', '', '', '', ''];
      for (let i = 0; i < paste.length; i++) {
        updated[i] = paste[i];
      }
      setOtpDigits(updated);
      const nextIdx = Math.min(paste.length, 5);
      digitInputRefs.current[nextIdx]?.focus();
      if (paste.length === 6) {
        verifyOtpSubmission(paste);
      }
    }
  };

  const verifyOtpSubmission = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const user = await verify2FACode(twoFactorData.tempToken, code);
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend2FA = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await resend2FACode(twoFactorData.tempToken);
      if (res.devCode) {
        setTwoFactorData((prev) => ({ ...prev, devCode: res.devCode }));
      }
      startResendTimer();
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    setIsTwoFactorStep(false);
    setTwoFactorData(null);
    setOtpDigits(['', '', '', '', '', '']);
    setError(null);
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
              {isTwoFactorStep
                ? 'Two-Factor Authentication'
                : (reasonMessage || 'Sign in to access your cloud history and export tools')}
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

        {/* ===================== TWO-FACTOR AUTHENTICATION VIEW ===================== */}
        {isTwoFactorStep ? (
          <div className="space-y-5 py-2 animate-in fade-in zoom-in-95 duration-200">
            {/* 2FA Shield Emblem */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5E1E]/20 to-[#FF8A50]/10 border border-[#FF5E1E]/30 text-[#FF5E1E] shadow-lg shadow-[#FF5E1E]/15 mb-3">
                <Shield className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111726] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enter Security Code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[300px] mx-auto leading-relaxed">
                We sent a 6-digit verification code to{' '}
                <strong className="text-slate-900 dark:text-slate-200">{twoFactorData?.email}</strong>.
              </p>
            </div>

            {/* Test Mode / Dev Code Instant Pill (When SMTP is simulated) */}
            {twoFactorData?.devCode && (
              <div
                onClick={() => {
                  const digits = twoFactorData.devCode.split('');
                  setOtpDigits(digits);
                  verifyOtpSubmission(twoFactorData.devCode);
                }}
                className="cursor-pointer group flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-amber-600 dark:text-amber-400"
                title="Click to automatically paste this test code"
              >
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Demo Mode Code: <strong className="font-mono tracking-wider">{twoFactorData.devCode}</strong></span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full group-hover:scale-105 transition">
                  Click to Auto-fill &rarr;
                </span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in space-y-1.5">
                <div>{error}</div>
                {mode === 'login' && error.toLowerCase().includes('create account') && (
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="inline-flex items-center space-x-1 font-bold text-[#FF5E1E] hover:underline text-[11px]"
                  >
                    <span>👉 Switch to "Create Account" with this email</span>
                  </button>
                )}
              </div>
            )}

            {/* 6-Digit OTP Input Boxes */}
            <div>
              <div 
                className="flex items-center justify-between gap-1.5 sm:gap-2.5 my-2" 
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    disabled={isLoading}
                    className="w-11 sm:w-13 h-13 sm:h-14 text-center text-xl sm:text-2xl font-extrabold font-mono rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-white/[0.08] focus:border-[#FF5E1E] dark:focus:border-[#FF5E1E] focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white focus:outline-none transition-all shadow-xs focus:ring-4 focus:ring-[#FF5E1E]/15 disabled:opacity-50"
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
                Tip: You can paste the 6-digit code directly
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => verifyOtpSubmission()}
              disabled={isLoading || otpDigits.some((d) => !d)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Verifying Code...' : 'Confirm & Log In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Resend Code Section & Back button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleResend2FA}
                disabled={resendCountdown > 0 || isResending}
                className={`font-semibold transition flex items-center space-x-1 ${
                  resendCountdown > 0 || isResending
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-[#FF5E1E] hover:underline'
                }`}
              >
                {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>
                  {resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : 'Resend security code'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ===================== STANDARD LOGIN / SIGNUP VIEW ===================== */
          <>
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
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in space-y-1.5">
                <div>{error}</div>
                {mode === 'login' && error.toLowerCase().includes('create account') && (
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="inline-flex items-center space-x-1 font-bold text-[#FF5E1E] hover:underline text-[11px]"
                  >
                    <span>👉 Switch to "Create Account" with this email</span>
                  </button>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  {/* Photo Upload for Sign Up */}
                  <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06]">
                    <div className="relative">
                      <UserAvatar
                        user={{
                          name: name || 'New User',
                          avatar: signupPhoto || ''
                        }}
                        size="md"
                      />
                      <input
                        type="file"
                        ref={signupFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleSignupPhotoChange}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Profile Photo</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {signupPhoto ? 'Custom photo ready' : 'Upload photo or keep gradient initials'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => signupFileInputRef.current?.click()}
                        className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                        title="Upload photo"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      {signupPhoto && (
                        <button
                          type="button"
                          onClick={() => setSignupPhoto(null)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
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
                <span>{isLoading ? 'Processing...' : mode === 'signup' ? 'Continue with 2FA' : 'Sign In with 2FA'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Member Benefits */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <Shield className="w-3 h-3 text-[#FF5E1E] shrink-0" />
                <span>Protected by 6-digit Two-Factor Authentication (2FA)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Sync comparisons across computers &amp; phones</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Download Redline Word (.docx) &amp; Excel (.xlsx) markups</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
