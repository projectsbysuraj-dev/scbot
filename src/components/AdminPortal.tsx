import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  RotateCw,
  CheckCircle,
  XCircle,
  LogOut,
  ArrowLeft,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  Check,
  Copy,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Radio,
  Send,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import {
  AppSettings,
  ThemeSettings,
  UserProfile,
} from '../types';
import {
  getAllWithdrawals,
  refreshWithdrawalsFromRemote,
  fetchUsersBatchFromRemote,
  fetchUserLastReferralsFromRemote,
  approveWithdrawal,
  rejectWithdrawal,
  deletePermanentWithdrawal,
  deleteProcessedWithdrawals,
  clearAllWithdrawalsPermanent,
  saveSettings,
  getAllUsers,
  addSpinsToUser,
  addBalanceToUser,
  subscribeRealtime,
  getAdminCredentials,
  verifyAdminLogin,
  updateAdminPassword,
  updateAdminEmail,
  isAdminLoggedIn,
  logoutAdmin,
  getUserLastReferrals,
  UserReferralEntry,
  purgeAllDummyUsers,
} from '../services/store';
import { triggerHaptic } from '../services/telegram';

interface AdminPortalProps {
  settings: AppSettings;
  theme: ThemeSettings;
  onNavigateToUserApp: () => void;
}

type AdminTab = 'withdrawals' | 'users' | 'security' | 'settings' | 'broadcast';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  settings,
  onNavigateToUserApp,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminLoggedIn());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('withdrawals');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedReferralUsers, setExpandedReferralUsers] = useState<Record<string, boolean>>({});
  const [userReferralsMap, setUserReferralsMap] = useState<Record<string, UserReferralEntry[]>>({});
  const [loadingReferralsUser, setLoadingReferralsUser] = useState<Record<string, boolean>>({});
  const [withdrawals, setWithdrawals] = useState(getAllWithdrawals());
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers().slice(0, 10));
  const [visibleUserCount, setVisibleUserCount] = useState<number>(10);
  const [nextUsersCursor, setNextUsersCursor] = useState<string | null>(null);
  const [hasMoreRemoteUsers, setHasMoreRemoteUsers] = useState<boolean>(false);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState<boolean>(false);
  const [adminCreds, setAdminCreds] = useState(getAdminCredentials());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Settings form state
  const [botUsername, setBotUsername] = useState(settings.botUsername);
  const [channelLink, setChannelLink] = useState(settings.telegramChannelUrl);
  const [appTitle, setAppTitle] = useState(settings.appTitle);
  const [spinWinAmount, setSpinWinAmount] = useState(String(settings.spinWinAmount));
  const [minWithdrawal, setMinWithdrawal] = useState(String(settings.minWithdrawalLimit));
  const [isMinWithdrawalDirty, setIsMinWithdrawalDirty] = useState(false);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [limitUpdateSuccess, setLimitUpdateSuccess] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [limitSavedNotice, setLimitSavedNotice] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // User management state
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [spinsToAdd, setSpinsToAdd] = useState('');
  const [balanceToAdd, setBalanceToAdd] = useState('');
  const [userActionToast, setUserActionToast] = useState<string | null>(null);

  // Security / Password change state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState(adminCreds.email);
  const [securityToast, setSecurityToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [broadcastToast, setBroadcastToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);

  const loadInitialUsersBatch = async () => {
    setIsLoadingMoreUsers(true);
    try {
      await purgeAllDummyUsers();
      const res = await fetchUsersBatchFromRemote(10, null);
      setUsers(res.users);
      setNextUsersCursor(res.nextCursor);
      setHasMoreRemoteUsers(res.hasMore);
      setVisibleUserCount(10);
    } finally {
      setIsLoadingMoreUsers(false);
    }
  };

  const handleLoadNext10Users = async () => {
    triggerHaptic('light');
    if (hasMoreRemoteUsers && nextUsersCursor) {
      setIsLoadingMoreUsers(true);
      try {
        const res = await fetchUsersBatchFromRemote(10, nextUsersCursor);
        setUsers((prev) => {
          const map = new Map(prev.map((u) => [String(u.id).trim(), u]));
          for (const item of res.users) {
            map.set(String(item.id).trim(), item);
          }
          return Array.from(map.values());
        });
        setNextUsersCursor(res.nextCursor);
        setHasMoreRemoteUsers(res.hasMore);
        setVisibleUserCount((prev) => prev + 10);
      } finally {
        setIsLoadingMoreUsers(false);
      }
    } else {
      // Also support slicing local cached users 10 at a time
      const allLocal = getAllUsers();
      const nextCount = visibleUserCount + 10;
      setUsers(allLocal.slice(0, nextCount));
      setVisibleUserCount(nextCount);
    }
  };

  const toggleUserReferrals = async (userId: string) => {
    triggerHaptic('light');
    const willExpand = !expandedReferralUsers[userId];
    setExpandedReferralUsers((prev) => ({
      ...prev,
      [userId]: willExpand,
    }));

    if (willExpand) {
      setLoadingReferralsUser((prev) => ({ ...prev, [userId]: true }));
      try {
        const refs = await fetchUserLastReferralsFromRemote(userId, 10);
        setUserReferralsMap((prev) => ({ ...prev, [userId]: refs }));
      } finally {
        setLoadingReferralsUser((prev) => ({ ...prev, [userId]: false }));
      }
    }
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

  useEffect(() => {
    // 1. Initial lightweight fetch: Withdrawals + First 10 Users only (No full DB dump!)
    refreshWithdrawalsFromRemote().then((res) => setWithdrawals(res));
    loadInitialUsersBatch();

    // 2. Realtime state subscription
    const unsub = subscribeRealtime(() => {
      setWithdrawals(getAllWithdrawals());
      setAdminCreds(getAdminCredentials());
    });

    // 3. Periodic background sync every 4 seconds for withdrawals queue only
    const syncInterval = setInterval(() => {
      refreshWithdrawalsFromRemote().then((res) => setWithdrawals(res));
    }, 4000);

    return () => {
      unsub();
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    setBotUsername(settings.botUsername);
    setChannelLink(settings.telegramChannelUrl);
    setAppTitle(settings.appTitle);
    setSpinWinAmount(String(settings.spinWinAmount));
    if (!isMinWithdrawalDirty) {
      setMinWithdrawal(String(settings.minWithdrawalLimit));
    }
    setNewEmailInput(adminCreds.email);
  }, [
    settings.botUsername,
    settings.telegramChannelUrl,
    settings.appTitle,
    settings.spinWinAmount,
    settings.minWithdrawalLimit,
    isMinWithdrawalDirty,
    adminCreds.email,
  ]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = verifyAdminLogin(loginEmail, loginPassword);
    if (result.success) {
      triggerHaptic('success');
      setIsAuthenticated(true);
      // Fetch live data on successful login (10 users batch only)
      refreshWithdrawalsFromRemote().then((res) => setWithdrawals(res));
      loadInitialUsersBatch();
    } else {
      triggerHaptic('error');
      setLoginError(result.error || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    triggerHaptic('medium');
    logoutAdmin();
    setIsAuthenticated(false);
    onNavigateToUserApp();
  };

  const handleRefresh = async () => {
    triggerHaptic('light');
    setIsRefreshing(true);
    try {
      const [w] = await Promise.all([
        refreshWithdrawalsFromRemote(),
        loadInitialUsersBatch(),
      ]);
      setWithdrawals(w);
      triggerHaptic('success');
    } finally {
      setIsRefreshing(false);
    }
  };

  const [withdrawalToast, setWithdrawalToast] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: 'red' | 'amber' | 'emerald';
    showInput?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputValue?: string;
    onConfirm: (inputVal?: string) => Promise<void> | void;
  } | null>(null);
  const [dialogInputValue, setDialogInputValue] = useState('');

  const showWithdrawalToast = (msg: string) => {
    setWithdrawalToast(msg);
    setTimeout(() => setWithdrawalToast(null), 3500);
  };

  const handleApproveWithdrawal = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve & Mark Paid',
      message: 'Kya aap is withdrawal request ko approve karke paid mark karna chahte hain?',
      confirmLabel: 'Approve & Pay ✅',
      confirmColor: 'emerald',
      onConfirm: async () => {
        triggerHaptic('success');
        await approveWithdrawal(id);
        const updated = await refreshWithdrawalsFromRemote();
        setWithdrawals(updated);
        showWithdrawalToast('✅ Withdrawal approved and marked paid successfully!');
        setConfirmDialog(null);
      },
    });
  };

  const handleRejectWithdrawal = (id: string) => {
    setDialogInputValue('Invalid UPI ID / Details');
    setConfirmDialog({
      isOpen: true,
      title: 'Reject & Refund Withdrawal',
      message: 'Ye amount turant user ke balance mein refund ho jayega. Rejection ka reason likhein:',
      confirmLabel: 'Reject & Refund ❌',
      confirmColor: 'red',
      showInput: true,
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'e.g. Invalid UPI ID / Incorrect Bank Details',
      onConfirm: async (reason) => {
        triggerHaptic('error');
        await rejectWithdrawal(id, reason || 'Verification failed');
        const updated = await refreshWithdrawalsFromRemote();
        setWithdrawals(updated);
        showWithdrawalToast('❌ Withdrawal rejected and amount refunded to user balance.');
        setConfirmDialog(null);
      },
    });
  };

  const handleDeleteSingleWithdrawal = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Record (No Refund)',
      message: 'Kya aap is withdrawal request ko Firebase Database aur queue se PERMANENTLY DELETE karna chahte hain?\n\n⚠️ Note: Delete karne par user ko koi refund NAHI jayega.',
      confirmLabel: 'Delete Without Refund 🗑️',
      confirmColor: 'red',
      onConfirm: async () => {
        triggerHaptic('error');
        await deletePermanentWithdrawal(id);
        const updated = await refreshWithdrawalsFromRemote();
        setWithdrawals(updated);
        showWithdrawalToast('🗑️ Withdrawal record permanently deleted (No refund sent).');
        setConfirmDialog(null);
      },
    });
  };

  const handleCleanProcessedWithdrawals = () => {
    const processedCount = withdrawals.filter((w) => w.status === 'approved' || w.status === 'rejected').length;
    if (processedCount === 0) {
      showWithdrawalToast('ℹ️ Database mein koi bhi Approved ya Rejected records nahi hain.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Clean Processed History',
      message: `Kya aap sabhi ${processedCount} Approved aur Rejected records ko Firebase Database se PERMANENTLY DELETE karna chahte hain?\n\n(Pending requests delete nahi hongi aur safe rahengi).`,
      confirmLabel: `Clean ${processedCount} Records 🧹`,
      confirmColor: 'amber',
      onConfirm: async () => {
        triggerHaptic('medium');
        const count = await deleteProcessedWithdrawals();
        const updated = await refreshWithdrawalsFromRemote();
        setWithdrawals(updated);
        showWithdrawalToast(`🧹 ${count} processed records permanently clean kar diye gaye!`);
        setConfirmDialog(null);
      },
    });
  };

  const handleClearAllWithdrawals = () => {
    setConfirmDialog({
      isOpen: true,
      title: '🚨 KHATRA: Clear Entire Database',
      message: 'Kya aap Firebase Database se SAARI WITHDRAWALS (Approved, Rejected, aur Pending) PERMANENTLY DELETE karna chahte hain?\n\nDatabase 100% KHALI ho jayega aur count 0 ho jayega!',
      confirmLabel: 'Yes, Wipe All Database 💥',
      confirmColor: 'red',
      onConfirm: async () => {
        triggerHaptic('error');
        await clearAllWithdrawalsPermanent();
        const updated = await refreshWithdrawalsFromRemote();
        setWithdrawals(updated);
        showWithdrawalToast('💥 Sabhi withdrawals database se permanently delete ho gayi! Database khali hai.');
        setConfirmDialog(null);
      },
    });
  };

  const handleQuickUpdateMinWithdrawal = async (customAmount?: number) => {
    triggerHaptic('medium');
    const targetAmt = typeof customAmount === 'number' ? customAmount : parseFloat(minWithdrawal);
    const safeMin = !isNaN(targetAmt) && targetAmt > 0 ? Math.round(targetAmt) : 20;

    setIsUpdatingLimit(true);
    setMinWithdrawal(String(safeMin));
    setIsMinWithdrawalDirty(false);

    try {
      await saveSettings({
        minWithdrawalLimit: safeMin,
      });
      triggerHaptic('success');
      setLimitUpdateSuccess(true);
      setLimitSavedNotice(`✅ Minimum Withdrawal Limit successfully set to ₹${safeMin}! Changes active live for all users.`);
      setTimeout(() => setLimitUpdateSuccess(false), 3000);
      setTimeout(() => setLimitSavedNotice(null), 5000);
    } catch {
      triggerHaptic('error');
      setLimitSavedNotice(`⚠️ Saved locally: Min withdrawal ₹${safeMin}`);
      setTimeout(() => setLimitSavedNotice(null), 4000);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSavingSettings(true);

    let cleanChannel = channelLink.trim();
    if (cleanChannel.startsWith('@')) {
      cleanChannel = `https://t.me/${cleanChannel.replace(/^@/, '')}`;
    } else if (cleanChannel && !cleanChannel.startsWith('http://') && !cleanChannel.startsWith('https://')) {
      cleanChannel = `https://${cleanChannel}`;
    }

    const parsedMin = parseFloat(minWithdrawal);
    const safeMin = !isNaN(parsedMin) && parsedMin > 0 ? Math.round(parsedMin) : 20;

    const parsedWin = parseFloat(spinWinAmount);
    const safeWin = !isNaN(parsedWin) && parsedWin > 0 ? Math.round(parsedWin) : 5;

    try {
      await saveSettings({
        botUsername: botUsername.replace(/^@/, '').trim(),
        telegramChannelUrl: cleanChannel,
        appTitle: appTitle.trim() || 'Scratch The Win',
        spinWinAmount: safeWin,
        minWithdrawalLimit: safeMin,
      });
      triggerHaptic('success');
      setChannelLink(cleanChannel);
      setMinWithdrawal(String(safeMin));
      setSpinWinAmount(String(safeWin));
      setIsMinWithdrawalDirty(false);
      setSettingsSavedToast(true);
      setLimitSavedNotice(`✅ Settings & Min Withdrawal Limit (₹${safeMin}) saved successfully!`);
      setTimeout(() => {
        setSettingsSavedToast(false);
        setLimitSavedNotice(null);
      }, 5000);
    } catch {
      triggerHaptic('error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityToast(null);

    if (newPassInput !== confirmPassInput) {
      triggerHaptic('error');
      setSecurityToast({ type: 'error', message: 'New password and confirm password do not match!' });
      return;
    }

    const res = updateAdminPassword(currentPassInput, newPassInput);
    if (res.success) {
      triggerHaptic('success');
      setSecurityToast({ type: 'success', message: 'Password changed successfully! Keep it safe.' });
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setAdminCreds(getAdminCredentials());
    } else {
      triggerHaptic('error');
      setSecurityToast({ type: 'error', message: res.error || 'Failed to update password' });
    }
  };

  const handleChangeEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityToast(null);
    const res = updateAdminEmail(newEmailInput);
    if (res.success) {
      triggerHaptic('success');
      setSecurityToast({ type: 'success', message: 'Admin Gmail updated successfully!' });
      setAdminCreds(getAdminCredentials());
    } else {
      triggerHaptic('error');
      setSecurityToast({ type: 'error', message: res.error || 'Failed to update email' });
    }
  };

  const handleApplyUserAdjustments = (targetUser: UserProfile) => {
    triggerHaptic('success');
    let msg = '';
    const spins = parseInt(spinsToAdd);
    if (!isNaN(spins) && spins !== 0) {
      addSpinsToUser(targetUser.id, spins);
      msg += `${spins > 0 ? '+' : ''}${spins} Scratches `;
    }

    const bal = parseFloat(balanceToAdd);
    if (!isNaN(bal) && bal !== 0) {
      addBalanceToUser(targetUser.id, bal, 'Admin Manual Adjustment');
      msg += `${bal > 0 ? '+' : ''}₹${bal} Balance `;
    }

    if (msg) {
      setUserActionToast(`✅ Successfully applied ${msg} to User #${targetUser.id}`);
      setSpinsToAdd('');
      setBalanceToAdd('');
      setUsers(getAllUsers());
      setTimeout(() => setUserActionToast(null), 3500);
    }
  };

  const handleSendWebBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    triggerHaptic('medium');
    setIsBroadcasting(true);
    setBroadcastToast(null);

    try {
      let allUsersToBroadcast: UserProfile[] = [];
      try {
        const res = await fetch('https://scratch-7d728-default-rtdb.firebaseio.com/users.json');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            allUsersToBroadcast = Object.values(data);
          }
        }
      } catch {
        allUsersToBroadcast = getAllUsers();
      }

      if (allUsersToBroadcast.length === 0) {
        allUsersToBroadcast = getAllUsers();
      }

      const validRecipients = allUsersToBroadcast.filter((u) => u && u.id && !isNaN(Number(u.id)));

      if (validRecipients.length === 0) {
        setBroadcastToast({ type: 'error', message: 'No registered Telegram users found in database!' });
        setIsBroadcasting(false);
        return;
      }

      setBroadcastProgress({ sent: 0, failed: 0, total: validRecipients.length });
      let sent = 0;
      let failed = 0;
      const botToken = '8956392892:AAHHL_KxabHRt5_v3JYQGInzJhqNxDEUr5g';

      for (const u of validRecipients) {
        try {
          let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: Number(u.id),
              text: broadcastMessage,
              parse_mode: 'HTML',
            }),
          });
          if (!res.ok) {
            // Fallback: send as plain text without parse_mode if message had unescaped HTML or custom entities
            res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: Number(u.id),
                text: broadcastMessage,
              }),
            });
          }
          if (res.ok) {
            sent++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
        setBroadcastProgress({ sent, failed, total: validRecipients.length });
        await new Promise((resolve) => setTimeout(resolve, 45));
      }

      triggerHaptic('success');
      setBroadcastToast({
        type: 'success',
        message: `Broadcast finished! Delivered: ${sent} users, Failed: ${failed}`,
      });
      setBroadcastMessage('');
    } catch (err: any) {
      triggerHaptic('error');
      setBroadcastToast({ type: 'error', message: `Broadcast failed: ${err?.message || 'Network error'}` });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN: Shown if not authenticated
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-slate-100 font-sans">
        <div className="w-full max-w-md bg-slate-900/90 border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Top glow decoration */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Return to User App button */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <button
              type="button"
              onClick={onNavigateToUserApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs text-sky-400 hover:text-sky-300 font-bold border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Back to User App</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-400">Admin Login</span>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-sky-500/30 mb-3 border border-white/20">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <h1 className="font-['Outfit'] font-black text-2xl text-white tracking-tight">
              Admin Control Panel
            </h1>
            <p className="text-xs text-sky-200 mt-1">
              Secure Administration Portal (/admin)
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Gmail / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter admin email address"
                  autoComplete="off"
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-sky-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="new-password"
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-sky-500 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-['Outfit'] font-extrabold text-sm py-3.5 rounded-xl shadow-lg shadow-sky-600/30 active:scale-95 transition-all mt-2"
            >
              Sign In to Admin Dashboard 🔐
            </button>
          </form>

          {/* Return to user app link */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onNavigateToUserApp}
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to User App (Live Client)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const approvedCount = withdrawals.filter((w) => w.status === 'approved').length;
  const rejectedCount = withdrawals.filter((w) => w.status === 'rejected').length;

  const displayedWithdrawals = withdrawals
    .filter((w) => {
      if (withdrawalFilter === 'all') return true;
      return w.status === withdrawalFilter;
    })
    .sort((a, b) => {
      if (withdrawalFilter === 'all') {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.id.includes(searchUserQuery) ||
      u.username.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const adminMenuItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    {
      id: 'withdrawals',
      label: 'Withdrawals Queue',
      icon: <CreditCard className="w-4 h-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-400 text-amber-950',
    },
    {
      id: 'users',
      label: 'Users & Referrals',
      icon: <Users className="w-4 h-4" />,
      badge: users.length,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'security',
      label: 'Password & Security',
      icon: <KeyRound className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'settings',
      label: 'Bot & App Settings',
      icon: <SettingsIcon className="w-4 h-4" />,
    },
    {
      id: 'broadcast',
      label: 'Telegram Broadcast',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      badge: '👑 Premium',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Admin Navbar with Menu Bar Button */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Menu Bar Toggle Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsMenuOpen(true);
              }}
              aria-label="Open Admin Menu"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-sky-400 active:scale-95 transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Outfit'] font-black text-base sm:text-lg text-white leading-tight">
                  Admin Control Panel
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[160px] sm:max-w-none">
                {adminCreds.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={onNavigateToUserApp}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">User App</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-Out Admin Menu Bar Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-slate-900 border-r border-slate-800 h-full shadow-2xl flex flex-col z-10 animate-fade-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-['Outfit'] font-black text-sm text-white block leading-tight">
                    Admin Menu Bar
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ● Live RTDB Connected
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats in Menu Bar */}
            <div className="p-3.5 grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/30">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Pending Payouts</span>
                <span className="font-['Outfit'] font-black text-lg text-amber-400">{pendingCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Total Users</span>
                <span className="font-['Outfit'] font-black text-lg text-sky-400">{users.length}</span>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 py-1">
                Navigation Menu
              </div>
              {adminMenuItems.map((item) => {
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
                    className={`w-full px-3.5 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white shadow-lg shadow-sky-600/25'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                          isActive ? 'bg-white text-slate-950' : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigateToUserApp();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to User App</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Admin</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Admin Layout: Desktop Sidebar Menu Bar + Main Content */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
        {/* Persistent Desktop Sidebar Menu Bar */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-slate-900 border border-slate-800 rounded-3xl p-3.5 h-fit sticky top-20 shadow-xl">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 py-1.5 mb-1">
            Admin Menu Bar
          </div>
          <nav className="space-y-1.5">
            {adminMenuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(item.id);
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white shadow-lg shadow-sky-600/25'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                        isActive ? 'bg-white text-slate-950' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right/Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Quick Section Bar (Synced with Menu Bar) */}
          <div className="flex lg:hidden items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2.5 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsMenuOpen(true);
                }}
                className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>
              <span className="font-['Outfit'] font-black text-sm text-white">
                {adminMenuItems.find((i) => i.id === activeTab)?.label}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {activeTab === 'withdrawals' ? `${pendingCount} Pending` : `${users.length} Users`}
            </span>
          </div>

        {/* ----------------- TAB 1: WITHDRAWALS ----------------- */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-['Outfit'] font-black text-xl text-white">
                    Withdrawal Requests Queue
                  </h2>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Live Realtime Sync" />
                </div>
                <p className="text-xs text-slate-400">
                  Realtime pending UPI and Bank withdrawal requests from users
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
                </button>

                {/* Clean Approved & Rejected History Button */}
                <button
                  onClick={handleCleanProcessedWithdrawals}
                  className="bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Delete only Approved and Rejected history from database to keep queue clean"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clean History</span>
                </button>

                {/* Clear Entire Database Button */}
                <button
                  onClick={handleClearAllWithdrawals}
                  className="bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Permanently delete all withdrawals so database stays completely empty"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All DB 🗑️</span>
                </button>

                <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  Total: {withdrawals.length}
                </span>
              </div>
            </div>

            {/* Live Notification Toast */}
            {withdrawalToast && (
              <div className="p-3 bg-sky-500/20 border border-sky-500/50 text-sky-200 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in shadow-md">
                <span>{withdrawalToast}</span>
                <button onClick={() => setWithdrawalToast(null)} className="text-sky-300 hover:text-white text-xs">✕</button>
              </div>
            )}

            {/* Pending Requests Alert Banner */}
            {pendingCount > 0 && (
              <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-lg shadow-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="font-['Outfit'] font-black text-amber-300 text-base leading-tight">
                      {pendingCount} Pending Withdrawal Request{pendingCount > 1 ? 's' : ''} Received!
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      Users have submitted payout requests via UPI &amp; Bank. Review and approve below.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawalFilter('pending')}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-['Outfit'] font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
                >
                  View Pending Queue ({pendingCount})
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setWithdrawalFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  withdrawalFilter === 'all'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                All ({withdrawals.length})
              </button>
              <button
                onClick={() => setWithdrawalFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  withdrawalFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
                }`}
              >
                <span>Pending</span>
                <span className="bg-amber-400/30 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                  {pendingCount}
                </span>
              </button>
              <button
                onClick={() => setWithdrawalFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  withdrawalFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setWithdrawalFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  withdrawalFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-500/30'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {displayedWithdrawals.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50 text-slate-400" />
                <p className="font-bold text-sm">No {withdrawalFilter !== 'all' ? withdrawalFilter : ''} withdrawal requests found</p>
                <p className="text-xs mt-1">
                  Requests created by users will automatically show up here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedWithdrawals.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-['Outfit'] font-black text-lg text-emerald-400">
                          ₹{item.amount}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'pending'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : item.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: #{item.id}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <strong className="text-white">{item.userName}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.userId, `withdrawal_uid_${item.id}`)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                            copiedItemKey === `withdrawal_uid_${item.id}`
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700 hover:border-slate-600'
                          } cursor-pointer active:scale-95`}
                          title="Click to copy User ID"
                        >
                          <span>User #{item.userId}</span>
                          {copiedItemKey === `withdrawal_uid_${item.id}` ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {item.method === 'upi' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs font-mono text-sky-300 bg-sky-950/40 border border-sky-800/40 px-3 py-1.5 rounded-xl inline-flex items-center gap-2">
                            <span>UPI ID: <strong className="text-white select-all">{item.upiId}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.upiId || '', `upi_${item.id}`)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              copiedItemKey === `upi_${item.id}`
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700 hover:border-sky-500/50'
                            } active:scale-95 cursor-pointer`}
                            title="Copy UPI ID"
                          >
                            {copiedItemKey === `upi_${item.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy UPI</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-xs font-mono text-sky-300 bg-sky-950/40 border border-sky-800/40 px-3 py-2 rounded-xl flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 flex-wrap">
                            <span>Bank: <strong className="text-white">{item.bankName || 'N/A'}</strong></span>
                            <span>A/C: <strong className="text-white select-all">{item.accountNumber}</strong></span>
                            <span>IFSC: <strong className="text-white select-all">{item.ifsc}</strong></span>
                            <span>Name: <strong className="text-white">{item.accountHolder}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyText(item.accountNumber || '', `acc_${item.id}`)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                copiedItemKey === `acc_${item.id}`
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
                              } active:scale-95 cursor-pointer`}
                              title="Copy Account Number"
                            >
                              {copiedItemKey === `acc_${item.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>A/C Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy A/C No</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyText(item.ifsc || '', `ifsc_${item.id}`)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                copiedItemKey === `ifsc_${item.id}`
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
                              } active:scale-95 cursor-pointer`}
                              title="Copy IFSC Code"
                            >
                              {copiedItemKey === `ifsc_${item.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
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
                                const details = `Bank: ${item.bankName || 'N/A'}\nA/C Number: ${item.accountNumber}\nIFSC: ${item.ifsc}\nA/C Holder: ${item.accountHolder}`;
                                handleCopyText(details, `bank_all_${item.id}`);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                copiedItemKey === `bank_all_${item.id}`
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700 hover:border-sky-500/50'
                              } active:scale-95 cursor-pointer`}
                              title="Copy All Bank Details"
                            >
                              {copiedItemKey === `bank_all_${item.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>All Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy All Details</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500">
                        Created: {new Date(item.createdAt).toLocaleString()}
                        {item.rejectReason && (
                          <span className="text-rose-400 ml-2 font-medium">
                            Reason: {item.rejectReason}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveWithdrawal(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all active:scale-95 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve &amp; Pay</span>
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(item.id)}
                            className="bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-rose-500/40 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteSingleWithdrawal(item.id)}
                        title="Permanently delete this record from Firebase database"
                        className="bg-slate-800/90 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-500 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 2: USERS & SPINS (10-at-a-time Batch Loading) ----------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-['Outfit'] font-black text-xl text-white">
                    Users Database &amp; Scratch Management
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ⚡ 10 Users / Batch Mode
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {Math.min(filteredUsers.length, visibleUserCount)} of {filteredUsers.length} users (10 at a time for zero website &amp; database lag)
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search user by name or ID..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-sm px-4 py-2 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {userActionToast && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold animate-fade-in">
                {userActionToast}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredUsers.slice(0, visibleUserCount).map((u) => {
                const isRefExpanded = expandedReferralUsers[u.id] ?? false;
                const last10Referrals = userReferralsMap[u.id] || getUserLastReferrals(u.id, 10);
                const isLoadingRefs = loadingReferralsUser[u.id] ?? false;

                return (
                  <div
                    key={u.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-white text-sm block leading-tight">{u.name}</strong>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(u.id, `portal_user_${u.id}`)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                                  copiedItemKey === `portal_user_${u.id}`
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                    : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700 hover:border-slate-600'
                                } cursor-pointer active:scale-95`}
                                title="Click to copy User ID"
                              >
                                <span>#{u.id}</span>
                                {copiedItemKey === `portal_user_${u.id}` ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                          ₹{u.balance.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-slate-800/60 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-semibold">Current Scratches</span>
                          <strong className="text-sm font-['Outfit'] font-black text-sky-300">{u.spins}</strong>
                        </div>
                        <div className="bg-slate-800/60 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-semibold">Friends Joined</span>
                          <strong className="text-sm font-['Outfit'] font-black text-emerald-300">{u.friendsJoined || 0}</strong>
                        </div>
                        <div className="bg-slate-800/60 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Scratches Earned</span>
                          <strong className="text-sm font-['Outfit'] font-black text-amber-300">{u.spinsEarned || 0}</strong>
                        </div>
                      </div>

                      {/* User's Last 10 Referrals Section (On-Demand Load) */}
                      <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleUserReferrals(u.id)}
                          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-extrabold text-slate-200">
                              Last 10 Referrals ({isRefExpanded ? last10Referrals.length : u.friendsJoined || last10Referrals.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-sky-400 font-bold">
                            <span>{isRefExpanded ? 'Hide' : 'Load Referrals'}</span>
                            {isRefExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {isRefExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-800/80">
                            {isLoadingRefs ? (
                              <div className="flex items-center justify-center gap-2 py-3 text-xs text-sky-400 font-bold">
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading last 10 referrals...</span>
                              </div>
                            ) : last10Referrals.length === 0 ? (
                              <p className="text-[11px] text-slate-500 py-2 text-center">
                                No referrals recorded for this user yet.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {last10Referrals.map((refItem, idx) => (
                                  <div
                                    key={refItem.id}
                                    className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-[11px]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <span className="text-slate-200 font-bold block truncate">
                                          {refItem.name}
                                          {refItem.joinerId ? ` (#${refItem.joinerId})` : ''}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                          {new Date(refItem.createdAt).toLocaleDateString()}{' '}
                                          {new Date(refItem.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                        refItem.rewardGiven
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      {refItem.rewardGiven ? '+1 Card' : 'Pending Scratch'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Adjuster for this user */}
                    <div className="border-t border-slate-800 pt-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="+/- Scratches (e.g. 5)"
                          value={selectedUser?.id === u.id ? spinsToAdd : ''}
                          onChange={(e) => {
                            setSelectedUser(u);
                            setSpinsToAdd(e.target.value);
                          }}
                          className="w-1/2 bg-slate-800 border border-slate-700 text-xs p-2 rounded-xl text-white placeholder-slate-500"
                        />
                        <input
                          type="number"
                          placeholder="+/- ₹ Cash (e.g. 50)"
                          value={selectedUser?.id === u.id ? balanceToAdd : ''}
                          onChange={(e) => {
                            setSelectedUser(u);
                            setBalanceToAdd(e.target.value);
                          }}
                          className="w-1/2 bg-slate-800 border border-slate-700 text-xs p-2 rounded-xl text-white placeholder-slate-500"
                        />
                        <button
                          onClick={() => handleApplyUserAdjustments(u)}
                          className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load Next 10 Users Gradually Button */}
            {(hasMoreRemoteUsers || filteredUsers.length > visibleUserCount) && (
              <div className="pt-2 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadNext10Users}
                  disabled={isLoadingMoreUsers}
                  className="bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-['Outfit'] font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-sky-600/25 flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                >
                  <RotateCw className={`w-4 h-4 ${isLoadingMoreUsers ? 'animate-spin' : ''}`} />
                  <span>
                    {isLoadingMoreUsers ? 'Loading Next 10 Users...' : 'Load Next 10 Users (+10) 👇'}
                  </span>
                </button>
                <span className="text-[11px] text-slate-500 font-medium">
                  Currently displaying {Math.min(filteredUsers.length, visibleUserCount)} users • Loads 10 users per click to keep database fast
                </span>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 3: PASSWORD & SECURITY (ROHIT'S REQUEST) ----------------- */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div>
              <h2 className="font-['Outfit'] font-black text-xl text-white">
                Admin Security &amp; Password Management
              </h2>
              <p className="text-xs text-slate-400">
                Change your admin password and credentials. Saved directly into secure database.
              </p>
            </div>

            {securityToast && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
                  securityToast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {securityToast.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{securityToast.message}</span>
              </div>
            )}

            {/* Change Password Card */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-['Outfit'] font-bold text-sm text-white">
                  Change Admin Password
                </h3>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-['Outfit'] font-black text-sm py-3.5 rounded-xl shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
                >
                  Update Admin Password 🔒
                </button>
              </form>
            </div>

            {/* Change Admin Email Card */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Mail className="w-5 h-5 text-sky-400" />
                <h3 className="font-['Outfit'] font-bold text-sm text-white">
                  Admin Email / Gmail
                </h3>
              </div>

              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Registered Admin Gmail
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="Enter new admin email"
                    className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 rounded-xl transition-colors border border-slate-700"
                >
                  Save Admin Gmail
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: APP & BOT SETTINGS ----------------- */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div>
              <h2 className="font-['Outfit'] font-black text-xl text-white">
                Bot &amp; App Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Manage bot links, channel URL, win amounts, and limits
              </p>
            </div>

            {settingsSavedToast && (
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Settings saved and broadcasted to all active clients!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telegram Bot Username (without @)
                </label>
                <input
                  type="text"
                  required
                  value={botUsername}
                  onChange={(e) => setBotUsername(e.target.value)}
                  placeholder="RohitGiveawayBot"
                  className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Official Telegram Channel (Link or @username)
                  </label>
                  {channelLink && (
                    <a
                      href={channelLink.startsWith('http') ? channelLink : `https://t.me/${channelLink.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1"
                    >
                      Test Link ↗
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={channelLink}
                  onChange={(e) => setChannelLink(e.target.value)}
                  placeholder="https://t.me/yourchannel or @yourchannel"
                  className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports public channels (e.g. <code>https://t.me/RohitGiveaway</code> or <code>@RohitGiveaway</code>) and private links (e.g. <code>https://t.me/+AbCdEfGh</code>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Application Title
                </label>
                <input
                  type="text"
                  required
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder="Scratch The Win"
                  className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Scratch Win Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={spinWinAmount}
                    onChange={(e) => setSpinWinAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Min Withdrawal Limit (₹)
                    </label>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                      Current: ₹{minWithdrawal}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={minWithdrawal}
                        onChange={(e) => {
                          setMinWithdrawal(e.target.value);
                          setIsMinWithdrawalDirty(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickUpdateMinWithdrawal();
                          }
                        }}
                        placeholder="e.g. 20, 50, 100"
                        className="w-full bg-slate-800 border border-slate-700 pl-8 pr-3 py-2.5 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isUpdatingLimit}
                      onClick={() => handleQuickUpdateMinWithdrawal()}
                      className={`font-['Outfit'] font-black text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        limitUpdateSuccess
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/30'
                      }`}
                      title="Update Withdrawal Limit Instantly"
                    >
                      {isUpdatingLimit ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : limitUpdateSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Saved! ✅</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Set Limit</span>
                        </>
                      )}
                    </button>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                    {[5, 10, 20, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={isUpdatingLimit}
                        onClick={() => handleQuickUpdateMinWithdrawal(amt)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                          String(minWithdrawal) === String(amt)
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {limitSavedNotice && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{limitSavedNotice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-xl shadow-lg shadow-sky-600/30 active:scale-95 transition-all mt-3 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSavingSettings ? (
                  <span>Saving Settings to Database... ⏳</span>
                ) : (
                  <span>Save All App Settings 💾</span>
                )}
              </button>
            </form>

            {/* Connected Firebase Realtime Database Status Card */}
            <div className="p-5 bg-slate-900/90 border border-emerald-500/30 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h3 className="font-['Outfit'] font-black text-xs text-white uppercase tracking-wider">
                    Connected Database (Isolated RTDB)
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Active &amp; Live
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 font-sans">Firebase Project:</span>
                  <span className="text-emerald-300 font-bold">scratch-7d728</span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 font-sans">Database URL:</span>
                  <span className="text-sky-300 text-[11px] break-all select-all">https://scratch-7d728-default-rtdb.firebaseio.com</span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 font-sans">Status:</span>
                  <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                    ✓ 100% Isolated from old database
                  </span>
                </div>
              </div>
            </div>

            {/* Telegram Bot Script (bot.py) Download Card */}
            <div className="p-5 bg-slate-900/90 border border-sky-500/30 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">🐍</span>
                  <h3 className="font-['Outfit'] font-black text-xs text-white uppercase tracking-wider">
                    Scratch The Win Bot Script (bot.py)
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Zero Glitch Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Production-ready Python Telegram bot with anti-fraud referrals, channel verification gatekeeper, and 24/7 Render HTTP server.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="/bot.py"
                  download="bot.py"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-['Outfit'] font-bold text-xs py-2.5 rounded-xl text-center shadow-md shadow-sky-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Download bot.py</span>
                  <span>📥</span>
                </a>
                <a
                  href="/requirements.txt"
                  download="requirements.txt"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl text-center transition-colors cursor-pointer"
                  title="Download requirements.txt"
                >
                  requirements.txt 📦
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: TELEGRAM BROADCAST ----------------- */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950/70 to-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <Radio className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <h2 className="font-['Outfit'] font-black text-xl text-white">
                      Telegram Broadcast & Announcement Hub
                    </h2>
                  </div>
                  <p className="text-xs text-sky-200">
                    Send global announcements directly to all registered bot users with full Telegram Premium emoji support.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/80 border border-sky-500/30 px-3.5 py-2 rounded-2xl shrink-0">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-slate-300">Total Users:</span>
                  <span className="text-sm font-black text-white font-mono">{users.length}</span>
                </div>
              </div>
            </div>

            {/* CRITICAL: Telegram Premium Emojis Explanation & Guide Card */}
            <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-sky-950/80 border-2 border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-['Outfit'] font-black text-base text-white">
                      👑 Telegram Premium Custom Emojis Guide (100% Sabko Dikhega)
                    </h3>
                    <span className="bg-gradient-to-r from-amber-500 to-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Zero Glitch Guarantee
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                    Aapke paas Telegram Premium hai aur aap chahte hain ki broadcast me aapke custom animated emojis sabhi users (chahe unke paas Free Telegram ho ya Premium) ko bina kisi bug ke bilkul saaf dikhein:
                  </p>
                </div>
              </div>

              {/* 2 Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Method 1: The Golden Standard */}
                <div className="bg-slate-950/70 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Method 1: Reply Method (Recommended)
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      100% Guaranteed
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    1. Telegram me apne bot <span className="text-sky-300 font-bold">@{settings.botUsername || 'scratch_the_win_bot'}</span> me apna announcement message bhejein (apne Premium animated emojis, photos, stickers ke sath).<br />
                    2. Us message ko <span className="text-amber-300 font-bold">Reply</span> karein aur type karein: <code className="bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded font-mono">/broadcast</code>
                  </p>
                  <p className="text-[11px] text-emerald-300/90 italic pt-1">
                    👉 Bot Telegram ke official <b>copyMessage</b> engine se broadcast karta hai — jisse free users ko bhi aapke Telegram Premium ke sabhi animated emojis 100% high-quality me dikhte hain!
                  </p>
                </div>

                {/* Method 2: Direct Command */}
                <div className="bg-slate-950/70 border border-sky-500/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-sky-400" />
                      Method 2: Direct Command
                    </span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30">
                      Fast Text
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Direct bot me likhein:<br />
                    <code className="bg-slate-800 text-amber-300 px-2 py-1 rounded block mt-1 font-mono text-[11px]">
                      /broadcast 🔥 Naya Dhamaka 💎 Sabhi scratch karein!
                    </code>
                    Bot aapke text ke custom emoji entities ko retain karke sabhi users ko deliver kar dega.
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] text-sky-300 font-medium">
                      🧪 Test Preview: Message ko reply karke <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">/emojitest</code> likhein to live preview dikh jayega!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Web Broadcast Composer Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-sky-400" />
                  <h3 className="font-['Outfit'] font-black text-base text-white">
                    Send Broadcast from Admin Web Panel
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Target: <span className="text-emerald-400 font-mono font-bold">{users.length} Users</span>
                </span>
              </div>

              {broadcastToast && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                    broadcastToast.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {broadcastToast.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{broadcastToast.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Broadcast Message (HTML Supported)
                </label>
                <textarea
                  rows={5}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder={`📢 OFFICIAL ANNOUNCEMENT:\n\n🔥 Naya Scratch Card Bonus Live ho gaya hai!\n🎁 Abhi open karein aur cash jeetein!\n\nLink: https://t.me/${settings.botUsername || 'scratch_the_win_bot'}`}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Standard HTML tags jaise <code>&lt;b&gt;bold&lt;/b&gt;</code>, <code>&lt;i&gt;italic&lt;/i&gt;</code>, aur links supported hain.
                </p>
              </div>

              {/* Progress Indicator */}
              {isBroadcasting && broadcastProgress && (
                <div className="p-4 bg-slate-950 border border-sky-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-sky-300 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Broadcasting to users...
                    </span>
                    <span className="text-white font-mono">
                      {broadcastProgress.sent + broadcastProgress.failed} / {broadcastProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full transition-all duration-150"
                      style={{
                        width: `${Math.round(((broadcastProgress.sent + broadcastProgress.failed) / (broadcastProgress.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-medium">Delivered: {broadcastProgress.sent}</span>
                    <span className="text-rose-400 font-medium">Failed/Blocked: {broadcastProgress.failed}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBroadcasting || !broadcastMessage.trim()}
                  onClick={handleSendWebBroadcast}
                  className="w-full sm:flex-1 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 disabled:opacity-50 text-white font-['Outfit'] font-black text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-sky-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isBroadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Broadcast to All Users 🚀</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBroadcastMessage(
                      `📢 <b>SCRATCH THE WIN - MEGA DHAMAKA!</b> 🎁\n\n` +
                      `🔥 Sabhi users ke liye naye scratch cards add kar diye gaye hain!\n` +
                      `💸 Turant app open karein aur withdraw lagayein!\n\n` +
                      `👉 Minimum Payout: <b>₹${settings.minWithdrawalLimit}</b>\n` +
                      `🚀 Play Now: @${settings.botUsername || 'scratch_the_win_bot'}`
                    );
                    triggerHaptic('light');
                  }}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 px-4 rounded-2xl border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Load Template 📋
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Confirmation & Rejection Modal Dialog (Iframe & WebApp safe) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
            <h3 className="font-['Outfit'] font-black text-lg text-white mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-4">
              {confirmDialog.message}
            </p>

            {confirmDialog.showInput && (
              <div className="mb-4">
                {confirmDialog.inputLabel && (
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    {confirmDialog.inputLabel}
                  </label>
                )}
                <input
                  type="text"
                  value={dialogInputValue}
                  onChange={(e) => setDialogInputValue(e.target.value)}
                  placeholder={confirmDialog.inputPlaceholder}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm(dialogInputValue)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer shadow-lg active:scale-95 ${
                  confirmDialog.confirmColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/30'
                    : confirmDialog.confirmColor === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-700/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-700/30'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
