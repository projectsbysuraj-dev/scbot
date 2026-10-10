import React, { useState, useEffect } from 'react';
import { Send, Check, Copy, Users, RefreshCw, Clock } from 'lucide-react';
import { AppSettings, UserProfile } from '../types';
import {
  getUserLastReferrals,
  fetchUserLastReferralsFromRemote,
  subscribeRealtime,
  UserReferralEntry,
  syncUserWithRemote,
} from '../services/store';
import { triggerHaptic, openExternalOrTelegramLink } from '../services/telegram';

interface InviteScreenProps {
  user: UserProfile;
  settings: AppSettings;
}

export const InviteScreen: React.FC<InviteScreenProps> = ({ user, settings }) => {
  const [copiedBot, setCopiedBot] = useState(false);
  const [lastReferrals, setLastReferrals] = useState<UserReferralEntry[]>(() =>
    getUserLastReferrals(user.id, 10)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const botUsername = settings.botUsername || 'scratch_the_win_bot';
  const botReferralLink = `https://t.me/${botUsername}?start=ref_${user.id}`;
  const totalReferralEarning = (user.spinsEarned || 0) * (settings.spinWinAmount || 5);

  const loadLatestReferrals = async () => {
    try {
      const refs = await fetchUserLastReferralsFromRemote(user.id, 10);
      if (refs && refs.length > 0) {
        setLastReferrals(refs);
      } else {
        setLastReferrals(getUserLastReferrals(user.id, 10));
      }
    } catch {
      setLastReferrals(getUserLastReferrals(user.id, 10));
    }
  };

  useEffect(() => {
    loadLatestReferrals();
    const unsub = subscribeRealtime(() => {
      loadLatestReferrals();
    });
    return unsub;
  }, [user.id]);

  const handleCopyBot = () => {
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(botReferralLink);
      setCopiedBot(true);
      setTimeout(() => setCopiedBot(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareTelegram = () => {
    triggerHaptic('medium');
    const text = encodeURIComponent(
      `🎁 Join ${settings.appTitle || 'Scratch The Win'}! Scratch the card & Win Up to ₹50 instant real cash directly into your UPI/Bank! 100% Guaranteed Cash Win!`
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botReferralLink)}&text=${text}`;
    openExternalOrTelegramLink(shareUrl);
  };

  const handleRefreshData = async () => {
    triggerHaptic('light');
    setIsRefreshing(true);
    await Promise.all([
      syncUserWithRemote(user.id),
      loadLatestReferrals(),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const displayedHistory = showAllActivity ? lastReferrals : lastReferrals.slice(0, 10);

  return (
    <div className="w-full flex flex-col items-center gap-3.5 pb-20 animate-fade-in select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP INVITE HERO + REFERRAL LINK UNIFIED CARD               */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-white rounded-[28px] shadow-xl shadow-orange-950/8 border border-white overflow-hidden">
        {/* Top Hero Banner Area */}
        <div className="relative p-4 sm:p-5 pb-4 bg-gradient-to-br from-[#fff9f2] via-[#ffffff] to-[#f2fdf6] overflow-hidden rounded-t-[28px] border-2 border-b-0 border-[#ff5e00]">
          {/* Top-Left Saffron Wave Accent */}
          <svg className="absolute top-0 left-0 w-36 h-20 pointer-events-none" viewBox="0 0 140 80" fill="none">
            <path d="M 0 0 C 45 0, 70 20, 85 45 C 100 65, 120 75, 140 80 L 0 80 Z" fill="#ea580c" opacity="0.14" />
          </svg>

          {/* Bottom-Right Orange Wave Accent */}
          <svg className="absolute bottom-0 right-0 w-48 h-28 pointer-events-none" viewBox="0 0 180 100" fill="none">
            <path d="M 180 100 C 120 100, 95 70, 70 40 C 45 15, 20 5, 0 0 L 180 0 Z" fill="#f97316" opacity="0.16" />
          </svg>

          {/* Floating Gold Coins */}
          <div className="absolute bottom-2 left-3 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-100 shadow-md flex items-center justify-center text-amber-950 font-['Outfit'] font-black text-xs rotate-[-15deg]">
            ₹
          </div>
          <div className="absolute top-3 right-28 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border border-yellow-100 shadow-sm flex items-center justify-center text-amber-950 font-['Outfit'] font-black text-[10px] rotate-12">
            ₹
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2">
            {/* Left Copy */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-[#16a34a] font-['Outfit'] font-black text-[10px] px-2.5 py-0.5 rounded-full mb-1">
                <span>Win Up to ₹50 Per Scratch</span>
              </div>
              <h2 className="font-['Outfit'] font-black text-[#0f291e] text-[22px] sm:text-2xl tracking-tight leading-tight">
                Invite Friends
              </h2>
              <h3 className="font-['Outfit'] font-black text-[#ea580c] text-[20px] sm:text-[22px] tracking-tight leading-tight mb-2">
                &amp; Win Up to ₹50
              </h3>
              <p className="text-slate-600 text-[11px] sm:text-xs font-semibold leading-snug">
                Get <strong className="text-slate-800">1 Scratch Card</strong> for every friend who joins!
                <br />
                Your friend also gets <strong className="text-slate-800">1 Free Scratch Card!</strong>
              </p>
            </div>

            {/* Right 3D Paper Plane + 3D Gift Box Visual */}
            <div className="shrink-0 w-28 h-28 relative flex items-center justify-center">
              {/* 3D Green Paper Plane Flying Top-Left of Gift */}
              <div className="absolute -top-1 left-1 z-20 w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#16a34a] to-[#4ade80] shadow-lg shadow-emerald-600/30 flex items-center justify-center -rotate-12 border border-emerald-200/60">
                <Send className="w-5 h-5 text-white fill-white" />
              </div>

              {/* 3D Gift Box with Green Ribbon */}
              <div className="relative mt-4 ml-3 w-20 h-20 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-xl">
                  {/* Green Ribbon Loops */}
                  <path
                    d="M50 26 C35 8, 18 16, 32 30 C40 34, 46 30, 50 26 Z"
                    fill="#16a34a"
                  />
                  <path
                    d="M50 26 C65 8, 82 16, 68 30 C60 34, 54 30, 50 26 Z"
                    fill="#22c55e"
                  />
                  {/* Gift Box Lid */}
                  <rect x="14" y="25" width="72" height="16" rx="5" fill="#fb923c" />
                  <rect x="14" y="35" width="72" height="6" rx="2" fill="#ea580c" />
                  {/* Gift Box Body */}
                  <rect x="18" y="41" width="64" height="47" rx="7" fill="#f97316" />
                  <rect x="50" y="41" width="32" height="47" rx="5" fill="#ea580c" />
                  {/* Vertical Green Ribbon */}
                  <rect x="43" y="25" width="14" height="63" fill="#16a34a" />
                  {/* Horizontal Green Ribbon */}
                  <rect x="18" y="58" width="64" height="11" fill="#22c55e" />
                </svg>

                {/* Gold Coin Badge Next to Gift */}
                <div className="absolute -left-2 bottom-1 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-100 shadow-md flex items-center justify-center text-amber-950 font-['Outfit'] font-black text-[11px]">
                  ₹
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Referral Link Controls Inside Unified Card */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 rounded-b-[28px] border-2 border-t-0 border-[#ff5e00]">
          {/* Header Row: Your Referral Link + Fetch Data */}
          <div className="flex items-center justify-between">
            <span className="font-['Outfit'] font-extrabold text-slate-900 text-xs sm:text-sm">
              Your Referral Link
            </span>
            <button
              type="button"
              onClick={handleRefreshData}
              className="flex items-center gap-1 text-xs font-extrabold text-[#16a34a] hover:text-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Fetch Data</span>
            </button>
          </div>

          {/* Link Input + Orange Copy Button */}
          <div className="w-full bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-1.5 pl-3.5 flex items-center justify-between gap-2 shadow-inner">
            <span className="text-xs font-bold text-slate-700 truncate select-all">
              {botReferralLink}
            </span>
            <button
              type="button"
              onClick={handleCopyBot}
              className={`font-['Outfit'] font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                copiedBot
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white active:scale-95 shadow-md shadow-orange-500/25'
              }`}
            >
              {copiedBot ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{copiedBot ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Full-Width Green Invite Friends on Telegram Button */}
          <button
            type="button"
            onClick={handleShareTelegram}
            className="w-full bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#15803d] hover:from-[#15803d] hover:to-[#16a34a] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-full shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 fill-white" />
            <span>Invite Friends on Telegram</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REFERRAL STATISTICS (3 Cards Matching Reference)           */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-100 border-2 border-[#ff5e00] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5e00]" />
            </div>
            <h2 className="font-['Outfit'] font-black text-slate-900 text-base tracking-tight">
              Referral Statistics
            </h2>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-[#16a34a] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            <span>Realtime</span>
          </div>
        </div>

        {/* 3-Column Stats Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card 1: Friends Joined */}
          <div className="bg-white rounded-[22px] p-3.5 text-center shadow-md shadow-slate-900/5 border border-slate-100 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-[#ff5e00] mb-1.5">
              <Users className="w-5 h-5 fill-[#ff5e00] text-[#ff5e00]" />
            </div>
            <span className="font-['Outfit'] font-black text-2xl text-[#ea580c] leading-none">
              {user.friendsJoined || 0}
            </span>
            <span className="text-[11px] text-slate-600 font-bold tracking-tight mt-1.5 leading-tight">
              Friends Joined
            </span>
          </div>

          {/* Card 2: Scratch Cards Earned */}
          <div className="bg-white rounded-[22px] p-3.5 text-center shadow-md shadow-slate-900/5 border border-slate-100 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-1.5">
              <div className="w-7 h-5 rounded-md bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white font-['Outfit'] font-black text-[11px] flex items-center justify-center -rotate-12 shadow-xs">
                ₹
              </div>
            </div>
            <span className="font-['Outfit'] font-black text-2xl text-[#16a34a] leading-none">
              {user.spinsEarned || 0}
            </span>
            <span className="text-[11px] text-slate-600 font-bold tracking-tight mt-1.5 leading-tight">
              Scratch Cards Earned
            </span>
          </div>

          {/* Card 3: Total Earning */}
          <div className="bg-white rounded-[22px] p-3.5 text-center shadow-md shadow-slate-900/5 border border-slate-100 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border border-yellow-200 text-amber-950 font-['Outfit'] font-black text-xs flex items-center justify-center shadow-xs">
                ₹
              </div>
            </div>
            <span className="font-['Outfit'] font-black text-2xl text-[#ea580c] leading-none">
              ₹{totalReferralEarning}
            </span>
            <span className="text-[11px] text-slate-600 font-bold tracking-tight mt-1.5 leading-tight">
              Total Earning
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RECENT REFERRAL ACTIVITY (Exact Match to Screenshot)       */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-100 border-2 border-[#ff5e00] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5e00]" />
            </div>
            <h2 className="font-['Outfit'] font-black text-slate-900 text-base tracking-tight">
              Recent Referral Activity
            </h2>
          </div>

          {lastReferrals.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllActivity((prev) => !prev)}
              className="text-xs font-extrabold text-[#ea580c] hover:text-orange-700 cursor-pointer"
            >
              {showAllActivity ? 'Show Less' : `View All (${lastReferrals.length})`}
            </button>
          )}
          {lastReferrals.length <= 5 && lastReferrals.length > 0 && (
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {lastReferrals.length} {lastReferrals.length === 1 ? 'Friend' : 'Friends'}
            </span>
          )}
        </div>

        {/* Activity List Container */}
        <div className="w-full bg-white rounded-[26px] p-3.5 shadow-md shadow-slate-900/5 border border-slate-100">
          {displayedHistory.length === 0 ? (
            <div className="py-7 text-center text-slate-400 text-xs">
              <p className="font-bold text-slate-600 mb-1">No Referral Activity Yet</p>
              <p className="text-[11px] text-slate-400">
                Share your referral link above to invite friends and earn free scratch cards!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedHistory.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar with Status Check or Clock */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-100 to-amber-50 border border-orange-200 flex items-center justify-center font-['Outfit'] font-black text-sm text-[#ea580c]">
                        👤
                      </div>
                      {t.rewardGiven ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#16a34a] border-2 border-white flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white">
                          <Clock className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-['Outfit'] font-extrabold text-slate-900 block text-xs sm:text-[13px] leading-tight truncate">
                        {t.name || 'Friend'} {t.username ? <span className="text-slate-400 font-normal">(@{t.username})</span> : ''}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString()}{' '}
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right Pill: +1 Card or Pending */}
                  {t.rewardGiven ? (
                    <span className="font-['Outfit'] font-extrabold text-xs text-[#16a34a] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 shrink-0 flex items-center gap-1 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>+1 Card</span>
                    </span>
                  ) : (
                    <span className="font-['Outfit'] font-extrabold text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Pending Scratch</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteScreen;

