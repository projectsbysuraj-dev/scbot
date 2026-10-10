import React, { useState, useEffect } from 'react';
import {
  Send,
  RotateCw,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Landmark,
} from 'lucide-react';
import { AppSettings, UserProfile, WithdrawalRequest, Transaction } from '../types';
import {
  getUserTransactions,
  getUserWithdrawals,
  refreshWithdrawalsFromRemote,
  refreshTransactionsFromRemote,
  subscribeRealtime,
} from '../services/store';
import { WithdrawModal } from './WithdrawModal';
import { TabType } from './BottomNav';
import { triggerHaptic } from '../services/telegram';

interface WalletScreenProps {
  user: UserProfile;
  settings: AppSettings;
  onNavigate: (tab: TabType) => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ user, settings, onNavigate }) => {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'transactions'>('withdrawals');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(getUserWithdrawals(user.id));
  const [transactions, setTransactions] = useState<Transaction[]>(getUserTransactions(user.id));
  const [isSyncing, setIsSyncing] = useState(false);

  // Live real-time sync with database
  useEffect(() => {
    refreshWithdrawalsFromRemote().then(() => {
      setWithdrawals(getUserWithdrawals(user.id));
    });
    refreshTransactionsFromRemote().then(() => {
      setTransactions(getUserTransactions(user.id));
    });

    const unsub = subscribeRealtime(() => {
      setWithdrawals(getUserWithdrawals(user.id));
      setTransactions(getUserTransactions(user.id));
    });

    const interval = setInterval(() => {
      refreshWithdrawalsFromRemote().then(() => {
        setWithdrawals(getUserWithdrawals(user.id));
      });
      refreshTransactionsFromRemote().then(() => {
        setTransactions(getUserTransactions(user.id));
      });
    }, 4000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [user.id]);

  const handleOpenWithdraw = () => {
    triggerHaptic('medium');
    setShowWithdrawModal(true);
  };

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    setSuccessToast(true);
    setWithdrawals(getUserWithdrawals(user.id));
    setTransactions(getUserTransactions(user.id));
    setActiveTab('withdrawals');
    refreshWithdrawalsFromRemote().then(() => {
      setWithdrawals(getUserWithdrawals(user.id));
      setTransactions(getUserTransactions(user.id));
    });
    setTimeout(() => setSuccessToast(false), 4000);
  };

  const handleManualSync = async () => {
    triggerHaptic('light');
    setIsSyncing(true);
    try {
      await refreshWithdrawalsFromRemote();
      setWithdrawals(getUserWithdrawals(user.id));
      setTransactions(getUserTransactions(user.id));
      triggerHaptic('success');
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="w-full flex flex-col items-center gap-3.5 pb-20 animate-fade-in select-none">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="w-full bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg shadow-emerald-700/30 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Withdrawal request submitted! Live status updated below.</span>
          </div>
          <button onClick={() => setSuccessToast(false)} className="text-white ml-2 text-sm cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP GREEN BALANCE CARD + 2 ACTION BUTTONS (Exact Match)    */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-white rounded-[28px] p-3.5 sm:p-4 shadow-xl shadow-orange-950/8">
        {/* Green Balance Banner */}
        <div className="w-full bg-gradient-to-br from-[#0e4e32] via-[#157347] to-[#1e8e56] rounded-[22px] p-4 sm:p-5 text-white relative overflow-hidden shadow-lg shadow-emerald-950/15">
          {/* Top-Right Warm Saffron Wave Accent */}
          <svg className="absolute top-0 right-0 w-44 h-28 pointer-events-none" viewBox="0 0 170 110" fill="none">
            <path d="M 170 0 C 120 0, 95 25, 80 55 C 65 80, 35 100, 0 110 L 170 110 Z" fill="#f59e0b" opacity="0.22" />
          </svg>

          {/* Subtle Decorative Sparkles */}
          <span className="absolute top-6 left-36 text-emerald-300/60 text-xs pointer-events-none">✦</span>
          <span className="absolute bottom-4 left-44 text-emerald-300/50 text-xs pointer-events-none">✦</span>

          {/* Top-Right Speech Bubble Pill: Min ₹25 Payout */}
          <div className="absolute top-3.5 right-3.5 z-20 flex items-center">
            <div className="relative bg-white text-[#ea580c] font-['Outfit'] font-black text-[11px] sm:text-xs px-3.5 py-1 rounded-full shadow-md">
              <span>Min ₹{settings.minWithdrawalLimit} Payout</span>
              {/* Speech Bubble Pointer Tail */}
              <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white rotate-45" />
            </div>
            {/* Small Gold Coin overlapping top-right */}
            <div className="-ml-1.5 -mt-4 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border border-yellow-100 shadow-sm flex items-center justify-center text-amber-950 font-['Outfit'] font-black text-[10px]">
              ₹
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-2">
            {/* Left Balance Info */}
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-emerald-100/95 block mb-0.5">
                Your Balance
              </span>

              <h2 className="font-['Outfit'] font-black text-4xl sm:text-[42px] text-white tracking-tight leading-none my-1">
                ₹ {user.balance.toFixed(2)}
              </h2>

              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-semibold leading-snug mt-2.5">
                Instant 100% Payout via
                <br />
                UPI &amp; Bank Account
              </p>
            </div>

            {/* Right 3D Orange Wallet with Cash & Gold Coins */}
            <div className="shrink-0 w-28 h-24 relative flex items-end justify-end -mb-1">
              {/* Floating Gold Coin Left of Wallet */}
              <div className="absolute bottom-3 left-0 z-20 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-100 shadow-md flex items-center justify-center text-amber-950 font-['Outfit'] font-black text-xs -rotate-12">
                ₹
              </div>

              {/* 3D Orange Leather Wallet SVG */}
              <svg viewBox="0 0 110 95" className="w-24 h-22 filter drop-shadow-xl">
                {/* Green Cash Bills Sticking Out Top */}
                <g transform="rotate(-8 55 25)">
                  <rect x="24" y="8" width="52" height="28" rx="4" fill="#22c55e" stroke="#bbf7d0" strokeWidth="1.5" />
                  <circle cx="50" cy="22" r="7" fill="#15803d" opacity="0.35" />
                  <text x="50" y="26" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">₹</text>
                </g>
                <g transform="rotate(6 60 25)">
                  <rect x="30" y="12" width="52" height="26" rx="4" fill="#16a34a" stroke="#86efac" strokeWidth="1.2" />
                </g>
                {/* Wallet Back Flap */}
                <rect x="16" y="26" width="76" height="56" rx="12" fill="#c2410c" />
                {/* Wallet Main Orange Body */}
                <rect x="14" y="30" width="76" height="54" rx="12" fill="url(#walletOrangeGrad)" />
                {/* Dashed Stitching */}
                <rect
                  x="19"
                  y="35"
                  width="66"
                  height="44"
                  rx="9"
                  fill="none"
                  stroke="#fed7aa"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.75"
                />
                {/* Wallet Right Clasp Strap */}
                <rect x="68" y="49" width="26" height="16" rx="6" fill="#9a3412" />
                <rect x="70" y="47" width="24" height="16" rx="6" fill="#ea580c" stroke="#fdba74" strokeWidth="1" />
                <circle cx="78" cy="55" r="3.5" fill="#fef08a" />
                <defs>
                  <linearGradient id="walletOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* 2 Action Buttons Directly Below Green Banner */}
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          <button
            type="button"
            onClick={handleOpenWithdraw}
            className="bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-xs sm:text-sm py-3.5 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 fill-white" />
            <span>Withdraw Cash</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="bg-[#f8fafc] hover:bg-slate-100 text-slate-800 font-['Outfit'] font-extrabold text-xs sm:text-sm py-3.5 rounded-full border border-slate-200/90 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <span className="w-5 h-4 rounded bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white font-['Outfit'] font-black text-[10px] flex items-center justify-center -rotate-12 shadow-xs shrink-0">
              ₹
            </span>
            <span className="truncate">Win Up to ₹50</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB SWITCHER PILL: Withdrawal Status vs All History        */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full flex items-center justify-between gap-2 bg-white p-1.5 rounded-full border border-slate-200/80 shadow-sm">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('withdrawals');
          }}
          className={`flex-1 py-2.5 rounded-full font-['Outfit'] font-black text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] text-white shadow-md shadow-orange-500/25'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Withdrawal Status</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="bg-white text-[#ea580c] px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('transactions');
          }}
          className={`flex-1 py-2.5 rounded-full font-['Outfit'] font-black text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] text-white shadow-md shadow-orange-500/25'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>All History</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB 1: WITHDRAWAL STATUS (Exact Match to Screenshot)       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'withdrawals' && (
        <div className="w-full space-y-3">
          {withdrawals.length === 0 ? (
            <div className="w-full bg-white rounded-[28px] p-6 shadow-md shadow-slate-900/5 border border-slate-100 text-center flex flex-col items-center">
              {/* 3D Orange Cash Box Illustration with Notes & Coins */}
              <div className="w-36 h-28 relative flex items-center justify-center mb-2">
                <svg viewBox="0 0 160 120" className="w-full h-full filter drop-shadow-md">
                  {/* Soft Ground Shadow */}
                  <ellipse cx="80" cy="108" rx="48" ry="7" fill="#e2e8f0" />
                  {/* Decorative Green Leaves */}
                  <path d="M28 72 C14 62, 16 48, 30 55 C36 58, 34 68, 28 72 Z" fill="#22c55e" opacity="0.85" />
                  <path d="M132 68 C146 58, 144 44, 130 51 C124 54, 126 64, 132 68 Z" fill="#16a34a" opacity="0.85" />
                  {/* White Receipt / Document Card Inside */}
                  <g transform="rotate(-6 72 45)">
                    <rect x="46" y="16" width="48" height="55" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1="55" y1="28" x2="84" y2="28" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="55" y1="36" x2="78" y2="36" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="55" y1="44" x2="82" y2="44" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                  {/* Green ₹ Cash Bill Sticking Out Right */}
                  <g transform="rotate(10 96 48)">
                    <rect x="68" y="22" width="46" height="48" rx="6" fill="#22c55e" stroke="#bbf7d0" strokeWidth="1.5" />
                    <circle cx="91" cy="40" r="8" fill="#15803d" opacity="0.3" />
                    <text x="91" y="44" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">₹</text>
                  </g>
                  {/* 3D Orange Holder / Box Front */}
                  <path
                    d="M36 52 L124 52 L116 98 C115 103, 110 106, 104 106 L56 106 C50 106, 45 103, 44 98 Z"
                    fill="url(#boxOrangeGrad)"
                  />
                  {/* Box Top Rim */}
                  <rect x="33" y="47" width="94" height="9" rx="4.5" fill="#fb923c" />
                  {/* Floating Gold Coins */}
                  <circle cx="30" cy="88" r="9" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />
                  <text x="30" y="92" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="900">₹</text>
                  <circle cx="130" cy="84" r="8" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.5" />
                  <text x="130" y="88" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="900">₹</text>
                  <defs>
                    <linearGradient id="boxOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="50%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h3 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 tracking-tight mb-1.5">
                No Withdrawal Requests Yet
              </h3>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-[275px] mx-auto mb-5">
                Jab aap cash withdraw karenge, aapka <strong className="text-slate-700">Pending</strong>,{' '}
                <strong className="text-slate-700">Approved</strong> aur{' '}
                <strong className="text-slate-700">Rejected</strong> status yahan live dikhega.
              </p>

              <button
                type="button"
                onClick={handleOpenWithdraw}
                className="w-full max-w-[260px] bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-base py-3.5 px-8 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-lg leading-none">₹</span>
                <span>Withdraw Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-100 border-2 border-[#ff5e00] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff5e00]" />
                  </div>
                  <h3 className="font-['Outfit'] font-black text-slate-900 text-sm">
                    Your Payout Requests
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="text-xs font-extrabold text-[#16a34a] hover:text-emerald-700 flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Checking...' : 'Refresh Status'}</span>
                </button>
              </div>

              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="w-full bg-white rounded-[24px] p-4 shadow-md shadow-slate-900/5 border border-slate-100 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        WITHDRAWAL AMOUNT
                      </span>
                      <span
                        className={`text-2xl font-['Outfit'] font-black ${
                          w.status === 'pending'
                            ? 'text-[#ea580c]'
                            : w.status === 'approved'
                            ? 'text-[#16a34a]'
                            : 'text-rose-600 line-through'
                        }`}
                      >
                        ₹{w.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="text-right">
                      {w.status === 'pending' && (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Pending</span>
                        </div>
                      )}

                      {w.status === 'approved' && (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-[#16a34a] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </div>
                      )}

                      {w.status === 'rejected' && (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Details Box */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1 mb-3 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-500 font-semibold">Method:</span>
                      <span className="font-extrabold uppercase text-slate-900">
                        {w.method === 'upi' ? '⚡ UPI Payout' : '🏦 Bank Transfer'}
                      </span>
                    </div>

                    {w.method === 'upi' ? (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500 font-semibold">UPI ID:</span>
                        <span className="font-mono font-bold text-[#ea580c]">
                          {w.upiId}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-semibold">A/C Number:</span>
                          <span className="font-mono font-bold text-[#ea580c]">
                            {w.accountNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-semibold">Bank / IFSC:</span>
                          <span className="font-mono text-slate-800 font-bold">
                            {w.bankName} ({w.ifsc})
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-200/70">
                      <span>Request ID: #{w.id}</span>
                      <span>
                        {new Date(w.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Informational Message Banner based on status */}
                  {w.status === 'pending' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <b>Verification in progress:</b> Security team aapki request verify kar rahi hai. Approval hote hi paise aapke account me bhej diye jayenge.
                      </span>
                    </div>
                  )}

                  {w.status === 'approved' && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a] shrink-0 mt-0.5" />
                      <span>
                        <b>Payment Successful:</b> ₹{w.amount.toFixed(2)} aapke {w.method.toUpperCase()} account me transfer kar diye gaye hain.
                      </span>
                    </div>
                  )}

                  {w.status === 'rejected' && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-900 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-rose-700 block">
                          Reason: {w.rejectReason || 'Invalid details provided'}
                        </span>
                        <span className="text-slate-600 text-[10px]">
                          ₹{w.amount.toFixed(2)} aapke wallet balance me wapas refund kar diye gaye hain.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 2: ALL TRANSACTIONS HISTORY                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'transactions' && (
        <div className="w-full space-y-2.5">
          {transactions.length === 0 ? (
            <div className="w-full py-10 px-6 text-center text-slate-500 text-xs font-semibold leading-relaxed bg-white rounded-[28px] border border-slate-100 shadow-sm">
              No transactions found yet. Scratch a card to win instant cash!
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 leading-snug">
                      {tx.description}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(tx.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : tx.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-['Outfit'] font-black text-sm block ${
                        tx.type === 'referral_bonus'
                          ? 'text-[#16a34a]'
                          : tx.amount > 0
                          ? 'text-[#16a34a]'
                          : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'referral_bonus'
                        ? '+1 Card'
                        : `${tx.amount > 0 ? '+' : '-'}₹${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. BOTTOM 3 TRUST BADGE CARDS (Exact Match to Screenshot)     */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full grid grid-cols-3 gap-2.5">
        {/* Badge 1: Instant Payout */}
        <div className="bg-white rounded-[22px] p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-1.5">
            <Zap className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <span className="font-['Outfit'] font-extrabold text-xs text-slate-800 leading-tight">
            Instant
          </span>
          <span className="font-['Outfit'] font-bold text-[11px] text-slate-500 leading-tight">
            Payout
          </span>
        </div>

        {/* Badge 2: 100% Secure */}
        <div className="bg-white rounded-[22px] p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-1.5">
            <ShieldCheck className="w-5 h-5 fill-[#16a34a] text-white" />
          </div>
          <span className="font-['Outfit'] font-extrabold text-xs text-slate-800 leading-tight">
            100%
          </span>
          <span className="font-['Outfit'] font-bold text-[11px] text-slate-500 leading-tight">
            Secure
          </span>
        </div>

        {/* Badge 3: UPI & Bank Transfer */}
        <div className="bg-white rounded-[22px] p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center mb-1.5">
            <Landmark className="w-5 h-5 text-[#ea580c]" />
          </div>
          <span className="font-['Outfit'] font-extrabold text-xs text-slate-800 leading-tight">
            UPI &amp; Bank
          </span>
          <span className="font-['Outfit'] font-bold text-[11px] text-slate-500 leading-tight">
            Transfer
          </span>
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawModal
          user={user}
          settings={settings}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
};

