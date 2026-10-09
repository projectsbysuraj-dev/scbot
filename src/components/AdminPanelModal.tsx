import React, { useState } from 'react';
import {
  X,
  RotateCw,
  CheckCircle,
  XCircle,
  Check,
  Copy,
  Menu,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AppSettings,
  ThemeSettings,
  UserProfile,
} from '../types';
import {
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  saveSettings,
  getAllUsers,
  addSpinsToUser,
  addBalanceToUser,
  subscribeRealtime,
  getUserLastReferrals,
} from '../services/store';
import { triggerHaptic } from '../services/telegram';

interface AdminPanelModalProps {
  currentUser: UserProfile;
  settings: AppSettings;
  theme: ThemeSettings;
  onClose: () => void;
}

type AdminTab = 'withdrawals' | 'spins' | 'settings';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentUser,
  settings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('withdrawals');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedReferralUsers, setExpandedReferralUsers] = useState<Record<string, boolean>>({});
  const [withdrawals, setWithdrawals] = useState(getAllWithdrawals());
  const [users, setUsers] = useState(getAllUsers());
  const [visibleUserCount, setVisibleUserCount] = useState<number>(10);

  // Form states for settings tab matching Screenshot 7
  const [botUsername, setBotUsername] = useState(settings.botUsername);
  const [channelLink, setChannelLink] = useState(settings.telegramChannelUrl);
  const [appTitle, setAppTitle] = useState(settings.appTitle);
  const [spinWinAmount, setSpinWinAmount] = useState(String(settings.spinWinAmount));
  const [minWithdrawal, setMinWithdrawal] = useState(String(settings.minWithdrawalLimit));
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Form states for User Spins tab matching Screenshot 8
  const [targetUserId, setTargetUserId] = useState('');
  const [spinsToAdd, setSpinsToAdd] = useState('');
  const [balanceToAdd, setBalanceToAdd] = useState('');
  const [userUpdateToast, setUserUpdateToast] = useState<string | null>(null);

  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);

  const toggleUserReferrals = (userId: string) => {
    triggerHaptic('light');
    setExpandedReferralUsers((prev) => ({
      ...prev,
      [userId]: !(prev[userId] ?? true),
    }));
  };

  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedItemKey(key);
    triggerHaptic('light');
    setTimeout(() => {
      setCopiedItemKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Real-time synchronization
  React.useEffect(() => {
    const unsub = subscribeRealtime(() => {
      setWithdrawals(getAllWithdrawals());
      setUsers(getAllUsers());
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    setBotUsername(settings.botUsername);
    setChannelLink(settings.telegramChannelUrl);
    setAppTitle(settings.appTitle);
    setSpinWinAmount(String(settings.spinWinAmount));
    setMinWithdrawal(String(settings.minWithdrawalLimit));
    setAdminPin(settings.adminPin);
  }, [settings]);

  const handleRefresh = () => {
    triggerHaptic('light');
    setWithdrawals(getAllWithdrawals());
    setUsers(getAllUsers());
  };

  const handleApprove = (id: string) => {
    triggerHaptic('success');
    approveWithdrawal(id);
    setWithdrawals(getAllWithdrawals());
  };

  const handleReject = (id: string) => {
    triggerHaptic('error');
    const reason = prompt('Reason for rejection (e.g. Invalid UPI ID / Incorrect Bank Details):', 'Invalid UPI ID');
    if (reason !== null) {
      rejectWithdrawal(id, reason || 'Details verification failed');
      setWithdrawals(getAllWithdrawals());
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    saveSettings({
      botUsername: botUsername.replace(/^@/, '').trim(),
      telegramChannelUrl: channelLink.trim(),
      appTitle: appTitle.trim() || 'Scratch The Win',
      spinWinAmount: Number(spinWinAmount) || 5,
      minWithdrawalLimit: Number(minWithdrawal) || 20,
      adminPin: adminPin.trim() || '7777',
    });
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleUpdateUserSpinsAndBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveUserId = targetUserId.trim() || currentUser.id;
    const targetUser = users.find(u => u.id === effectiveUserId || u.telegramId === effectiveUserId);

    if (!targetUser) {
      setUserUpdateToast(`❌ User #${effectiveUserId} not found in database!`);
      return;
    }

    triggerHaptic('success');
    let message = '';

    const spinsNum = parseInt(spinsToAdd);
    if (!isNaN(spinsNum) && spinsNum !== 0) {
      addSpinsToUser(targetUser.id, spinsNum);
      message += `+${spinsNum} Scratches `;
    }

    const balNum = parseFloat(balanceToAdd);
    if (!isNaN(balNum) && balNum !== 0) {
      addBalanceToUser(targetUser.id, balNum, 'Admin added balance');
      message += `+₹${balNum} Balance `;
    }

    setUsers(getAllUsers());
    setSpinsToAdd('');
    setBalanceToAdd('');
    setUserUpdateToast(`✅ Successfully updated ${targetUser.name} (${message.trim() || 'No changes'})!`);
    setTimeout(() => setUserUpdateToast(null), 4000);
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  const menuItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'withdrawals',
      label: 'Withdrawals Queue',
      icon: <CreditCard className="w-4 h-4" />,
      badge: pendingWithdrawals.length,
    },
    {
      id: 'spins',
      label: 'Users & Last 10 Referrals',
      icon: <Users className="w-4 h-4" />,
      badge: users.length,
    },
    {
      id: 'settings',
      label: 'Bot & App Settings',
      icon: <SettingsIcon className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up relative">
        {/* Top Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0"></div>

        {/* Modal Header with Menu Bar Button */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsMenuOpen(!isMenuOpen);
              }}
              className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#0284c7] flex items-center justify-center transition-all cursor-pointer"
              title="Open Admin Menu Bar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-['Outfit'] font-black text-slate-800 text-base sm:text-lg tracking-tight leading-tight">
                Admin Control Panel
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Menu Bar System inside Modal */}
        {isMenuOpen && (
          <div className="mb-3 p-2.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-1.5 animate-fade-in shrink-0">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>Admin Menu Bar</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 1: Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                User Withdrawal Requests:
              </span>
              <button
                onClick={handleRefresh}
                className="text-xs text-[#0284c7] hover:text-[#0369a1] font-bold flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100"
              >
                <RotateCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="w-full py-16 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-100">
                No withdrawal requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-['Outfit'] font-black text-sm text-slate-800">
                            {w.userName}
                          </h4>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                            #{w.userId}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(w.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-['Outfit'] font-black text-lg text-[#0284c7] block">
                          ₹{w.amount}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                            w.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : w.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    </div>

                    {/* Method Details */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                        <span>{w.method === 'upi' ? '⚡ UPI Transfer' : '🏦 Bank Transfer'}</span>
                      </div>
                      {w.method === 'upi' ? (
                        <div className="font-mono text-slate-800 font-bold bg-sky-50 px-2.5 py-1.5 rounded border border-sky-100 flex items-center justify-between gap-2">
                          <span className="select-all truncate">UPI ID: {w.upiId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(w.upiId || '', `modal_upi_${w.id}`)}
                            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all border ${
                              copiedItemKey === `modal_upi_${w.id}`
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-white hover:bg-slate-100 text-sky-700 border-sky-200'
                            }`}
                            title="Copy UPI ID"
                          >
                            {copiedItemKey === `modal_upi_${w.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="space-y-0.5 text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                            <div>A/C Holder: <strong>{w.accountHolder}</strong></div>
                            <div>A/C Number: <strong className="font-mono select-all">{w.accountNumber}</strong></div>
                            <div>IFSC: <strong className="font-mono select-all">{w.ifsc}</strong></div>
                            {w.bankName && <div>Bank: {w.bankName}</div>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyText(w.accountNumber || '', `modal_acc_${w.id}`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all border ${
                                copiedItemKey === `modal_acc_${w.id}`
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {copiedItemKey === `modal_acc_${w.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>A/C Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy A/C</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyText(w.ifsc || '', `modal_ifsc_${w.id}`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all border ${
                                copiedItemKey === `modal_ifsc_${w.id}`
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {copiedItemKey === `modal_ifsc_${w.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>IFSC Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy IFSC</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const details = `Bank: ${w.bankName || 'N/A'}\nA/C Number: ${w.accountNumber}\nIFSC: ${w.ifsc}\nA/C Holder: ${w.accountHolder}`;
                                handleCopyText(details, `modal_bank_all_${w.id}`);
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all border ${
                                copiedItemKey === `modal_bank_all_${w.id}`
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                              }`}
                            >
                              {copiedItemKey === `modal_bank_all_${w.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>All Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {w.rejectReason && (
                        <div className="mt-1 text-[11px] text-red-600 font-semibold">
                          Reason: {w.rejectReason}
                        </div>
                      )}
                    </div>

                    {/* Pending Action Buttons */}
                    {w.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprove(w.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-['Outfit'] font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Payout ✅</span>
                        </button>
                        <button
                          onClick={() => handleReject(w.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-['Outfit'] font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject & Refund ❌</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Bot & App Settings matching Screenshot 7 */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-3.5">
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">⚡</span>
              <div>
                <span className="text-xs font-black text-sky-900 block leading-tight">
                  Instant Real-time Sync Active
                </span>
                <span className="text-[11px] text-sky-700 font-medium leading-snug block mt-0.5">
                  Bot username ya koi bhi setting change karke Save karein — sabhi user screens aur Firebase me instant 0ms me update hoga!
                </span>
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-lg border border-sky-300/40">
                  <span className="font-bold">Live Bot:</span>
                  <span>t.me/{botUsername.replace(/^@/, '').trim() || 'RohitGiveawayBot'}</span>
                </div>
              </div>
            </div>

            {settingsSavedToast && (
              <div className="bg-emerald-500 text-white font-bold text-xs p-3 rounded-2xl flex items-center gap-2 animate-fade-in shadow-md">
                <Check className="w-4 h-4 shrink-0" />
                <span>Saved &amp; Updated Instantly across all User screens and Firebase!</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                TELEGRAM BOT USERNAME (Without @)
              </label>
              <input
                type="text"
                value={botUsername}
                onChange={(e) => setBotUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                placeholder="RohitGiveawayBot"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                OFFICIAL TELEGRAM CHANNEL LINK
              </label>
              <input
                type="url"
                value={channelLink}
                onChange={(e) => setChannelLink(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                placeholder="https://t.me/RohitGiveaway"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                APP TITLE
              </label>
              <input
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                placeholder="Scratch The Win"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  SCRATCH WIN AMOUNT (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={spinWinAmount}
                  onChange={(e) => setSpinWinAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  MINIMUM WITHDRAWAL LIMIT (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  placeholder="20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                CHANGE ADMIN PIN
              </label>
              <input
                type="text"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                placeholder="Current PIN: 7777"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>SAVE ALL SETTINGS 💾</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: User Spins & Balance matching Screenshot 8 */}
        {activeTab === 'spins' && (
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
            {userUpdateToast && (
              <div className="bg-slate-900 text-white font-bold text-xs p-3 rounded-2xl animate-fade-in">
                {userUpdateToast}
              </div>
            )}

            <form onSubmit={handleUpdateUserSpinsAndBalance} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  TARGET USER ID
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  placeholder="Enter User ID (or leave blank for yourself)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    ADD/SET SCRATCHES
                  </label>
                  <input
                    type="number"
                    value={spinsToAdd}
                    onChange={(e) => setSpinsToAdd(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    placeholder="e.g. 5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    ADD/SET BALANCE (₹)
                  </label>
                  <input
                    type="number"
                    value={balanceToAdd}
                    onChange={(e) => setBalanceToAdd(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-['Outfit'] font-black text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>UPDATE USER SCRATCHES &amp; BALANCE ⚡</span>
              </button>
            </form>

            {/* List of Detected Users (10 at a time) */}
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                Registered Users (Showing {Math.min(users.length, visibleUserCount)} of {users.length}):
              </span>
              <div className="space-y-2.5">
                {users.slice(0, visibleUserCount).map((u) => {
                  const last10Referrals = getUserLastReferrals(u.id, 10);
                  const isRefExpanded = expandedReferralUsers[u.id] ?? false;

                  return (
                    <div
                      key={u.id}
                      className="bg-white border border-slate-200 p-3 rounded-xl space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-xs font-bold text-slate-800 block">
                            {u.name} {u.id === currentUser.id ? '(You)' : ''}
                          </strong>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleCopyText(u.id, `modal_user_id_${u.id}`)}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                                copiedItemKey === `modal_user_id_${u.id}`
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              } cursor-pointer active:scale-95`}
                              title="Click to copy User ID"
                            >
                              <span>#{u.id}</span>
                              {copiedItemKey === `modal_user_id_${u.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-500" />
                              )}
                            </button>
                            <span className="text-[10px] text-slate-500 font-mono">
                              • Scratches: <strong className="text-sky-600">{u.spins}</strong> • Balance: <strong className="text-emerald-600">₹{u.balance}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              addSpinsToUser(u.id, 5);
                              setUsers(getAllUsers());
                              triggerHaptic('success');
                            }}
                            className="bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px] px-2 py-1 rounded-lg border border-sky-200"
                          >
                            +5 Scratches
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              addBalanceToUser(u.id, 20, 'Admin added balance');
                              setUsers(getAllUsers());
                              triggerHaptic('success');
                            }}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] px-2 py-1 rounded-lg border border-emerald-200"
                          >
                            +₹20
                          </button>
                        </div>
                      </div>

                      {/* Last 10 Referrals Section */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleUserReferrals(u.id)}
                          className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px] font-extrabold text-slate-700">
                              Last 10 Referrals ({last10Referrals.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-sky-600 font-bold">
                            <span>{isRefExpanded ? 'Hide' : 'Show'}</span>
                            {isRefExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </button>

                        {isRefExpanded && (
                          <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-200/80">
                            {last10Referrals.length === 0 ? (
                              <p className="text-[10px] text-slate-400 py-1.5 text-center">
                                No referrals recorded for this user yet.
                              </p>
                            ) : (
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {last10Referrals.map((refItem, idx) => (
                                  <div
                                    key={refItem.id}
                                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 font-mono font-bold text-[9px] flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="text-slate-700 font-bold truncate">
                                        {refItem.name}
                                        {refItem.joinerId ? ` (#${refItem.joinerId})` : ''}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 ${
                                        refItem.rewardGiven
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {refItem.rewardGiven ? '+1 Card' : 'Pending'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {users.length > visibleUserCount && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setVisibleUserCount((prev) => prev + 10);
                  }}
                  className="w-full mt-3 bg-sky-50 hover:bg-sky-100 text-[#0284c7] border border-sky-200 font-['Outfit'] font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Load Next 10 Users (+10) 👇
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
