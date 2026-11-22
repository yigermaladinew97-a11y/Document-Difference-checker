import React, { useState } from 'react';
import { 
  FileDiff, 
  Sparkles, 
  Key, 
  Moon, 
  Sun, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LogOut,
  User,
  ChevronDown,
  Cloud,
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({ 
  apiKey, 
  onOpenApiKeyModal, 
  isDark, 
  onToggleTheme, 
  isComparing,
  historyCount = 0,
  onOpenHistory,
  currentUser = null,
  onOpenAuthModal,
  onOpenProfile,
  onLogout
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-[#0B0F19]/85 border-b border-slate-200/80 dark:border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5E1E] to-[#FF8A50] flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/25">
            <FileDiff className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Doc<span className="text-[#FF5E1E]">Diff</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
              Document Difference &amp; Context Studio
            </p>
          </div>
        </div>

        {/* Supported Formats Chips (Cambased Minimalist Style) */}
        <div className="hidden md:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-white/[0.06] text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] mr-1">Formats:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-rose-500 font-bold text-[11px] shadow-sm">PDF</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-blue-500 font-bold text-[11px] shadow-sm">DOCX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-emerald-500 font-bold text-[11px] shadow-sm">XLSX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-amber-500 font-bold text-[11px] shadow-sm">PPTX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] shadow-sm">TXT</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* User Account Authentication Pill */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowToolsMenu(false);
                }}
                className="flex items-center space-x-1.5 sm:space-x-2 pl-1 pr-2.5 sm:pr-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] text-xs font-bold shadow-xs hover:border-[#FF5E1E]/50 transition cursor-pointer"
                title="View user profile & settings"
              >
                <UserAvatar user={currentUser} size="sm" />
                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[80px] sm:max-w-[120px] hidden xs:inline">
                  {currentUser.name}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#FF5E1E]/15 text-[#FF5E1E]">
                  PRO
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Enhanced Profile Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-3 border-b border-slate-100 dark:border-white/[0.06] mb-1.5 flex items-center space-x-3">
                      <UserAvatar user={currentUser} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate font-mono">
                          {currentUser.email}
                        </p>
                        <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Pro Plan Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Profile Actions */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-[#FFF4EF] dark:hover:bg-[#FF5E1E]/15 hover:text-[#FF5E1E] rounded-2xl transition text-left"
                      >
                        <User className="w-3.5 h-3.5 text-[#FF5E1E]" />
                        <span>View &amp; Edit Profile</span>
                      </button>

                      {onOpenHistory && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenHistory();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-2xl transition text-left"
                        >
                          <span className="flex items-center space-x-2.5">
                            <Cloud className="w-3.5 h-3.5 text-blue-500" />
                            <span>My Cloud Diffs</span>
                          </span>
                          {historyCount > 0 && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                              {historyCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="my-1 border-t border-slate-100 dark:border-white/[0.06]" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FF5E1E] hover:bg-[#E04A0E] text-white shadow-xs hover:scale-105 active:scale-95 transition"
              title="Sign in or create a free account"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Clean Tools & Quick Settings Toggle Menu (Icon Only) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowToolsMenu(!showToolsMenu);
                setShowProfileMenu(false);
              }}
              className={`p-2.5 rounded-full border transition-all duration-200 shadow-xs cursor-pointer hover:scale-105 active:scale-95 ${
                showToolsMenu
                  ? 'bg-[#FF5E1E] text-white border-transparent shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-[#FF5E1E]/50 hover:text-[#FF5E1E]'
              }`}
              title="Quick Tools (History, AI Settings, Theme)"
              aria-label="Quick Tools (History, AI Settings, Theme)"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Floating Tools Dropdown Menu */}
            {showToolsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowToolsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-white/[0.06] mb-1.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5E1E]" />
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Tools &amp; Quick Settings
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* 1. Comparison History */}
                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowToolsMenu(false);
                          if (!currentUser && onOpenAuthModal) {
                            onOpenAuthModal('login', 'Sign in or create a free account to view and access your comparison history.');
                          } else {
                            onOpenHistory();
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#FFF4EF] dark:hover:bg-[#FF5E1E]/15 hover:text-[#FF5E1E] rounded-2xl transition text-left group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center text-[#FF5E1E]">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#FF5E1E]">
                              Comparison History
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {currentUser ? 'Reopen past sessions & audits' : 'Sign in to access past diffs'}
                            </p>
                          </div>
                        </div>
                        {!currentUser ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Sign In</span>
                          </span>
                        ) : historyCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/15 text-[#FF5E1E]">
                            {historyCount} saved
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">0 saved</span>
                        )}
                      </button>
                    )}

                    {/* 2. AI Key & Gemini Reasoning Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        if (onOpenApiKeyModal) onOpenApiKeyModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 rounded-2xl transition text-left group cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          apiKey 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <Key className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">
                            AI Key Settings
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {apiKey ? 'Gemini 2.5 Flash active' : 'Google Gemini API key'}
                          </p>
                        </div>
                      </div>
                      {apiKey ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-0.5">
                          <span>Set Key</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </button>

                    {/* 3. Dark / Light Theme Toggle Switch */}
                    <div className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-white/[0.04]">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Switch app color theme</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleTheme}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                          isDark ? 'bg-[#FF5E1E]' : 'bg-slate-300'
                        }`}
                        aria-label="Toggle dark/light mode"
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                            isDark ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] px-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>DocDiff PRO v1.0</span>
                    <span className="text-emerald-500 font-bold">● 100% In-Memory Safe</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
