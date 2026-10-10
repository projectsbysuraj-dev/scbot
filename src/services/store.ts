import {
  AppSettings,
  ThemeSettings,
  UserProfile,
  WithdrawalRequest,
  Transaction,
  ThemePreset,
  AdminCredentials,
} from '../types';
import { getTelegramUser } from './telegram';
import {
  rtdb,
  ref,
  set,
  get,
  update,
  onValue,
  initFirebaseAuth,
  firebaseConfig,
} from './firebase';

export const RTDB_BASE_URL = (firebaseConfig.databaseURL || 'https://scratch-7d728-default-rtdb.firebaseio.com').replace(/\/+$/, '');

const STORAGE_KEYS = {
  SETTINGS: 'scratch_app_settings_v1',
  THEME: 'scratch_theme_settings_v1',
  CURRENT_USER_ID: 'scratch_current_user_id_v1',
  USERS: 'scratch_users_database_v1',
  WITHDRAWALS: 'scratch_withdrawals_database_v1',
  TRANSACTIONS: 'scratch_transactions_database_v1',
  ADMIN_AUTH: 'scratch_admin_credentials_v1',
  ADMIN_SESSION: 'scratch_admin_session_v1',
  DELETED_WITHDRAWALS: 'scratch_deleted_withdrawals_tombstone_v1',
};

/**
 * Strips all undefined fields recursively so Firebase RTDB SDK never throws
 * "set failed: value argument contains undefined in property ..."
 */
export function sanitizeForFirebase<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? sanitizeForFirebase(item) : item)) as any;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object') {
        clean[key] = sanitizeForFirebase(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  email: 'adminrohit@gmail.com',
  password: 'adminrohit10',
  updatedAt: Date.now(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  botUsername: 'scratch_the_win_bot',
  telegramChannelUrl: 'https://t.me/+7clQNCkYuAAxYWQ1',
  appTitle: 'Scratch The Win',
  spinWinAmount: 5,
  minWithdrawalLimit: 20,
  adminPin: '7777',
  adminEmail: 'adminrohit@gmail.com',
  adminPassword: 'adminrohit10',
  firebaseConfig: {
    apiKey: firebaseConfig.apiKey,
    databaseURL: firebaseConfig.databaseURL,
    projectId: firebaseConfig.projectId,
  },
};

export const THEME_PRESETS: Record<ThemePreset, { primary: string; glow: string; bgStart: string; bgEnd: string; name: string }> = {
  'sky-blue': {
    name: 'Sky Blue',
    primary: '#0284c7',
    glow: '#38bdf8',
    bgStart: '#0284c7',
    bgEnd: '#38bdf8',
  },
  sapphire: {
    name: 'Sapphire',
    primary: '#1d4ed8',
    glow: '#60a5fa',
    bgStart: '#1d4ed8',
    bgEnd: '#60a5fa',
  },
  purple: {
    name: 'Purple',
    primary: '#7c3aed',
    glow: '#c084fc',
    bgStart: '#7c3aed',
    bgEnd: '#c084fc',
  },
  emerald: {
    name: 'Emerald',
    primary: '#059669',
    glow: '#34d399',
    bgStart: '#059669',
    bgEnd: '#34d399',
  },
  'gold-sunset': {
    name: 'Gold Sunset',
    primary: '#ea580c',
    glow: '#fbbf24',
    bgStart: '#ea580c',
    bgEnd: '#fbbf24',
  },
  'cyber-red': {
    name: 'Cyber Red',
    primary: '#dc2626',
    glow: '#f43f5e',
    bgStart: '#dc2626',
    bgEnd: '#fb7185',
  },
  custom: {
    name: 'Custom',
    primary: '#0099ff',
    glow: '#38bdf8',
    bgStart: '#0099ff',
    bgEnd: '#38bdf8',
  },
};

export const DEFAULT_THEME: ThemeSettings = {
  preset: 'sky-blue',
  primaryColor: '#0284c7',
  glowColor: '#38bdf8',
  bgGradientStart: '#0284c7',
  bgGradientEnd: '#38bdf8',
};

// Cross-tab BroadcastChannel for 0ms instantaneous sync
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('rg_telegram_miniapp_realtime')
  : null;

type StateListener = () => void;
const listeners = new Set<StateListener>();

export function subscribeRealtime(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(action?: string) {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error('Error notifying state subscriber:', err);
    }
  });

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ action, timestamp: Date.now() });
    } catch (e) {
      // Ignore
    }
  }
}

// Listen to other tabs/windows
if (typeof window !== 'undefined') {
  if (broadcastChannel) {
    broadcastChannel.onmessage = () => {
      listeners.forEach(fn => fn());
    };
  }

  window.addEventListener('storage', (e) => {
    if (Object.values(STORAGE_KEYS).includes(e.key || '')) {
      listeners.forEach(fn => fn());
    }
  });
}

let lastLocalSettingsSavedAt = 0;

// ----------------- Firebase Realtime Database Listeners -----------------
if (typeof window !== 'undefined' && rtdb) {
  // Silent Auth
  initFirebaseAuth().catch(() => {});

  // 1. Settings listener
  try {
    onValue(ref(rtdb, 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const current = getStoredSettings();
        // If settings were saved locally in the last 15 seconds, preserve our local overrides
        const isRecentlySaved = Date.now() - lastLocalSettingsSavedAt < 15000;
        const merged = isRecentlySaved ? { ...val, ...current } : { ...current, ...val };
        if (
          !merged.appTitle ||
          merged.appTitle.toLowerCase() === 'spin the win' ||
          merged.appTitle.toLowerCase() === 'rohit giveaway'
        ) {
          merged.appTitle = 'Scratch The Win';
        }
        merged.minWithdrawalLimit = Number(merged.minWithdrawalLimit) || 20;
        merged.spinWinAmount = Number(merged.spinWinAmount) || 5;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
        notifySubscribers('firebase_settings');
      }
    });
  } catch (err) {
    console.warn('Firebase RTDB settings listener notice:', err);
  }

  // 2. Theme listener
  try {
    onValue(ref(rtdb, 'theme'), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const current = getStoredTheme();
        const merged = { ...current, ...val };
        localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(merged));
        notifySubscribers('firebase_theme');
      }
    });
  } catch (err) {
    console.warn('Firebase RTDB theme listener notice:', err);
  }

  // 3. Withdrawals listener (Live real-time queue)
  try {
    onValue(ref(rtdb, 'withdrawals'), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const arr = (Object.values(val) as WithdrawalRequest[]).filter(
            (x) => x && typeof x === 'object' && x.id
          );
          arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(arr));
          notifySubscribers('firebase_withdrawals');
        }
      }
    });
  } catch (err) {
    console.warn('Firebase RTDB withdrawals listener notice:', err);
  }

  // 4. Current User Targeted Listener (Prevents downloading entire users database on every client!)
  try {
    const activeUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (activeUserId) {
      onValue(ref(rtdb, `users/${activeUserId}`), (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val() as UserProfile;
          if (val && val.id) {
            const users = getAllUsers();
            const idx = users.findIndex((u) => String(u.id).trim() === String(val.id).trim());
            if (idx >= 0) {
              users[idx] = { ...users[idx], ...val };
            } else {
              users.push(val);
            }
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            notifySubscribers('firebase_current_user');
          }
        }
      });
    }
  } catch (err) {
    console.warn('Firebase RTDB current user listener notice:', err);
  }

  // 5. Admin Credentials listener
  try {
    onValue(ref(rtdb, 'admin_auth'), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val && val.email && val.password) {
          localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(val));
          notifySubscribers('admin_auth_updated');
        }
      }
    });
  } catch (err) {
    console.warn('Firebase RTDB admin_auth listener notice:', err);
  }
}

// ----------------- Admin Authentication & Password Management -----------------

export function getAdminCredentials(): AdminCredentials {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_CREDENTIALS;
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(DEFAULT_ADMIN_CREDENTIALS));
    return DEFAULT_ADMIN_CREDENTIALS;
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      email: parsed.email || DEFAULT_ADMIN_CREDENTIALS.email,
      password: parsed.password || DEFAULT_ADMIN_CREDENTIALS.password,
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch {
    return DEFAULT_ADMIN_CREDENTIALS;
  }
}

export function saveAdminCredentials(creds: AdminCredentials): void {
  localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(creds));
  notifySubscribers('admin_auth_updated');

  if (rtdb) {
    set(ref(rtdb, 'admin_auth'), creds).catch((e) => {
      console.warn('Firebase admin_auth save notice:', e);
    });
  }
}

export function verifyAdminLogin(email: string, pass: string): { success: boolean; error?: string } {
  const current = getAdminCredentials();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Strictly check against the current active saved credentials only!
  if (
    cleanEmail === current.email.toLowerCase() &&
    cleanPass === current.password
  ) {
    setAdminLoggedIn(true);
    return { success: true };
  }

  return { success: false, error: 'Invalid Gmail or Password! Please check your credentials.' };
}

export function updateAdminPassword(currentPass: string, newPass: string): { success: boolean; error?: string } {
  const current = getAdminCredentials();
  if (currentPass.trim() !== current.password) {
    return { success: false, error: 'Current password is incorrect!' };
  }
  if (!newPass.trim() || newPass.trim().length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long!' };
  }

  const updated: AdminCredentials = {
    ...current,
    password: newPass.trim(),
    updatedAt: Date.now(),
  };

  saveAdminCredentials(updated);
  saveSettings({ adminPassword: newPass.trim() });
  return { success: true };
}

export function updateAdminEmail(newEmail: string): { success: boolean; error?: string } {
  const clean = newEmail.trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return { success: false, error: 'Please enter a valid email address!' };
  }
  const current = getAdminCredentials();
  const updated: AdminCredentials = {
    ...current,
    email: clean,
    updatedAt: Date.now(),
  };
  saveAdminCredentials(updated);
  saveSettings({ adminEmail: clean });
  return { success: true };
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'active' ||
    localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'active'
  );
}

export function setAdminLoggedIn(status: boolean): void {
  if (typeof window === 'undefined') return;
  if (status) {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'active');
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'active');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }
  notifySubscribers('admin_session_changed');
}

export function logoutAdmin(): void {
  setAdminLoggedIn(false);
}

// ----------------- Data Access Functions -----------------

export function getStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    if (
      !parsed.appTitle ||
      parsed.appTitle.toLowerCase() === 'spin the win' ||
      parsed.appTitle.toLowerCase() === 'rohit giveaway'
    ) {
      parsed.appTitle = 'Scratch The Win';
    }
    parsed.minWithdrawalLimit = Number(parsed.minWithdrawalLimit) || 20;
    parsed.spinWinAmount = Number(parsed.spinWinAmount) || 5;
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  lastLocalSettingsSavedAt = Date.now();
  const current = getStoredSettings();
  const updated: AppSettings = { ...current, ...settings };
  
  if (typeof settings.minWithdrawalLimit === 'number') {
    updated.minWithdrawalLimit = Math.round(settings.minWithdrawalLimit);
  }
  if (typeof settings.spinWinAmount === 'number') {
    updated.spinWinAmount = Math.round(settings.spinWinAmount);
  }

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  notifySubscribers('settings_updated');

  const cleanSettings = sanitizeForFirebase(updated);

  // 1. Push to Firebase Realtime Database SDK
  const db = rtdb;
  if (db) {
    try {
      await set(ref(db, 'settings'), cleanSettings);
    } catch {
      try {
        await update(ref(db, 'settings'), cleanSettings);
      } catch (e) {
        console.warn('Firebase saveSettings notice:', e);
      }
    }
  }

  // 2. Direct HTTP PUT and PATCH to ensure guaranteed delivery across all devices
  try {
    await fetch(`${RTDB_BASE_URL}/settings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanSettings),
    });

    await fetch(`${RTDB_BASE_URL}/settings.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minWithdrawalLimit: updated.minWithdrawalLimit,
        spinWinAmount: updated.spinWinAmount,
        telegramChannelUrl: updated.telegramChannelUrl,
        botUsername: updated.botUsername,
        appTitle: updated.appTitle,
      }),
    });
  } catch {
    // Ignore network hiccups
  }

  // 3. Directly sync minWithdrawalLimit to specific endpoint to guarantee persistence
  if (typeof settings.minWithdrawalLimit === 'number') {
    try {
      await fetch(`${RTDB_BASE_URL}/settings/minWithdrawalLimit.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Math.round(settings.minWithdrawalLimit)),
      });
    } catch {
      // Ignore
    }
  }

  return updated;
}

export function getStoredTheme(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const raw = localStorage.getItem(STORAGE_KEYS.THEME);
  if (!raw) return DEFAULT_THEME;
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Partial<ThemeSettings>): void {
  const current = getStoredTheme();
  const updated = { ...current, ...theme };
  localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(updated));
  notifySubscribers('theme_updated');

  // Push to Firebase Realtime Database
  const db = rtdb;
  if (db) {
    set(ref(db, 'theme'), updated).catch(() => {
      update(ref(db, 'theme'), theme).catch((e) => {
        console.warn('Firebase saveTheme notice:', e);
      });
    });
  }
  try {
    fetch(`${RTDB_BASE_URL}/theme.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  } catch {
    // Ignore
  }
}

// Dummy users list completely purged for clean production ready-to-use app
export const DUMMY_USER_IDS_TO_PURGE = [
  '91000001', '91000002', '91000003', '91000004', '91000005',
  '91000006', '91000007', '91000008', '91000009', '91000010',
  '91000011', '91000012', '91000013', '91000014', '91000015',
  '91000016', '91000017', '91000018', '91000019', '91000020',
];

export function isDummyUserId(id?: string): boolean {
  if (!id) return false;
  const clean = String(id).trim();
  return clean.startsWith('910000') || DUMMY_USER_IDS_TO_PURGE.includes(clean);
}

export function getAllUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!raw) {
    // Default initial user starts with ₹0 balance and 1 free lucky scratch
    const initialUser: UserProfile = {
      id: '88491204',
      telegramId: '88491204',
      name: 'Telegram User',
      username: 'user_winner',
      balance: 0,
      spins: 1, // Exactly 1 initial scratch card
      friendsJoined: 0,
      spinsEarned: 1,
      createdAt: Date.now(),
      isVerified: true,
      deviceVerified: true,
      claimedWelcomeSpin: false,
    };
    const starterList = [initialUser];
    saveUsers(starterList);
    addTransaction({
      userId: initialUser.id,
      type: 'welcome_bonus',
      amount: 0,
      description: 'Sign Up Bonus: 1 Free Scratch Card',
      status: 'completed',
    });
    return starterList;
  }
  try {
    const parsed: UserProfile[] = JSON.parse(raw);
    // Automatically purge any dummy users that were previously seeded
    const cleaned = parsed.filter((u) => !isDummyUserId(u.id) && !isDummyUserId(u.telegramId));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
      notifySubscribers('users_cleaned_dummy');
    }
    // Remove the old seeding flag
    localStorage.removeItem('rg_20_dummy_users_seeded_v1');
    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Permanently deletes all dummy test users from both local storage and Firebase RTDB.
 */
export async function purgeAllDummyUsers(): Promise<number> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rg_20_dummy_users_seeded_v1');
  }

  // 1. Purge from local storage
  const current = getAllUsers();
  const cleaned = current.filter((u) => !isDummyUserId(u.id) && !isDummyUserId(u.telegramId));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
  }

  // 2. Direct HTTP DELETE each dummy user from Firebase RTDB
  const deletePromises = DUMMY_USER_IDS_TO_PURGE.map(async (dummyId) => {
    try {
      await fetch(`${RTDB_BASE_URL}/users/${dummyId}.json`, {
        method: 'DELETE',
      });
      if (rtdb) {
        await set(ref(rtdb, `users/${dummyId}`), null).catch(() => {});
      }
    } catch {
      // Safe ignore
    }
  });

  await Promise.all(deletePromises);
  notifySubscribers('dummy_users_purged');
  return DUMMY_USER_IDS_TO_PURGE.length;
}

// Backward compatibility alias (now purges dummy users instead of seeding them)
export async function seed20DummyUsers(): Promise<UserProfile[]> {
  await purgeAllDummyUsers();
  return getAllUsers();
}

export function saveUsers(users: UserProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  notifySubscribers('users_updated');

  // Push to Firebase Realtime Database
  const db = rtdb;
  if (db) {
    users.forEach((u) => {
      try {
        const cleanUser = sanitizeForFirebase(u);
        set(ref(db, `users/${u.id}`), cleanUser).catch((e) => {
          console.warn(`Firebase saveUser ${u.id} notice:`, e);
        });
      } catch (err) {
        console.warn(`Firebase saveUser ${u.id} error:`, err);
      }
    });
  }
}

export function saveSingleUser(u: UserProfile): void {
  const users = getAllUsers();
  const cleanId = String(u.id).trim();
  const idx = users.findIndex(x => String(x.id).trim() === cleanId || String(x.telegramId).trim() === cleanId);
  if (idx >= 0) {
    users[idx] = u;
  } else {
    users.push(u);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  notifySubscribers('users_updated');

  const cleanUser = sanitizeForFirebase(u);

  if (rtdb) {
    try {
      set(ref(rtdb, `users/${u.id}`), cleanUser).catch(() => {});
    } catch {
      // Ignore
    }
  }
  try {
    fetch(`${RTDB_BASE_URL}/users/${u.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanUser),
    }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Live single user sync directly from Firebase RTDB REST API
 */
export function isUserIdBlockedLocally(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  const cleanId = String(userId).trim();
  if (!cleanId) return false;
  return localStorage.getItem(`rg_blocked_uid_${cleanId}`) === 'true';
}

export function markUserIdBlockedLocally(userId?: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  const cleanId = String(userId).trim();
  if (!cleanId) return;
  localStorage.setItem(`rg_blocked_uid_${cleanId}`, 'true');
}

export function hasUserPlayedScratchLocally(userId: string): boolean {
  const cleanId = String(userId).trim();
  if (!cleanId) return false;
  if (typeof window !== 'undefined' && localStorage.getItem(`rg_user_played_first_scratch_${cleanId}`) === 'true') {
    return true;
  }
  const txs = getAllTransactions();
  return txs.some(
    (t) => String(t.userId).trim() === cleanId && t.type === 'spin_win'
  );
}

export async function syncUserWithRemote(userId: string): Promise<UserProfile | null> {
  try {
    const cleanId = String(userId).trim();
    if (!cleanId) return null;
    const resp = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
      cache: 'no-store',
    });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const remoteUser = await resp.json();
      if (remoteUser && typeof remoteUser === 'object' && (remoteUser.id || remoteUser.telegramId || remoteUser.name || remoteUser.referredBy)) {
        remoteUser.id = String(remoteUser.id || cleanId).trim();
        remoteUser.telegramId = String(remoteUser.telegramId || cleanId).trim();

        const playedAlready =
          Number(remoteUser.balance || 0) > 0 ||
          remoteUser.referralRewardGiven === true ||
          remoteUser.hasScratchedFirstCard === true ||
          hasUserPlayedScratchLocally(cleanId);

        // Guarantee 1 Sign Up Scratch Card if user has never scratched yet (balance === 0 and not played)
        let needsRemotePatch = false;
        if (!playedAlready && (typeof remoteUser.spins !== 'number' || remoteUser.spins < 1)) {
          remoteUser.spins = 1;
          remoteUser.spinsEarned = Math.max(Number(remoteUser.spinsEarned) || 0, 1);
          remoteUser.claimedWelcomeSpin = true;
          needsRemotePatch = true;
        }

        if (needsRemotePatch) {
          fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spins: remoteUser.spins,
              spinsEarned: remoteUser.spinsEarned,
              claimedWelcomeSpin: true,
            }),
          }).catch(() => {});
        }

        const users = getAllUsers();
        const idx = users.findIndex(x => String(x.id).trim() === cleanId || String(x.telegramId).trim() === cleanId);
        let updated: UserProfile;
        if (idx >= 0) {
          updated = { ...users[idx], ...remoteUser };
          users[idx] = updated;
        } else {
          updated = {
            balance: 0,
            spins: 1,
            friendsJoined: 0,
            spinsEarned: 1,
            createdAt: Date.now(),
            claimedWelcomeSpin: true,
            ...remoteUser,
          } as UserProfile;
          users.push(updated);
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        notifySubscribers('user_synced_from_remote');
        return updated;
      }
    }
  } catch (err) {
    console.warn('syncUserWithRemote notice:', err);
  }
  return null;
}

export function getCurrentUser(): UserProfile {
  const users = getAllUsers();
  const tgUser = getTelegramUser();

  // If inside Telegram or URL has ?uid=, use real telegram user ID
  let effectiveId: string;
  if (tgUser && tgUser.id) {
    effectiveId = String(tgUser.id).trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, effectiveId);
    }
  } else {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) : null;
    if (stored && stored !== '88491204') {
      effectiveId = stored;
    } else {
      // Generate unique persistent visitor ID so external visitors NEVER share balance/referrals
      effectiveId = String(Math.floor(100000000 + Math.random() * 900000000));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, effectiveId);
      }
    }
  }

  let user = users.find(u => String(u.id).trim() === effectiveId || String(u.telegramId).trim() === effectiveId);
  const isLocallyBlockedUid = isUserIdBlockedLocally(effectiveId);

  if (!user) {
    // Auto register user with strictly ₹0 balance and 1 free signup scratch card
    const newUser: UserProfile = {
      id: effectiveId,
      telegramId: effectiveId,
      name: tgUser ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim() : `User #${effectiveId.slice(-4)}`,
      username: tgUser?.username || `user_${effectiveId.slice(-4)}`,
      balance: 0,
      spins: 1, // Strictly 1 Sign Up Scratch Card
      friendsJoined: 0,
      spinsEarned: 1,
      createdAt: Date.now(),
      isVerified: false,
      deviceVerified: false,
      deviceBlocked: isLocallyBlockedUid ? true : undefined,
      photoUrl: tgUser?.photo_url,
      claimedWelcomeSpin: true,
    };
    users.push(newUser);
    saveUsers(users);
    addTransaction({
      userId: effectiveId,
      type: 'welcome_bonus',
      amount: 0,
      description: 'Sign Up Bonus: 1 Free Scratch Card',
      status: 'completed',
    });
    user = newUser;
  } else {
    if (isLocallyBlockedUid || user.deviceBlocked) {
      user.deviceBlocked = true;
      user.isVerified = false;
      user.deviceVerified = false;
    }
    // Sync latest Telegram metadata if available
    if (tgUser) {
      const freshName = `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim();
      let hasUpdates = false;
      if (freshName && !freshName.startsWith('User #') && user.name !== freshName) {
        user.name = freshName;
        hasUpdates = true;
      }
      if (tgUser.username && user.username !== tgUser.username) {
        user.username = tgUser.username;
        hasUpdates = true;
      }
      if (tgUser.photo_url && user.photoUrl !== tgUser.photo_url) {
        user.photoUrl = tgUser.photo_url;
        hasUpdates = true;
      }
      if (hasUpdates) {
        saveUsers(users);
      }
    }

    const playedAlready =
      Number(user.balance || 0) > 0 ||
      user.referralRewardGiven === true ||
      (user as any).hasScratchedFirstCard === true ||
      hasUserPlayedScratchLocally(effectiveId);

    if (!playedAlready && (typeof user.spins !== 'number' || user.spins < 1)) {
      // Guarantee 1 Sign Up Bonus scratch card if user hasn't played any scratch card yet
      user.claimedWelcomeSpin = true;
      user.spins = 1;
      user.spinsEarned = Math.max(user.spinsEarned || 0, 1);
      saveSingleUser(user);
    }
  }

  return user;
}

export function switchActiveUser(userId: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  notifySubscribers('user_switched');
}

export function createOrUpdateUser(profile: Partial<UserProfile> & { id: string }): UserProfile {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === profile.id);
  let updatedUser: UserProfile;

  if (idx >= 0) {
    updatedUser = { ...users[idx], ...profile };
    users[idx] = updatedUser;
  } else {
    updatedUser = {
      telegramId: profile.telegramId || profile.id,
      name: profile.name || 'Telegram User',
      username: profile.username || `user_${profile.id}`,
      balance: profile.balance || 0,
      spins: profile.spins ?? 1,
      friendsJoined: profile.friendsJoined || 0,
      spinsEarned: profile.spinsEarned ?? 1,
      createdAt: Date.now(),
      isVerified: true,
      claimedWelcomeSpin: profile.claimedWelcomeSpin ?? true,
      ...profile,
      id: profile.id,
    };
    users.push(updatedUser);
  }

  saveUsers(users);
  return updatedUser;
}

export function addSpinsToUser(userId: string, spinsToAdd: number): UserProfile | null {
  const users = getAllUsers();
  const cleanId = String(userId).trim();
  const user = users.find(u => String(u.id).trim() === cleanId || String(u.telegramId).trim() === cleanId);
  if (!user) return null;

  user.spins = Math.max(0, (user.spins || 0) + spinsToAdd);
  if (spinsToAdd > 0) {
    user.spinsEarned = (user.spinsEarned || 0) + spinsToAdd;
  }
  saveSingleUser(user);
  return user;
}

export function addFreeTestScratches(userId: string, count = 5): UserProfile | null {
  const user = addSpinsToUser(userId, count);
  if (user) {
    addTransaction({
      userId: user.id,
      type: 'admin_adjustment',
      amount: 0,
      description: `Testing Bonus: +${count} Free Lucky Scratches`,
      status: 'completed',
    });
  }
  return user;
}

export function addBalanceToUser(
  userId: string,
  amount: number,
  description = 'Admin Adjustment',
  recordTransaction = true,
  txType: Transaction['type'] = 'admin_adjustment'
): UserProfile | null {
  const users = getAllUsers();
  const cleanId = String(userId).trim();
  const user = users.find(u => String(u.id).trim() === cleanId || String(u.telegramId).trim() === cleanId);
  if (!user) return null;

  user.balance = Math.max(0, Number((user.balance + amount).toFixed(2)));
  saveSingleUser(user);

  if (recordTransaction) {
    addTransaction({
      userId: user.id,
      type: txType,
      amount,
      description,
      status: 'completed',
    });
  }

  return user;
}

export function decrementUserSpin(userId: string): boolean {
  const users = getAllUsers();
  const cleanId = String(userId).trim();
  const user = users.find(u => String(u.id).trim() === cleanId || String(u.telegramId).trim() === cleanId);
  if (!user || user.spins <= 0) return false;

  user.spins -= 1;
  (user as any).hasScratchedFirstCard = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem(`rg_user_played_first_scratch_${cleanId}`, 'true');
  }
  saveSingleUser(user);
  return true;
}

// ----------------- Transactions -----------------

export function getAllTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTransactions(list: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
  notifySubscribers('transactions_updated');
}

export function getUserTransactions(userId: string): Transaction[] {
  const cleanId = String(userId).trim();
  const currentUser = getCurrentUser();
  const altId = currentUser.telegramId ? String(currentUser.telegramId).trim() : cleanId;

  return getAllTransactions()
    .filter(t => {
      const txUserId = String(t.userId).trim();
      return txUserId === cleanId || txUserId === altId;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function refreshTransactionsFromRemote(): Promise<Transaction[]> {
  try {
    const resp = await fetch(`${RTDB_BASE_URL}/transactions.json`, {
      cache: 'no-store',
    });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      let remoteArr: Transaction[] = [];
      if (data && typeof data === 'object') {
        remoteArr = (Object.values(data) as Transaction[]).filter(
          (x) => x && typeof x === 'object' && x.id && typeof x.createdAt === 'number'
        );
      }
      remoteArr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveTransactions(remoteArr);
      return remoteArr;
    }
  } catch (e) {
    // Silent fallback to local storage
  }
  return getAllTransactions();
}

export function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const all = getAllTransactions();
  const tx: Transaction = {
    ...data,
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: Date.now(),
  };
  all.unshift(tx);
  saveTransactions(all);

  const cleanTx = sanitizeForFirebase(tx);

  if (rtdb) {
    try {
      set(ref(rtdb, `transactions/${tx.id}`), cleanTx).catch((e) => {
        console.warn('Firebase addTransaction notice:', e);
      });
    } catch (e) {
      console.warn('Firebase addTransaction sync notice:', e);
    }
  }

  try {
    fetch(`${RTDB_BASE_URL}/transactions/${tx.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanTx),
    }).catch(() => {});
  } catch {
    // Ignore
  }

  return tx;
}

// ----------------- Withdrawals -----------------

export function getAllWithdrawals(): WithdrawalRequest[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.WITHDRAWALS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWithdrawals(list: WithdrawalRequest[]): void {
  localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(list));
  notifySubscribers('withdrawals_updated');
}

export function getUserWithdrawals(userId: string): WithdrawalRequest[] {
  const all = getAllWithdrawals();
  const cleanId = String(userId).trim();
  return all
    .filter((w) => String(w.userId).trim() === cleanId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getDeletedWithdrawalIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_WITHDRAWALS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markWithdrawalAsDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedWithdrawalIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_WITHDRAWALS, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

export function clearDeletedWithdrawalsTombstones(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.DELETED_WITHDRAWALS);
}

/**
 * Direct Live REST Sync from Firebase RTDB (Guaranteed to work across all devices & networks)
 * Seamlessly merges any pending local requests so no request is ever lost, while respecting deleted records.
 */
export async function refreshWithdrawalsFromRemote(): Promise<WithdrawalRequest[]> {
  try {
    const resp = await fetch(`${RTDB_BASE_URL}/withdrawals.json`, {
      cache: 'no-store',
    });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      let remoteArr: WithdrawalRequest[] = [];
      if (data && typeof data === 'object') {
        remoteArr = (Object.values(data) as WithdrawalRequest[]).filter(
          (x) => x && typeof x === 'object' && x.id && typeof x.amount === 'number'
        );
      } else if (data === null) {
        remoteArr = [];
      }

      // Filter out any remotely returned items that were explicitly deleted
      const deletedIds = getDeletedWithdrawalIds();
      remoteArr = remoteArr.filter((x) => !deletedIds.has(x.id));

      // Merge local pending items so newly submitted items are preserved and synced
      const localList = getAllWithdrawals();
      const remoteIdMap = new Set(remoteArr.map((x) => x.id));
      const merged = [...remoteArr];

      for (const loc of localList) {
        if (!remoteIdMap.has(loc.id) && !deletedIds.has(loc.id)) {
          // If request was created within the last 48 hours or is pending, keep it and re-push
          if (loc.status === 'pending' || (Date.now() - (loc.createdAt || 0) < 172800000)) {
            merged.push(loc);
            fetch(`${RTDB_BASE_URL}/withdrawals/${loc.id}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sanitizeForFirebase(loc)),
            }).catch(() => {});
          }
        }
      }

      merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(merged));
      notifySubscribers('remote_withdrawals_synced');
      return merged;
    }
  } catch (err) {
    // Silent fallback to local storage
  }
  return getAllWithdrawals();
}

/**
 * Direct Live REST Sync for Users from Firebase RTDB
 */
export async function refreshUsersFromRemote(): Promise<UserProfile[]> {
  try {
    const resp = await fetch(`${RTDB_BASE_URL}/users.json`, {
      cache: 'no-store',
    });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data && typeof data === 'object') {
        const arr = (Object.values(data) as UserProfile[]).filter((x) => x && x.id);
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(arr));
        notifySubscribers('remote_users_synced');
        return arr;
      }
    }
  } catch (err) {
    // Silent fallback to local storage
  }
  return getAllUsers();
}

/**
 * Efficient 10-by-10 Paginated User Batch Loader from Firebase RTDB
 * Prevents heavy full-database downloads so the website & database stay fast.
 */
export async function fetchUsersBatchFromRemote(
  batchSize = 10,
  lastKey?: string | null
): Promise<{ users: UserProfile[]; nextCursor: string | null; hasMore: boolean }> {
  try {
    let url = `${RTDB_BASE_URL}/users.json?orderBy=%22$key%22&limitToFirst=${batchSize + 1}`;
    if (lastKey) {
      url += `&startAt=%22${encodeURIComponent(lastKey)}%22`;
    }
    const resp = await fetch(url, { cache: 'no-store' });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data && typeof data === 'object') {
        const keys = Object.keys(data).sort();
        const filteredKeys = lastKey ? keys.filter((k) => k !== lastKey) : keys;
        const hasMore = filteredKeys.length > batchSize;
        const pageKeys = filteredKeys.slice(0, batchSize);
        const batchUsers = pageKeys
          .map((k) => data[k] as UserProfile)
          .filter((x) => x && x.id);

        // Merge loaded batch into local cache without overwriting other users
        const existing = getAllUsers();
        const existingMap = new Map(existing.map((u) => [String(u.id).trim(), u]));
        for (const u of batchUsers) {
          existingMap.set(String(u.id).trim(), u);
        }
        const merged = Array.from(existingMap.values());
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));

        const nextCursor = pageKeys.length > 0 ? pageKeys[pageKeys.length - 1] : null;
        return { users: merged, nextCursor, hasMore: hasMore || merged.length > batchSize };
      }
    }
  } catch (err) {
    console.warn('Paginated users batch fetch notice:', err);
  }
  const fallback = getAllUsers();
  return { users: fallback, nextCursor: null, hasMore: fallback.length > batchSize };
}

const activeWithdrawalLocks = new Set<string>();
const activeReferralLocks = new Set<string>();

export async function requestWithdrawal(
  req: Omit<WithdrawalRequest, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; error?: string; request?: WithdrawalRequest }> {
  const settings = getStoredSettings();
  const users = getAllUsers();
  const cleanUserId = String(req.userId).trim();
  if (!cleanUserId) {
    return { success: false, error: 'Invalid user account' };
  }

  if (activeWithdrawalLocks.has(cleanUserId)) {
    return { success: false, error: 'Withdrawal is being processed! Please wait a moment.' };
  }

  activeWithdrawalLocks.add(cleanUserId);
  try {
    const u = users.find(x => String(x.id).trim() === cleanUserId || String(x.telegramId).trim() === cleanUserId) || getCurrentUser();

    if (u.deviceBlocked || isUserIdBlockedLocally(cleanUserId)) {
      return { success: false, error: 'Device verification failed / Account blocked.' };
    }

    const numAmount = Number(req.amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Invalid withdrawal amount' };
    }

    if (numAmount < settings.minWithdrawalLimit) {
      return { success: false, error: `Minimum withdrawal amount is ₹${settings.minWithdrawalLimit}` };
    }

    // Verify live remote balance in Firebase RTDB so DevTools localStorage balance edits cannot bypass checks
    try {
      const remResp = await fetch(`${RTDB_BASE_URL}/users/${cleanUserId}.json`, { cache: 'no-store' });
      if (remResp.ok) {
        const remUser = await remResp.json();
        if (remUser && typeof remUser === 'object') {
          if (remUser.deviceBlocked === true) {
            markUserIdBlockedLocally(cleanUserId);
            return { success: false, error: 'Account permanently blocked due to multi-account violation.' };
          }
          if (typeof remUser.balance === 'number') {
            u.balance = Number(remUser.balance);
          }
        }
      }
    } catch {
      // Fallback to local balance if offline
    }

    if (u.balance < numAmount) {
      return { success: false, error: `Insufficient balance! Available balance is ₹${u.balance.toFixed(2)}` };
    }

    // Prevent double-click rapid race conditions
    const allWithdrawals = getAllWithdrawals();
    const recentDuplicate = allWithdrawals.find(
      (w) => w.userId === u.id && w.status === 'pending' && Math.abs(w.amount - numAmount) < 0.01 && Date.now() - (w.createdAt || 0) < 6000
    );
    if (recentDuplicate) {
      return { success: false, error: 'Withdrawal already submitted! Please wait a moment.' };
    }

    // Deduct balance immediately and commit to Firebase RTDB before creating withdrawal record
    u.balance = Number(Math.max(0, u.balance - numAmount).toFixed(2));
    saveSingleUser(u);
    try {
      await fetch(`${RTDB_BASE_URL}/users/${u.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizeForFirebase(u)),
      });
    } catch {
      // Ignore network hiccup
    }

    const withdrawalId = `w_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    // Construct clean withdrawal object without ANY undefined fields
    const rawWithdrawal: WithdrawalRequest = {
      id: withdrawalId,
      userId: u.id,
      userName: req.userName || u.name || 'Telegram User',
      amount: numAmount,
      method: req.method,
      status: 'pending',
      createdAt: Date.now(),
    };

    if (req.method === 'upi' && req.upiId) {
      rawWithdrawal.upiId = req.upiId.trim();
    } else if (req.method === 'bank') {
      if (req.accountHolder) rawWithdrawal.accountHolder = req.accountHolder.trim();
      if (req.accountNumber) rawWithdrawal.accountNumber = req.accountNumber.trim();
      if (req.bankName) rawWithdrawal.bankName = req.bankName.trim();
      if (req.ifsc) rawWithdrawal.ifsc = req.ifsc.trim().toUpperCase();
    }

    const cleanWithdrawal = sanitizeForFirebase(rawWithdrawal);

    // Update local storage first
    const all = getAllWithdrawals();
    all.unshift(cleanWithdrawal);
    saveWithdrawals(all);

    // 1. Direct REST PUT to ensure guaranteed real-time arrival in Firebase RTDB
    try {
      await fetch(`${RTDB_BASE_URL}/withdrawals/${cleanWithdrawal.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanWithdrawal),
      });
    } catch (err) {
      console.warn('Direct HTTP PUT error:', err);
    }

    // 2. Push to Firebase SDK if active
    if (rtdb) {
      try {
        set(ref(rtdb, `withdrawals/${cleanWithdrawal.id}`), cleanWithdrawal).catch((e) => {
          console.warn('Firebase withdrawal create notice:', e);
        });
      } catch (e) {
        console.warn('Firebase SDK set exception caught safely:', e);
      }
    }

    // Add transaction log
    addTransaction({
      userId: u.id,
      type: 'withdrawal',
      amount: -req.amount,
      description: req.method === 'upi' ? `Withdrawal to UPI: ${cleanWithdrawal.upiId || 'N/A'}` : `Withdrawal to Bank: ${cleanWithdrawal.accountNumber || 'N/A'}`,
      status: 'pending',
    });

    notifySubscribers('withdrawal_requested');

    return { success: true, request: cleanWithdrawal };
  } finally {
    activeWithdrawalLocks.delete(cleanUserId);
  }
}

export async function approveWithdrawal(withdrawalId: string): Promise<boolean> {
  const list = getAllWithdrawals();
  const item = list.find(w => w.id === withdrawalId);
  if (!item || item.status !== 'pending') return false;

  item.status = 'approved';
  item.updatedAt = Date.now();
  saveWithdrawals(list);

  const payload = {
    status: 'approved',
    updatedAt: item.updatedAt,
  };

  // 1. Direct REST PATCH
  try {
    await fetch(`${RTDB_BASE_URL}/withdrawals/${withdrawalId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Direct HTTP PATCH error:', e);
  }

  // 2. Push update via Firebase SDK
  if (rtdb) {
    try {
      update(ref(rtdb, `withdrawals/${withdrawalId}`), payload).catch((e) => {
        console.warn('Firebase approveWithdrawal notice:', e);
      });
    } catch (e) {
      console.warn('Firebase SDK update exception caught:', e);
    }
  }

  // Update transaction status
  const txs = getAllTransactions();
  const tx = txs.find(t => t.userId === item.userId && t.type === 'withdrawal' && Math.abs(t.amount) === item.amount && t.status === 'pending');
  if (tx) {
    tx.status = 'completed';
    saveTransactions(txs);
    if (rtdb) {
      update(ref(rtdb, `transactions/${tx.id}`), { status: 'completed' }).catch(() => {});
    }
    fetch(`${RTDB_BASE_URL}/transactions/${tx.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {});
  }

  notifySubscribers('withdrawal_approved');
  return true;
}

const rejectingWithdrawalLocks = new Set<string>();

export async function rejectWithdrawal(withdrawalId: string, reason = 'Verification failed / Invalid details'): Promise<boolean> {
  const cleanWId = String(withdrawalId).trim();
  if (!cleanWId || rejectingWithdrawalLocks.has(cleanWId)) return false;

  const list = getAllWithdrawals();
  const item = list.find(w => w.id === cleanWId);
  if (!item || item.status !== 'pending' || (item as any).refunded) return false;

  rejectingWithdrawalLocks.add(cleanWId);

  try {
    // Check remote withdrawal status first to prevent any duplicate refund across sessions/tabs
    try {
      const remWResp = await fetch(`${RTDB_BASE_URL}/withdrawals/${cleanWId}.json`, { cache: 'no-store' });
      if (remWResp.ok) {
        const remW = await remWResp.json();
        if (remW && typeof remW === 'object') {
          if (remW.status && remW.status !== 'pending') {
            item.status = remW.status;
            saveWithdrawals(list);
            return false;
          }
          if (remW.refunded === true) {
            item.status = 'rejected';
            (item as any).refunded = true;
            saveWithdrawals(list);
            return false;
          }
        }
      }
    } catch {
      // Proceed if offline
    }

    item.status = 'rejected';
    item.rejectReason = reason;
    item.updatedAt = Date.now();
    (item as any).refunded = true;
    saveWithdrawals(list);

    const payload = {
      status: 'rejected',
      rejectReason: reason,
      updatedAt: item.updatedAt,
      refunded: true,
    };

    // 1. Direct REST PATCH
    try {
      await fetch(`${RTDB_BASE_URL}/withdrawals/${cleanWId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Direct HTTP PATCH error:', e);
    }

    // 2. Push update via Firebase SDK
    if (rtdb) {
      try {
        update(ref(rtdb, `withdrawals/${cleanWId}`), payload).catch((e) => {
          console.warn('Firebase rejectWithdrawal notice:', e);
        });
      } catch (e) {
        console.warn('Firebase SDK update exception caught:', e);
      }
    }

    // 3. Refund strictly 1x the exact withdrawal amount using LIVE user balance from Firebase RTDB
    // (Prevents stale admin localStorage balance from causing a double refund!)
    const cleanUserId = String(item.userId).trim();
    const refundAmount = Number(item.amount) || 0;

    let remoteUser: UserProfile | null = null;
    try {
      const uResp = await fetch(`${RTDB_BASE_URL}/users/${cleanUserId}.json`, { cache: 'no-store' });
      if (uResp.ok) {
        const uData = await uResp.json();
        if (uData && typeof uData === 'object' && (uData.id || uData.telegramId)) {
          remoteUser = uData as UserProfile;
        }
      }
    } catch {
      // Fallback to local user if network fails
    }

    const users = getAllUsers();
    const localUser = users.find(x => String(x.id).trim() === cleanUserId || String(x.telegramId).trim() === cleanUserId);
    const currentLiveBalance =
      remoteUser && typeof remoteUser.balance === 'number'
        ? Number(remoteUser.balance)
        : localUser
        ? Number(localUser.balance) || 0
        : 0;

    const exactRefundedBalance = Number((currentLiveBalance + refundAmount).toFixed(2));

    const updatedUser: UserProfile = {
      ...(localUser || remoteUser || {
        id: cleanUserId,
        telegramId: cleanUserId,
        name: item.userName || `User #${cleanUserId}`,
        username: `user_${cleanUserId}`,
        spins: 1,
        friendsJoined: 0,
        spinsEarned: 1,
        createdAt: Date.now(),
        isVerified: true,
        deviceVerified: true,
      }),
      ...(remoteUser || {}),
      id: cleanUserId,
      balance: exactRefundedBalance,
    };

    saveSingleUser(updatedUser);

    // Update transaction
    const allTxs = getAllTransactions();
    const pendingTx = allTxs.find(
      t => String(t.userId).trim() === cleanUserId && t.type === 'withdrawal' && Math.abs(t.amount) === refundAmount && t.status === 'pending'
    );
    if (pendingTx) {
      pendingTx.status = 'rejected';
      saveTransactions(allTxs);
      if (rtdb) {
        update(ref(rtdb, `transactions/${pendingTx.id}`), { status: 'rejected' }).catch(() => {});
      }
      fetch(`${RTDB_BASE_URL}/transactions/${pendingTx.id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      }).catch(() => {});
    }

    // Add refund transaction log
    addTransaction({
      userId: cleanUserId,
      type: 'withdrawal_refund',
      amount: refundAmount,
      description: `Refund for rejected withdrawal: ${reason}`,
      status: 'completed',
    });

    notifySubscribers('withdrawal_rejected');
    return true;
  } finally {
    rejectingWithdrawalLocks.delete(cleanWId);
  }
}

/**
 * Permanently delete a single withdrawal request by ID from both Firebase RTDB & local storage.
 * NOTE: Deleting a withdrawal from Admin Panel does NOT refund any amount to the user!
 */
export async function deletePermanentWithdrawal(withdrawalId: string): Promise<boolean> {
  const cleanId = String(withdrawalId).trim();
  if (!cleanId) return false;

  markWithdrawalAsDeleted(cleanId);

  // 1. Remove from local storage WITHOUT refunding any balance to the user
  const current = getAllWithdrawals();
  const filtered = current.filter((w) => w.id !== cleanId);
  saveWithdrawals(filtered);

  // 2. Direct HTTP DELETE from Firebase Realtime Database
  try {
    await fetch(`${RTDB_BASE_URL}/withdrawals/${cleanId}.json`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Direct HTTP DELETE error:', err);
  }

  // 3. Delete via Firebase SDK
  if (rtdb) {
    try {
      await set(ref(rtdb, `withdrawals/${cleanId}`), null);
    } catch (e) {
      console.warn('Firebase SDK delete notice:', e);
    }
  }

  notifySubscribers('withdrawal_permanently_deleted');
  return true;
}

/**
 * Permanently deletes all processed (approved & rejected) withdrawals so history stays clean.
 * Directly queries Firebase RTDB and purges them completely.
 * Keeps pending requests intact.
 */
export async function deleteProcessedWithdrawals(): Promise<number> {
  const deletedIds = new Set<string>();

  // 1. Fetch latest from RTDB to delete all remote processed records
  try {
    const resp = await fetch(`${RTDB_BASE_URL}/withdrawals.json`, { cache: 'no-store' });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data && typeof data === 'object') {
        const remoteItems = Object.values(data) as WithdrawalRequest[];
        const toDelete = remoteItems.filter((w) => w && (w.status === 'approved' || w.status === 'rejected'));
        await Promise.all(
          toDelete.map(async (w) => {
            deletedIds.add(w.id);
            markWithdrawalAsDeleted(w.id);
            await fetch(`${RTDB_BASE_URL}/withdrawals/${w.id}.json`, { method: 'DELETE' }).catch(() => {});
            if (rtdb) {
              set(ref(rtdb, `withdrawals/${w.id}`), null).catch(() => {});
            }
          })
        );
      }
    }
  } catch {
    // Ignore
  }

  // 2. Clean local storage
  const current = getAllWithdrawals();
  const processed = current.filter((w) => w.status === 'approved' || w.status === 'rejected');
  processed.forEach((w) => {
    deletedIds.add(w.id);
    markWithdrawalAsDeleted(w.id);
  });
  const remaining = current.filter((w) => w.status === 'pending' && !deletedIds.has(w.id));
  saveWithdrawals(remaining);

  notifySubscribers('processed_withdrawals_cleaned');
  return deletedIds.size || processed.length;
}

/**
 * Permanently wipes ALL withdrawal data from Firebase RTDB and local storage.
 * Leaves the withdrawal queue completely empty.
 */
export async function clearAllWithdrawalsPermanent(): Promise<boolean> {
  // 1. Clear local storage & tombstones
  saveWithdrawals([]);
  clearDeletedWithdrawalsTombstones();

  // 2. Direct HTTP DELETE entire withdrawals collection from Firebase RTDB
  try {
    await fetch(`${RTDB_BASE_URL}/withdrawals.json`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore
  }

  // 3. Clear via Firebase SDK
  if (rtdb) {
    try {
      await set(ref(rtdb, 'withdrawals'), null);
    } catch (e) {
      console.warn('Firebase SDK clear all withdrawals notice:', e);
    }
  }

  notifySubscribers('all_withdrawals_cleared');
  return true;
}

// ----------------- Real Referral System with Data Fetch -----------------

/**
 * Records that the current user was referred by referrerId.
 * IMPORTANT: DOES NOT credit any spin! Spin is ONLY awarded after the user actually plays their first spin.
 */
export function recordPendingReferral(referrerId: string, visitorId?: string): { success: boolean; message: string } {
  if (!referrerId) return { success: false, message: 'Invalid referrer ID' };

  let cleanReferrerId = '';
  try {
    cleanReferrerId = decodeURIComponent(referrerId).trim();
  } catch {
    cleanReferrerId = referrerId.trim();
  }
  cleanReferrerId = cleanReferrerId
    .replace(/^ref_/i, '')
    .replace(/^ref-/i, '')
    .replace(/^ref/i, '')
    .replace(/^invite_/i, '')
    .trim();

  if (!cleanReferrerId || !/^\d+$/.test(cleanReferrerId)) {
    return { success: false, message: 'Invalid numeric referrer ID' };
  }

  const currentUserId = String(visitorId || getCurrentUser().id).trim();

  if (cleanReferrerId === currentUserId) {
    return { success: false, message: 'Self referral is not allowed' };
  }

  // Prevent self-referral or multi-account referral farming on same bound physical device
  const boundTelegramId = typeof window !== 'undefined' ? localStorage.getItem('rg_bound_telegram_id_v1') : null;
  if (boundTelegramId) {
    const cleanBound = String(boundTelegramId).trim();
    if (cleanBound === cleanReferrerId || (cleanBound && cleanBound !== currentUserId)) {
      return { success: false, message: 'Referral on already bound device is not allowed' };
    }
  }

  const users = getAllUsers();
  const user = users.find(u => u.id === currentUserId || u.telegramId === currentUserId);
  const refUserLocal = users.find(u => u.id === cleanReferrerId || u.telegramId === cleanReferrerId);

  // Prevent circular referral (if currentUserId already referred cleanReferrerId, cleanReferrerId cannot refer currentUserId back)
  if (refUserLocal && String(refUserLocal.referredBy || '').trim() === currentUserId) {
    return { success: false, message: 'Circular referral is not allowed' };
  }
  
  // Existing users or blocked accounts cannot be referred
  if (user) {
    if (user.deviceBlocked || isUserIdBlockedLocally(currentUserId)) {
      return { success: false, message: 'Blocked device cannot be referred' };
    }
    if (
      user.referralRewardGiven ||
      (user as any).hasScratchedFirstCard ||
      hasUserPlayedScratchLocally(currentUserId) ||
      user.balance > 0 ||
      user.friendsJoined > 0
    ) {
      return { success: false, message: 'Existing player cannot be referred' };
    }
    if (user.referredBy && user.referredBy !== cleanReferrerId) {
      return { success: false, message: 'Referrer already assigned' };
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('rg_pending_referrer_id', cleanReferrerId);
  }

  if (user && !user.referredBy) {
    user.referredBy = cleanReferrerId;
    saveUsers(users);
  }

  if (currentUserId) {
    // Ensure we never overwrite a new user's 1 signup scratch card with a bare { referredBy } object
    const fullReferredUser = user
      ? sanitizeForFirebase({
          ...user,
          spins: Math.max(user.spins ?? 1, (user.balance || 0) === 0 ? 1 : 0),
          spinsEarned: Math.max(user.spinsEarned ?? 1, 1),
          claimedWelcomeSpin: true,
          referredBy: cleanReferrerId,
        })
      : {
          id: currentUserId,
          telegramId: currentUserId,
          name: `User #${currentUserId.slice(-4)}`,
          balance: 0,
          spins: 1,
          friendsJoined: 0,
          spinsEarned: 1,
          createdAt: Date.now(),
          claimedWelcomeSpin: true,
          referredBy: cleanReferrerId,
          referralRewardGiven: false,
        };

    const pendingRefPayload = {
      joinerId: currentUserId,
      name: user?.name || `User #${currentUserId.slice(-4)}`,
      username: user?.username || '',
      timestamp: Date.now(),
      status: 'pending_first_scratch',
    };

    if (rtdb) {
      update(ref(rtdb, `users/${currentUserId}`), fullReferredUser).catch(() => {});
      set(ref(rtdb, `referrals/${cleanReferrerId}/${currentUserId}`), pendingRefPayload).catch(() => {});
    }

    fetch(`${RTDB_BASE_URL}/users/${currentUserId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullReferredUser),
    }).catch(() => {});

    fetch(`${RTDB_BASE_URL}/referrals/${cleanReferrerId}/${currentUserId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingRefPayload),
    }).catch(() => {});
  }

  return { success: true, message: 'Referrer recorded. Scratch card will unlock after first scratch!' };
}

/**
 * Backward compatibility alias
 */
export function processReferralJoin(referrerId: string, visitorId?: string): { success: boolean; message: string } {
  return recordPendingReferral(referrerId, visitorId);
}

/**
 * CRITICAL ANTI-GLITCH REFERRAL SYSTEM:
 * Referrer gets +1 Spin ONLY after the referred user completes their first Lucky Spin!
 * Simply clicking /start, restarting bot, or viewing page gives 0 spins.
 */
export async function creditReferralAfterFirstSpin(currentUserId: string): Promise<boolean> {
  const cleanCurrentId = String(currentUserId).trim();
  if (!cleanCurrentId || activeReferralLocks.has(cleanCurrentId)) return false;

  const processedKey = `rg_ref_spin_awarded_${cleanCurrentId}`;
  if (typeof window !== 'undefined' && localStorage.getItem(processedKey)) {
    return false; // Already awarded for this user
  }

  // Block referral rewards from blocked or multi-account devices
  if (isUserIdBlockedLocally(cleanCurrentId)) {
    return false;
  }
  const boundTelegramId = typeof window !== 'undefined' ? localStorage.getItem('rg_bound_telegram_id_v1') : null;
  if (boundTelegramId && String(boundTelegramId).trim() !== cleanCurrentId) {
    return false;
  }

  activeReferralLocks.add(cleanCurrentId);

  try {
    let referredBy: string | null = null;
    let userName = 'Friend';
    let userUsername = '';

    // 1. Check local user profile
    const users = getAllUsers();
    const user = users.find(u => u.id === cleanCurrentId || u.telegramId === cleanCurrentId);
    if (user) {
      if (user.deviceBlocked) return false;
      if (user.referralRewardGiven) {
        if (typeof window !== 'undefined') localStorage.setItem(processedKey, 'true');
        return false;
      }
      referredBy = user.referredBy || null;
      userName = user.name || userName;
      userUsername = user.username || userUsername;
    }

    // 2. Check RTDB via REST first (most reliable across all networks/WebViews)
    try {
      const resp = await fetch(`${RTDB_BASE_URL}/users/${cleanCurrentId}.json`, { cache: 'no-store' });
      if (resp.ok) {
        const val = await resp.json();
        if (val && typeof val === 'object') {
          if (val.deviceBlocked === true) {
            markUserIdBlockedLocally(cleanCurrentId);
            return false;
          }
          if (val.referralRewardGiven) {
            if (typeof window !== 'undefined') localStorage.setItem(processedKey, 'true');
            return false;
          }
          if (!referredBy && val.referredBy) {
            referredBy = String(val.referredBy);
          }
          userName = val.name || userName;
          userUsername = val.username || userUsername;
        }
      }
    } catch {
      // Fallback to SDK below
    }

    if (!referredBy && rtdb && cleanCurrentId) {
      try {
        const snap = await get(ref(rtdb, `users/${cleanCurrentId}`));
        if (snap.exists()) {
          const val = snap.val();
          if (val.deviceBlocked === true) {
            markUserIdBlockedLocally(cleanCurrentId);
            return false;
          }
          if (val.referralRewardGiven) {
            if (typeof window !== 'undefined') localStorage.setItem(processedKey, 'true');
            return false;
          }
          if (!referredBy && val.referredBy) {
            referredBy = val.referredBy;
          }
          userName = val.name || userName;
          userUsername = val.username || userUsername;
        }
      } catch (e) {
        console.warn('Notice checking RTDB for referrer:', e);
      }
    }

    // 3. Check localStorage fallback & URL start param
    if (!referredBy && typeof window !== 'undefined') {
      referredBy =
        localStorage.getItem('rg_pending_referrer_id') ||
        sessionStorage.getItem('rg_pending_ref_code') ||
        new URLSearchParams(window.location.search).get('start');
    }

    if (!referredBy) return false;

    referredBy = String(referredBy)
      .replace(/^ref_/i, '')
      .replace(/^ref-/i, '')
      .replace(/^ref/i, '')
      .trim();

    if (!referredBy || !/^\d+$/.test(referredBy) || referredBy === cleanCurrentId) return false;
    if (boundTelegramId && String(boundTelegramId).trim() === referredBy) return false;

    // Mark as awarded immediately to prevent race conditions
    if (typeof window !== 'undefined') {
      localStorage.setItem(processedKey, 'true');
    }
    if (user) {
      user.referralRewardGiven = true;
      user.referredBy = referredBy;
      saveUsers(users);
    }

    const completedJoinerPatch = {
      referredBy,
      referralRewardGiven: true,
      hasScratchedFirstCard: true,
      referralCompletedAt: Date.now(),
    };

    fetch(`${RTDB_BASE_URL}/users/${cleanCurrentId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completedJoinerPatch),
    }).catch(() => {});

    if (rtdb && cleanCurrentId) {
      update(ref(rtdb, `users/${cleanCurrentId}`), completedJoinerPatch).catch(() => {});
    }

    // Award strictly +1 Scratch Card & +1 Friend to the Referrer in Firebase RTDB (NEVER direct cash!)
    let referrerSpins = 2;
    try {
      let refVal: any = null;
      try {
        const rResp = await fetch(`${RTDB_BASE_URL}/users/${referredBy}.json`, { cache: 'no-store' });
        if (rResp.ok) {
          refVal = await rResp.json();
        }
      } catch {
        // ignore
      }

      if (!refVal && rtdb) {
        const refSnap = await get(ref(rtdb, `users/${referredBy}`));
        if (refSnap.exists()) {
          refVal = refSnap.val();
        }
      }

      // Prevent circular referral reward (if referrer was referred by cleanCurrentId)
      if (refVal && String(refVal.referredBy || '').trim() === cleanCurrentId) {
        return false;
      }

      // Check if this joiner was already counted in referrals/{referredBy}/{cleanCurrentId} with completed_first_spin
      let alreadyCounted = false;
      try {
        const existRefResp = await fetch(`${RTDB_BASE_URL}/referrals/${referredBy}/${cleanCurrentId}.json`, {
          cache: 'no-store',
        });
        if (existRefResp.ok) {
          const existRefData = await existRefResp.json();
          if (existRefData && (existRefData.status === 'completed_first_spin' || existRefData.rewardGiven === true)) {
            alreadyCounted = true;
          }
        }
      } catch {
        // ignore
      }

      if (alreadyCounted) {
        return false;
      }

    if (!alreadyCounted) {
      if (refVal && typeof refVal === 'object') {
        referrerSpins = (Number(refVal.spins) || 0) + 1;
        const newFriends = (Number(refVal.friendsJoined) || 0) + 1;
        const newEarned = (Number(refVal.spinsEarned) || 0) + 1;

        const refPatch = {
          spins: referrerSpins,
          friendsJoined: newFriends,
          spinsEarned: newEarned,
        };

        await fetch(`${RTDB_BASE_URL}/users/${referredBy}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(refPatch),
        }).catch(() => {});

        if (rtdb) {
          await update(ref(rtdb, `users/${referredBy}`), refPatch).catch(() => {});
        }
      } else {
        const newReferrerDoc = {
          id: referredBy,
          telegramId: referredBy,
          name: `User #${referredBy.slice(-4)}`,
          spins: 2,
          friendsJoined: 1,
          spinsEarned: 2,
          balance: 0,
          createdAt: Date.now(),
          isVerified: true,
          deviceVerified: true,
          claimedWelcomeSpin: true,
        };
        await fetch(`${RTDB_BASE_URL}/users/${referredBy}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReferrerDoc),
        }).catch(() => {});

        if (rtdb) {
          await set(ref(rtdb, `users/${referredBy}`), newReferrerDoc).catch(() => {});
        }
      }

      // Record transaction
      const txId = `tx_${Date.now()}_ref_${cleanCurrentId}`;
      const txPayload = {
        id: txId,
        userId: referredBy,
        type: 'referral_bonus' as const,
        amount: 0,
        description: `Friend ${userName} (${cleanCurrentId}) completed 1st scratch! +1 Scratch Card awarded`,
        status: 'completed' as const,
        createdAt: Date.now(),
      };

      fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txPayload),
      }).catch(() => {});

      if (rtdb) {
        set(ref(rtdb, `transactions/${txId}`), txPayload).catch(() => {});
      }

      // Save referral log
      const refLogPayload = {
        joinerId: cleanCurrentId,
        name: userName,
        username: userUsername,
        timestamp: Date.now(),
        rewardGiven: true,
        status: 'completed_first_spin',
      };

      await fetch(`${RTDB_BASE_URL}/referrals/${referredBy}/${cleanCurrentId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refLogPayload),
      }).catch(() => {});

      if (rtdb) {
        await set(ref(rtdb, `referrals/${referredBy}/${cleanCurrentId}`), refLogPayload).catch(() => {});
      }

      // Also update referrer in local users array ONLY when not already counted
      const allCurrentUsers = getAllUsers();
      const localRefUser = allCurrentUsers.find(u => String(u.id).trim() === referredBy || String(u.telegramId).trim() === referredBy);
      if (localRefUser) {
        localRefUser.spins = referrerSpins;
        localRefUser.friendsJoined = (localRefUser.friendsJoined || 0) + 1;
        localRefUser.spinsEarned = (localRefUser.spinsEarned || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allCurrentUsers));
      }
    }
  } catch (e) {
    console.warn('Error crediting referrer in RTDB:', e);
  }

  // Send Telegram Notification to Referrer ONLY after friend completes 1st scratch (with Premium Animated Emojis)
  if (referredBy.match(/^\d+$/)) {
    const botTokens = [
      '8956392892:AAHHL_KxabHRt5_v3JYQGInzJhqNxDEUr5g',
      '8973201055:AAGiHa1ewSL0F_mG0v_f1WpMqK2lRySxSko',
      '8639853090:AAGSrArc6Xtm5309WpZeGih1H7evsvJstWE',
    ];
    let emojiMap: Record<string, string> = {
      '🎉': '5312486361243062266',
      '👥': '5312424912994963580',
      '🎁': '5312315739842026355',
      '🔥': '5312241539987020022',
      '✅': '5206607081334906820',
    };
    try {
      const emResp = await fetch(`${RTDB_BASE_URL}/bot_config/premium_emojis.json`);
      if (emResp.ok) {
        const savedEm = await emResp.json();
        if (savedEm && typeof savedEm === 'object') {
          emojiMap = { ...emojiMap, ...savedEm };
        }
      }
    } catch {
      // Use default custom_emoji_ids
    }
    const pe = (ch: string) =>
      emojiMap[ch] ? `<tg-emoji emoji-id="${emojiMap[ch]}">${ch}</tg-emoji>` : ch;

    const premiumAlertText = `${pe('🎉')} <b>1 Referral Join Successful! (+1 Scratch Card)</b>\n\n${pe('👥')} Aapke friend <b>${userName}</b> ne 1st scratch card complete kar liya hai!\n\n${pe('🎁')} <b>+1 Free Scratch Card</b> aapke account me add kar diya gaya hai!\n${pe('✅')} Available Scratch Cards: <b>${referrerSpins}</b>\n\nApp open karke scratch karein &amp; Win Up to ₹50! ${pe('🔥')}`;
    const plainAlertText = `🎉 <b>1 Referral Join Successful! (+1 Scratch Card)</b>\n\n👥 Aapke friend <b>${userName}</b> ne 1st scratch card complete kar liya hai!\n\n🎁 <b>+1 Free Scratch Card</b> aapke account me add kar diya gaya hai!\n✅ Available Scratch Cards: <b>${referrerSpins}</b>\n\nApp open karke scratch karein &amp; Win Up to ₹50! 🔥`;

    for (const token of botTokens) {
      try {
        const r1 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: Number(referredBy),
            text: premiumAlertText,
            parse_mode: 'HTML',
          }),
        });
        const d1 = await r1.json().catch(() => ({ ok: false }));
        if (!d1?.ok) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: Number(referredBy),
              text: plainAlertText,
              parse_mode: 'HTML',
            }),
          });
        }
        break;
      } catch (e) {
        // Continue to fallback token if any error
      }
    }
  }

    notifySubscribers('referral_completed');
    return true;
  } finally {
    activeReferralLocks.delete(cleanCurrentId);
  }
}

export function getReferralTransactions(userId: string): Transaction[] {
  const cleanId = String(userId).trim();
  return getAllTransactions()
    .filter((t) => String(t.userId).trim() === cleanId && t.type === 'referral_bonus')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export interface UserReferralEntry {
  id: string;
  joinerId?: string;
  name: string;
  username?: string;
  description: string;
  createdAt: number;
  rewardGiven: boolean;
  status?: string;
}

/**
 * Strips any trailing "(7858573555)" or "(@username)" from a referral name
 * so the same friend never appears twice (once with @username and once with numeric ID).
 */
function cleanReferralDisplayName(rawName?: string, fallbackId?: string): string {
  if (!rawName) {
    return fallbackId ? `User #${String(fallbackId).slice(-4)}` : 'Friend';
  }
  const stripped = rawName
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/\s*\(@[^)]+\)\s*$/g, '')
    .trim();
  return stripped || (fallbackId ? `User #${String(fallbackId).slice(-4)}` : 'Friend');
}

function deduplicateReferralEntries(entries: UserReferralEntry[], limit = 10): UserReferralEntry[] {
  const byJoinerKey = new Map<string, UserReferralEntry>();

  for (const item of entries) {
    const cleanName = cleanReferralDisplayName(item.name, item.joinerId);
    const normalizedItem: UserReferralEntry = {
      ...item,
      name: cleanName,
      username: item.username && !/^\d+$/.test(item.username) ? item.username.replace(/^@/, '') : undefined,
    };

    const jidKey = item.joinerId ? `id_${String(item.joinerId).trim()}` : '';
    const nameKey = `name_${cleanName.toLowerCase()}`;

    // Check if already exists by joinerId OR by identical display name within the referral list
    let existingKey: string | null = null;
    if (jidKey && byJoinerKey.has(jidKey)) {
      existingKey = jidKey;
    } else {
      for (const [k, v] of byJoinerKey.entries()) {
        if (
          (jidKey && v.joinerId && `id_${String(v.joinerId).trim()}` === jidKey) ||
          v.name.toLowerCase() === cleanName.toLowerCase()
        ) {
          existingKey = k;
          break;
        }
      }
    }

    if (!existingKey) {
      byJoinerKey.set(jidKey || nameKey, normalizedItem);
    } else {
      const prev = byJoinerKey.get(existingKey)!;
      // Merge: prefer rewardGiven = true, real username (not auto user_xxxx if real exists), and latest timestamp
      const bestUsername =
        prev.username && !prev.username.startsWith('user_')
          ? prev.username
          : normalizedItem.username || prev.username;
      const merged: UserReferralEntry = {
        ...prev,
        joinerId: prev.joinerId || normalizedItem.joinerId,
        name: prev.name.startsWith('User #') && !normalizedItem.name.startsWith('User #') ? normalizedItem.name : prev.name,
        username: bestUsername,
        rewardGiven: prev.rewardGiven || normalizedItem.rewardGiven,
        status: prev.rewardGiven || normalizedItem.rewardGiven ? 'completed_first_spin' : prev.status || normalizedItem.status,
        createdAt: Math.max(prev.createdAt || 0, normalizedItem.createdAt || 0),
      };
      byJoinerKey.set(existingKey, merged);
    }
  }

  const result = Array.from(byJoinerKey.values());
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result.slice(0, limit);
}

export function getUserLastReferrals(userId: string, limit = 10): UserReferralEntry[] {
  const cleanId = String(userId).trim();
  if (!cleanId) return [];

  const entries: UserReferralEntry[] = [];

  // 1. Check all users who have referredBy === cleanId
  const allUsers = getAllUsers();
  for (const u of allUsers) {
    if (u.referredBy && String(u.referredBy).trim() === cleanId) {
      const jid = String(u.id).trim();
      const cName = cleanReferralDisplayName(u.name, jid);
      entries.push({
        id: `ref_user_${jid}`,
        joinerId: jid,
        name: cName,
        username: u.username,
        description: cName,
        createdAt: u.referralCompletedAt || u.createdAt || Date.now(),
        rewardGiven: Boolean(u.referralRewardGiven),
        status: u.referralRewardGiven ? 'completed_first_spin' : 'pending_first_scratch',
      });
    }
  }

  // 2. Also include referral_bonus transactions for this user (extracting joinerId from "(7858573555)" if present)
  const refTxs = getReferralTransactions(cleanId);
  for (const tx of refTxs) {
    const idMatch = tx.description.match(/\((\d+)\)/) || tx.id.match(/_ref_(\d+)$/);
    const extractedJoinerId = idMatch ? idMatch[1] : undefined;
    const rawExtractedName = tx.description
      .replace(/^Friend\s+/i, '')
      .replace(/\s+(completed|joined).*$/i, '')
      .trim();
    const cName = cleanReferralDisplayName(rawExtractedName, extractedJoinerId);

    entries.push({
      id: tx.id,
      joinerId: extractedJoinerId,
      name: cName,
      description: tx.description,
      createdAt: tx.createdAt || Date.now(),
      rewardGiven: true,
      status: 'completed_first_spin',
    });
  }

  return deduplicateReferralEntries(entries, limit);
}

/**
 * Fetches a specific user's last 10 referrals directly from Firebase RTDB (`referrals/{userId}`)
 * and merges with local entries with strict deduplication so every friend is shown ONLY ONCE!
 */
export async function fetchUserLastReferralsFromRemote(
  userId: string,
  limit = 10
): Promise<UserReferralEntry[]> {
  const cleanId = String(userId).trim();
  if (!cleanId) return [];

  const localEntries = getUserLastReferrals(cleanId, limit);
  try {
    const resp = await fetch(`${RTDB_BASE_URL}/referrals/${cleanId}.json`, {
      cache: 'no-store',
    });
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data && typeof data === 'object') {
        const remoteEntries: UserReferralEntry[] = [];
        for (const [key, val] of Object.entries(data as Record<string, any>)) {
          if (val && typeof val === 'object') {
            const jid = String(val.joinerId || key).trim();
            const cName = cleanReferralDisplayName(val.name, jid);
            remoteEntries.push({
              id: `rtdb_ref_${jid}`,
              joinerId: jid,
              name: cName,
              username: val.username,
              description: cName,
              createdAt: Number(val.timestamp || val.createdAt || Date.now()),
              rewardGiven: val.status === 'completed_first_spin' || val.rewardGiven === true,
              status: val.status || (val.rewardGiven ? 'completed_first_spin' : 'pending_first_scratch'),
            });
          }
        }
        return deduplicateReferralEntries([...remoteEntries, ...localEntries], limit);
      }
    }
  } catch (err) {
    console.warn('fetchUserLastReferralsFromRemote notice:', err);
  }
  return localEntries;
}

export function simulateReferral(userId: string): { success: boolean; newSpins: number; friendsCount: number } {
  const users = getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, newSpins: 0, friendsCount: 0 };

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const friendName = `User #${randomDigits}`;

  user.friendsJoined = (user.friendsJoined || 0) + 1;
  user.spins = (user.spins || 0) + 1;
  user.spinsEarned = (user.spinsEarned || 0) + 1;
  saveUsers(users);

  addTransaction({
    userId,
    type: 'referral_bonus',
    amount: 0,
    description: `Friend ${friendName} joined! +1 Scratch Card awarded`,
    status: 'completed',
  });

  if (rtdb) {
    set(ref(rtdb, `referrals/${userId}/friend_${randomDigits}`), {
      joinerId: `friend_${randomDigits}`,
      name: friendName,
      timestamp: Date.now(),
    }).catch(() => {});
  }

  notifySubscribers('referral_simulated');

  return {
    success: true,
    newSpins: user.spins,
    friendsCount: user.friendsJoined,
  };
}
