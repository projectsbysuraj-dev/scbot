import React, { useState, useEffect } from 'react';
import { UserProfile, AppSettings } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { rtdb, ref, get, set, update } from '../services/firebase';
import { triggerHaptic } from '../services/telegram';
import {
  saveSingleUser,
  RTDB_BASE_URL,
  isUserIdBlockedLocally,
  markUserIdBlockedLocally,
} from '../services/store';

interface DeviceVerificationScreenProps {
  user: UserProfile;
  settings: AppSettings;
  referrerId?: string | null;
  onContinue: () => void;
}

const DEVICE_STORAGE_KEY = 'rg_phone_registered_device_v1';
const BOUND_TELEGRAM_ID_KEY = 'rg_bound_telegram_id_v1';
const BOT_TOKEN = '8956392892:AAHHL_KxabHRt5_v3JYQGInzJhqNxDEUr5g';
const MINI_APP_URL = 'https://scbot-ochre.vercel.app/';

function getHardwareFingerprint(): string {
  try {
    const parts = [
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '',
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : '',
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '',
      typeof navigator !== 'undefined' ? navigator.language || '' : '',
      typeof navigator !== 'undefined' ? navigator.platform || '' : '',
    ];

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(10, 5, 60, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('telebot_strict_v2', 12, 10);
        parts.push(canvas.toDataURL().slice(-40));
      }
    }

    const str = parts.join('###');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return 'hw_' + Math.abs(hash).toString(36);
  } catch {
    return 'hw_fallback';
  }
}

export function DeviceVerificationScreen({
  user,
  settings,
  referrerId,
  onContinue,
}: DeviceVerificationScreenProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'blocked'>('verifying');
  const [slideProgress, setSlideProgress] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('Scanning device...');

  const handleDoneSuccess = async () => {
    triggerHaptic('success');
    const rawUserCleanId = String(user.telegramId || user.id || '').trim();
    const appUrl = referrerId
      ? `${MINI_APP_URL}?start=ref_${referrerId.replace('ref_', '')}`
      : MINI_APP_URL;

    // 1. Mark verified in Local Storage and Firebase RTDB while ensuring 1 Sign Up Scratch Card is intact
    const initialSpins =
      typeof user.spins === 'number' && user.spins > 0
        ? user.spins
        : (user.balance || 0) === 0
        ? 1
        : 0;
    const initialSpinsEarned = Math.max(user.spinsEarned || 0, 1);

    saveSingleUser({
      ...user,
      spins: initialSpins,
      spinsEarned: initialSpinsEarned,
      claimedWelcomeSpin: true,
      isVerified: true,
      deviceVerified: true,
      deviceVerifiedAt: Date.now(),
    });

    if (rtdb && rawUserCleanId) {
      try {
        await update(ref(rtdb, `users/${rawUserCleanId}`), {
          spins: initialSpins,
          spinsEarned: initialSpinsEarned,
          claimedWelcomeSpin: true,
          isVerified: true,
          deviceVerified: true,
          deviceVerifiedAt: Date.now(),
        });
      } catch (e) {
        console.warn('Error updating verified status in RTDB:', e);
      }
    }

    // 2. Send Congratulations message directly via Telegram Bot API with Mini App Link
    if (rawUserCleanId && rawUserCleanId.match(/^\d+$/)) {
      try {
        const text = `🔥<b>Congratulations Sussefuly Verfied</b> ✅\n🎉 <b>Click To Home And Refer And Earn</b> 🎉\n✅✅<b>Now All Payment Instant</b> ✅✅`;
        const payload = {
          chat_id: Number(rawUserCleanId),
          text: text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎉 Click To Home',
                  web_app: { url: appUrl },
                },
              ],
              [
                {
                  text: '👥 Refer And Earn',
                  callback_data: 'my_invite',
                },
              ],
            ],
          },
        };

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Could not send telegram message:', err);
      }
    }

    onContinue();
  };

  const permanentlyLockFailedAccount = async (targetUserId: string, conflictOwnerId?: string | null) => {
    const cleanId = String(targetUserId || '').trim();
    if (!cleanId) return;

    markUserIdBlockedLocally(cleanId);

    const blockedPayload = {
      deviceBlocked: true,
      deviceBlockedAt: Date.now(),
      isVerified: false,
      deviceVerified: false,
    };

    saveSingleUser({
      ...user,
      id: cleanId,
      telegramId: cleanId,
      deviceBlocked: true,
      isVerified: false,
      deviceVerified: false,
    });

    try {
      await Promise.all([
        fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blockedPayload),
        }),
        fetch(`${RTDB_BASE_URL}/blocked_accounts/${cleanId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocked: true,
            userId: cleanId,
            conflictWith: conflictOwnerId || 'bound_device',
            blockedAt: Date.now(),
          }),
        }),
      ]);
    } catch {
      // Ignore network error
    }

    if (rtdb) {
      try {
        await Promise.all([
          update(ref(rtdb, `users/${cleanId}`), blockedPayload),
          set(ref(rtdb, `blocked_accounts/${cleanId}`), {
            blocked: true,
            userId: cleanId,
            conflictWith: conflictOwnerId || 'bound_device',
            blockedAt: Date.now(),
          }),
        ]);
      } catch (e) {
        console.warn('Error recording blocked device status:', e);
      }
    }
  };

  const handleDoneBlocked = async () => {
    triggerHaptic('error');
    const tgUid =
      (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('uid')) ||
      user.telegramId ||
      user.id;
    const rawUserCleanId = String(tgUid || '').trim();

    await permanentlyLockFailedAccount(rawUserCleanId);

    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.close) {
      (window as any).Telegram.WebApp.close();
    }
  };

  useEffect(() => {
    const tgUid =
      (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('uid')) ||
      user.telegramId ||
      user.id;
    const currentTelegramId = String(tgUid || '').trim();

    // Immediate check: if this ID is already marked blocked locally or in user profile, block immediately!
    if (user.deviceBlocked || isUserIdBlockedLocally(currentTelegramId)) {
      setSlideProgress(100);
      setStatus('blocked');
      permanentlyLockFailedAccount(currentTelegramId);
      return;
    }

    let localDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!localDeviceId) {
      localDeviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(DEVICE_STORAGE_KEY, localDeviceId);
    }

    const boundLocalTelegramId = localStorage.getItem(BOUND_TELEGRAM_ID_KEY);
    const hwFingerprint = getHardwareFingerprint();

    // Smooth sliding animation steps:
    // Step 1: 0ms -> 30%
    setSlideProgress(30);
    setCurrentStepText('Scanning hardware...');

    // Step 2: 700ms -> 60%
    const t1 = setTimeout(() => {
      triggerHaptic('light');
      setSlideProgress(65);
      setCurrentStepText('Checking accounts...');
    }, 700);

    // Step 3: 1400ms -> 85%
    const t2 = setTimeout(() => {
      triggerHaptic('light');
      setSlideProgress(88);
      setCurrentStepText('Verifying single phone binding...');
    }, 1400);

    // Step 4: 2200ms -> 100% and complete
    const t3 = setTimeout(() => {
      setSlideProgress(100);
      setCurrentStepText('Finalizing verification...');

      // CHECK A: Is this phone's localStorage already bound to a DIFFERENT Telegram ID?
      if (boundLocalTelegramId && boundLocalTelegramId !== currentTelegramId) {
        triggerHaptic('error');
        permanentlyLockFailedAccount(currentTelegramId, boundLocalTelegramId);
        setStatus('blocked');
        return;
      }

      // CHECK B: Double-check with Firebase RTDB user block status, device & hardware bindings
      if (rtdb) {
        Promise.all([
          currentTelegramId ? get(ref(rtdb, `users/${currentTelegramId}`)) : Promise.resolve(null),
          currentTelegramId ? get(ref(rtdb, `blocked_accounts/${currentTelegramId}`)) : Promise.resolve(null),
          localDeviceId ? get(ref(rtdb, `devices/${localDeviceId}`)) : Promise.resolve(null),
          hwFingerprint ? get(ref(rtdb, `hardware_fingerprints/${hwFingerprint}`)) : Promise.resolve(null),
        ])
          .then(([userSnap, blockedSnap, deviceSnap, hwSnap]) => {
            // 1. Check if this account was EVER blocked before
            if (
              (userSnap && userSnap.exists() && userSnap.val()?.deviceBlocked === true) ||
              (blockedSnap && blockedSnap.exists() && (blockedSnap.val() === true || blockedSnap.val()?.blocked === true))
            ) {
              triggerHaptic('error');
              permanentlyLockFailedAccount(currentTelegramId, 'previously_blocked');
              setStatus('blocked');
              return;
            }

            let conflictId: string | null = null;

            if (deviceSnap && deviceSnap.exists()) {
              const data = deviceSnap.val();
              const boundId = String(data.boundTelegramId || '').trim();
              if (boundId && boundId !== currentTelegramId) {
                conflictId = boundId;
              }
            }

            if (!conflictId && hwSnap && hwSnap.exists()) {
              const data = hwSnap.val();
              const boundId = String(data.boundTelegramId || '').trim();
              if (boundId && boundId !== currentTelegramId) {
                conflictId = boundId;
              }
            }

            if (conflictId) {
              triggerHaptic('error');
              localStorage.setItem(BOUND_TELEGRAM_ID_KEY, conflictId);
              permanentlyLockFailedAccount(currentTelegramId, conflictId);
              setStatus('blocked');
              return;
            }

            // CLEAN DEVICE: Bind this phone and hardware permanently
            localStorage.setItem(BOUND_TELEGRAM_ID_KEY, currentTelegramId);

            if (rtdb && localDeviceId) {
              set(ref(rtdb, `devices/${localDeviceId}`), {
                boundTelegramId: currentTelegramId,
                boundName: user.name || 'User',
                firstVerifiedAt: Date.now(),
                hwFingerprint,
              }).catch(() => {});
            }

            if (rtdb && hwFingerprint) {
              set(ref(rtdb, `hardware_fingerprints/${hwFingerprint}`), {
                boundTelegramId: currentTelegramId,
                boundName: user.name || 'User',
                firstVerifiedAt: Date.now(),
              }).catch(() => {});
            }

            triggerHaptic('success');
            setStatus('success');
          })
          .catch(() => {
            if (isUserIdBlockedLocally(currentTelegramId) || user.deviceBlocked) {
              triggerHaptic('error');
              setStatus('blocked');
              return;
            }
            localStorage.setItem(BOUND_TELEGRAM_ID_KEY, currentTelegramId);
            triggerHaptic('success');
            setStatus('success');
          });
      } else {
        localStorage.setItem(BOUND_TELEGRAM_ID_KEY, currentTelegramId);
        triggerHaptic('success');
        setStatus('success');
      }
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] flex flex-col justify-between p-5 overflow-y-auto text-white select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-md">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Outfit'] font-black text-sm tracking-wide text-white">
            {settings.appTitle || 'Scratch The Win'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-sky-400 bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 rounded-full">
          Device Verification
        </span>
      </div>

      {/* Center Dynamic Content */}
      <div className="w-full max-w-sm mx-auto my-auto py-6">
        {status === 'verifying' && (
          <div className="bg-[#0f172a] rounded-3xl p-6 border border-slate-800 text-center space-y-6 shadow-2xl">
            {/* Animated Scanning Icon */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Verifying Device
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {currentStepText}
              </p>
            </div>

            {/* Smooth Slide Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${slideProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1 font-bold">
                <span>PROGRESS</span>
                <span className="text-emerald-400">{slideProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-[#0f172a] rounded-3xl p-6 border border-emerald-500/40 text-center space-y-5 shadow-2xl shadow-emerald-950/60">
            {/* Success Check Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/80 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/60">
              <CheckCircle className="w-9 h-9" />
            </div>

            {/* Exact Text Match */}
            <div className="space-y-2">
              <p className="font-['Outfit'] font-black text-base text-emerald-300">
                🔥 Congratulations Sussefuly Verfied ✅
              </p>
              <p className="font-['Outfit'] font-black text-sm text-amber-300">
                🎉 Click To Home And Refer And Earn 🎉
              </p>
              <p className="text-xs font-black text-white">
                ✅✅ Now All Payment Instant ✅✅
              </p>
            </div>

            {/* Open App Button */}
            <button
              onClick={handleDoneSuccess}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-white font-['Outfit'] font-black text-base shadow-xl shadow-emerald-700/40 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-400/40"
            >
              <span>🎉 Open App</span>
            </button>
          </div>
        )}

        {status === 'blocked' && (
          <div className="bg-[#0f172a] rounded-3xl p-6 border border-rose-500/50 text-center space-y-5 shadow-2xl shadow-rose-950/60">
            {/* Blocked Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/80 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
              <XCircle className="w-9 h-9" />
            </div>

            {/* Blocked Message */}
            <div className="space-y-1">
              <h3 className="font-['Outfit'] font-black text-xl text-rose-400">
                🚫 Device Blocked!
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Ek phone me sirf 1 account allow hai.
              </p>
            </div>

            {/* Only Done Button */}
            <button
              onClick={handleDoneBlocked}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-['Outfit'] font-black text-sm transition-all shadow-lg shadow-rose-950 cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Bottom Phone Indicator */}
      <div className="w-24 h-1 bg-white/20 rounded-full mx-auto" />
    </div>
  );
}
