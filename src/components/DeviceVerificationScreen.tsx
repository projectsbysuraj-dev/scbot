import React, { useState, useEffect } from 'react';
import { UserProfile, AppSettings } from '../types';
import {
  ShieldCheck,
  Smartphone,
  CheckCircle,
  XCircle,
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
      ? `${MINI_APP_URL}?uid=${rawUserCleanId}&start=ref_${referrerId.replace('ref_', '')}`
      : `${MINI_APP_URL}?uid=${rawUserCleanId}`;

    // 1. Mark verified in Local Storage and Firebase RTDB without overwriting live spins or balance
    let liveUserFromDb: any = null;
    if (rawUserCleanId) {
      try {
        const uResp = await fetch(`${RTDB_BASE_URL}/users/${rawUserCleanId}.json`, { cache: 'no-store' });
        if (uResp.ok) {
          liveUserFromDb = await uResp.json();
        }
      } catch {
        // Fallback to local state
      }
    }

    const baseUser = liveUserFromDb && typeof liveUserFromDb === 'object' ? { ...user, ...liveUserFromDb } : user;
    const alreadyPlayed =
      baseUser.claimedWelcomeSpin === true ||
      baseUser.hasScratchedFirstCard === true ||
      baseUser.referralRewardGiven === true ||
      Number(baseUser.balance || 0) > 0;

    const verifiedPatch: Record<string, any> = {
      isVerified: true,
      deviceVerified: true,
      deviceBlocked: false,
      deviceVerifiedAt: Date.now(),
    };

    if (!alreadyPlayed && (typeof baseUser.spins !== 'number' || baseUser.spins < 1)) {
      verifiedPatch.spins = 1;
      verifiedPatch.spinsEarned = Math.max(Number(baseUser.spinsEarned) || 0, 1);
      verifiedPatch.claimedWelcomeSpin = true;
    }

    saveSingleUser({
      ...baseUser,
      ...verifiedPatch,
    });

    if (rawUserCleanId) {
      fetch(`${RTDB_BASE_URL}/users/${rawUserCleanId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifiedPatch),
      }).catch(() => {});
    }

    if (rtdb && rawUserCleanId) {
      try {
        await update(ref(rtdb, `users/${rawUserCleanId}`), verifiedPatch);
      } catch (e) {
        console.warn('Error updating verified status in RTDB:', e);
      }
    }

    // 2. Send Congratulations message via Telegram Bot API
    if (rawUserCleanId && rawUserCleanId.match(/^\d+$/)) {
      try {
        let emojiMap: Record<string, string> = {
          '🔥': '5312241539987020022',
          '✅': '5206607081334906820',
          '🎁': '5312315739842026355',
          '🎉': '5312486361243062266',
          '😍': '5312513303690351633',
          '👥': '5312424912994963580',
        };
        try {
          const emResp = await fetch('https://scratch-7d728-default-rtdb.firebaseio.com/bot_config/premium_emojis.json');
          if (emResp.ok) {
            const savedEm = await emResp.json();
            if (savedEm && typeof savedEm === 'object') {
              emojiMap = { ...emojiMap, ...savedEm };
            }
          }
        } catch {
          // Use default verified custom_emoji_ids
        }

        const pe = (ch: string) =>
          emojiMap[ch] ? `<tg-emoji emoji-id="${emojiMap[ch]}">${ch}</tg-emoji>` : ch;

        const premiumText = `${pe('🔥')}<b>Congratulations Sussefuly Verfied ${pe('✅')}</b>\n\n${pe('🎉')} <b>Click To Home And Refer And Earn ${pe('🎉')}</b>\n\n${pe('😍')}${pe('😍')}<b>Now All Payment Instant ${pe('😍')}${pe('😍')}</b>`;

        const premiumMarkup = {
          inline_keyboard: [
            [
              {
                text: '🎉 Click To Home',
                icon_custom_emoji_id: emojiMap['🎉'],
                web_app: { url: appUrl },
              },
            ],
            [
              {
                text: '👥 Refer And Earn',
                icon_custom_emoji_id: emojiMap['👥'],
                callback_data: 'my_invite',
              },
            ],
          ],
        };

        const res1 = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: Number(rawUserCleanId),
            text: premiumText,
            parse_mode: 'HTML',
            reply_markup: premiumMarkup,
          }),
        });
        const data1 = await res1.json().catch(() => ({ ok: false }));
        if (!data1?.ok) {
          const fallbackMarkup = {
            inline_keyboard: [
              [{ text: '🎉 Click To Home', web_app: { url: appUrl } }],
              [{ text: '👥 Refer And Earn', callback_data: 'my_invite' }],
            ],
          };
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: Number(rawUserCleanId),
              text: premiumText,
              parse_mode: 'HTML',
              reply_markup: fallbackMarkup,
            }),
          });
        }
      } catch (err) {
        console.warn('Could not send telegram message:', err);
      }
    }

    onContinue();
  };

  // Block account ONLY when multiple accounts are detected in the same Telegram app instance
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
            conflictWith: conflictOwnerId || 'same_app_multi_account',
            blockedAt: Date.now(),
          }),
        }),
      ]);
    } catch {
      // Ignore
    }

    if (rtdb) {
      try {
        await Promise.all([
          update(ref(rtdb, `users/${cleanId}`), blockedPayload),
          set(ref(rtdb, `blocked_accounts/${cleanId}`), {
            blocked: true,
            userId: cleanId,
            conflictWith: conflictOwnerId || 'same_app_multi_account',
            blockedAt: Date.now(),
          }),
        ]);
      } catch (e) {
        console.warn('Error recording blocked device status:', e);
      }
    }
  };

  // Function to unblock innocent users who were blocked due to hardware collision
  const unblockInnocentUser = async (cleanId: string) => {
    if (!cleanId) return;
    try {
      localStorage.removeItem(`rg_blocked_uid_${cleanId}`);
      await Promise.all([
        fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceBlocked: false }),
        }),
        fetch(`${RTDB_BASE_URL}/blocked_accounts/${cleanId}.json`, {
          method: 'DELETE',
        }),
      ]);
      if (rtdb) {
        await Promise.all([
          update(ref(rtdb, `users/${cleanId}`), { deviceBlocked: false }),
          set(ref(rtdb, `blocked_accounts/${cleanId}`), null),
        ]);
      }
    } catch (e) {
      console.warn('Unblock error:', e);
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

    let localDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!localDeviceId) {
      localDeviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(DEVICE_STORAGE_KEY, localDeviceId);
    }

    const boundLocalTelegramId = localStorage.getItem(BOUND_TELEGRAM_ID_KEY);

    // Smooth animation steps
    setSlideProgress(30);
    setCurrentStepText('Scanning device...');

    const t1 = setTimeout(() => {
      triggerHaptic('light');
      setSlideProgress(65);
      setCurrentStepText('Checking accounts...');
    }, 700);

    const t2 = setTimeout(() => {
      triggerHaptic('light');
      setSlideProgress(88);
      setCurrentStepText('Verifying account status...');
    }, 1400);

    const t3 = setTimeout(async () => {
      setSlideProgress(100);
      setCurrentStepText('Finalizing verification...');

      // RULE 1: Block ONLY if a user switches multiple Telegram IDs in the EXACT SAME app instance
      if (boundLocalTelegramId && currentTelegramId && boundLocalTelegramId !== currentTelegramId) {
        triggerHaptic('error');
        permanentlyLockFailedAccount(currentTelegramId, boundLocalTelegramId);
        setStatus('blocked');
        return;
      }

      // Check if user was previously blocked
      let isBlockedInDb = false;
      let blockedReason = '';

      if (rtdb && currentTelegramId) {
        try {
          const [userSnap, blockedSnap] = await Promise.all([
            get(ref(rtdb, `users/${currentTelegramId}`)),
            get(ref(rtdb, `blocked_accounts/${currentTelegramId}`)),
          ]);

          if (userSnap.exists() && userSnap.val()?.deviceBlocked === true) {
            isBlockedInDb = true;
          }
          if (blockedSnap.exists()) {
            const bVal = blockedSnap.val();
            if (bVal === true || bVal?.blocked === true) {
              isBlockedInDb = true;
              blockedReason = bVal?.conflictWith || '';
            }
          }
        } catch {
          // Ignore
        }
      }

      // RULE 2: AUTO-UNBLOCK INNOCENT USERS
      // Agar user pehle hardware collision ki wajah se block hua tha aur uske paas koi local account conflict nahi hai,
      // to use automatically unblock karke welcome karein!
      if (isBlockedInDb) {
        const isHardwareCollision =
          blockedReason.startsWith('hw_') ||
          blockedReason === 'bound_device' ||
          blockedReason === 'previously_blocked' ||
          !boundLocalTelegramId ||
          boundLocalTelegramId === currentTelegramId;

        if (isHardwareCollision) {
          // Auto unblock this innocent user!
          await unblockInnocentUser(currentTelegramId);
          localStorage.setItem(BOUND_TELEGRAM_ID_KEY, currentTelegramId);
          triggerHaptic('success');
          setStatus('success');
          return;
        } else {
          // Genuine multi-account offender
          triggerHaptic('error');
          setStatus('blocked');
          return;
        }
      }

      // Clean Verification (New User or Clone App User)
      localStorage.setItem(BOUND_TELEGRAM_ID_KEY, currentTelegramId);
      triggerHaptic('success');
      setStatus('success');
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] flex flex-col justify-between p-5 overflow-y-auto text-white select-none">
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
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/80 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/60">
              <CheckCircle className="w-9 h-9" />
            </div>

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
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/80 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
              <XCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="font-['Outfit'] font-black text-xl text-rose-400">
                🚫 Device Blocked!
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Ek phone me sirf 1 account allow hai.
              </p>
            </div>

            <button
              onClick={handleDoneBlocked}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-['Outfit'] font-black text-sm transition-all shadow-lg shadow-rose-950 cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div className="w-24 h-1 bg-white/20 rounded-full mx-auto" />
    </div>
  );
}
