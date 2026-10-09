import React, { useState } from 'react';
import { Bell, Plus, ChevronLeft } from 'lucide-react';
import { AppSettings, ThemeSettings, UserProfile } from '../types';
import { TabType } from './BottomNav';
import { AppLogo } from './AppLogo';
import { triggerHaptic } from '../services/telegram';

interface HeaderProps {
  user: UserProfile;
  settings: AppSettings;
  theme: ThemeSettings;
  activeTab?: TabType;
  onNavigate?: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  activeTab = 'home',
  onNavigate,
}) => {
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const handleLogoClick = () => {
    triggerHaptic('light');
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleBellClick = () => {
    triggerHaptic('light');
    setShowNotificationToast(true);
    setTimeout(() => setShowNotificationToast(false), 3000);
  };

  const handlePlusClick = () => {
    triggerHaptic('medium');
    if (onNavigate) {
      onNavigate('wallet');
    }
  };

  const handleBackClick = () => {
    triggerHaptic('light');
    if (onNavigate) {
      onNavigate('home');
    }
  };

  return (
    <>
      <header className="w-full flex flex-col items-center pt-2 pb-2 relative z-20">
        {/* Main Top Header Bar Matching Screenshot */}
        <div className="w-full flex items-center justify-between px-0.5 gap-2">
          {/* Left: Back Button (only on Invite/Wallet, not on Home or Profile) + Logo + Title */}
          <div className="flex items-center gap-2 min-w-0">
            {activeTab !== 'home' && (
              <button
                type="button"
                onClick={handleBackClick}
                aria-label="Back to Home"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-800 hover:bg-slate-200/60 active:scale-90 transition-all shrink-0 cursor-pointer -ml-1"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.75]" />
              </button>
            )}

            {/* Logo badge with Instant Cashback / Scratch The Win Logo */}
            <div
              onClick={handleLogoClick}
              className="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0"
              title="Scratch The Win"
            >
              <AppLogo className="w-9 h-9" />
            </div>

            {/* App Title */}
            <div className="min-w-0">
              <h1 className="font-['Outfit'] font-black text-slate-900 text-base sm:text-lg tracking-tight leading-tight truncate">
                Scratch The Win
              </h1>
            </div>
          </div>

          {/* Right: Unified Pill matching screenshot */}
          {activeTab === 'invite' ? (
            <div className="flex items-center bg-[#16a34a] rounded-full pl-3.5 pr-1 py-1 shadow-md shadow-emerald-700/20 gap-2 shrink-0">
              <span className="font-['Outfit'] font-black text-white text-sm tracking-tight whitespace-nowrap">
                ₹ {user.balance.toFixed(2)}
              </span>

              <button
                type="button"
                onClick={handlePlusClick}
                aria-label="Add balance or withdraw"
                className="w-7 h-7 rounded-full bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center bg-white border border-slate-200/90 rounded-full pl-3 pr-1 py-1 shadow-xs gap-2 shrink-0">
              {/* Bell Icon */}
              <button
                type="button"
                onClick={handleBellClick}
                aria-label="Notifications"
                className="text-[#ea580c] hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
              >
                <Bell className="w-4 h-4 fill-[#ea580c] text-[#ea580c]" />
              </button>

              {/* Balance Text */}
              <span className="font-['Outfit'] font-black text-[#ea580c] text-sm tracking-tight whitespace-nowrap">
                ₹ {user.balance.toFixed(2)}
              </span>

              {/* Orange Plus Button */}
              <button
                type="button"
                onClick={handlePlusClick}
                aria-label="Add balance or withdraw"
                className="w-7 h-7 rounded-full bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white flex items-center justify-center shadow-md shadow-orange-500/25 active:scale-90 transition-transform shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Notification Toast */}
      {showNotificationToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-slide-up">
          <span className="text-base">🔔</span>
          <span>You have {user.spins} free scratches available! Scratch &amp; Win!</span>
        </div>
      )}
    </>
  );
};

