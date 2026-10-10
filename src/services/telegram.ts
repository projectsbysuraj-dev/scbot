/**
 * Telegram WebApp Integration & Detection
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe?: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: string;
    hash?: string;
    start_param?: string;
  };
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function isTelegramEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

export function initTelegramApp(): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }
}

let sharedAudioCtx: AudioContext | null = null;
let lastScratchSoundTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playHapticSound(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'scratch'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'scratch') {
      // Throttle scratch sound so rapid pointermove events sound smooth and realistic
      const msNow = performance.now();
      if (msNow - lastScratchSoundTime < 45) return;
      lastScratchSoundTime = msNow;

      // Filtered noise burst simulating coin scratching metallic silver foil
      const duration = 0.045;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.35;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200 + Math.random() * 900, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
      return;
    }

    if (type === 'light') {
      // Crisp iOS-style tactile micro-tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.018);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
      return;
    }

    if (type === 'medium') {
      // Tactile button pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.028);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
      return;
    }

    if (type === 'heavy') {
      // Deep haptic thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      return;
    }

    if (type === 'success') {
      // Celebratory coin-win chime arpeggio (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.065;
        const noteDur = idx === notes.length - 1 ? 0.28 : 0.14;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + noteDur + 0.01);
      });
      return;
    }

    if (type === 'error') {
      // Double low warning buzz
      [0, 0.08].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + offset;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, startTime);
        osc.frequency.linearRampToValueAtTime(135, startTime + 0.06);

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.065);
      });
    }
  } catch {
    // Ignore audio context errors
  }
}

export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'scratch' = 'medium'
): void {
  // 1. Play realistic Web Audio haptic/scratch/win sound
  playHapticSound(type);

  // 2. Trigger Telegram native HapticFeedback if inside Telegram Mini App
  try {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'success' || type === 'error') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      } else if (type === 'scratch') {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  } catch {
    // Ignore fallback
  }

  // 3. Trigger browser vibration API on supported mobile devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (type === 'light' || type === 'scratch') {
        navigator.vibrate(8);
      } else if (type === 'medium') {
        navigator.vibrate(18);
      } else if (type === 'heavy') {
        navigator.vibrate(32);
      } else if (type === 'success') {
        navigator.vibrate([25, 45, 55]);
      } else if (type === 'error') {
        navigator.vibrate([40, 35, 40]);
      }
    }
  } catch {
    // Ignore fallback
  }
}

function cacheTelegramUser(user: TelegramUser): void {
  try {
    localStorage.setItem('rg_telegram_user_cache', JSON.stringify(user));
  } catch (e) {
    // Ignore
  }
}

export function getTelegramUser(): TelegramUser | null {
  if (typeof window === 'undefined') return null;

  // 1. Direct WebApp object from Telegram WebApp SDK
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    const u = window.Telegram.WebApp.initDataUnsafe.user;
    cacheTelegramUser(u);
    return u;
  }

  // 2. Parse from window.Telegram.WebApp.initData raw query string
  if (window.Telegram?.WebApp?.initData) {
    try {
      const params = new URLSearchParams(window.Telegram.WebApp.initData);
      const userRaw = params.get('user');
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as TelegramUser;
        if (parsed && parsed.id) {
          cacheTelegramUser(parsed);
          return parsed;
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 3. Parse from URL hash (#tgWebAppData=... or query params inside hash)
  try {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash);
      const tgData = hashParams.get('tgWebAppData');
      if (tgData) {
        const innerParams = new URLSearchParams(tgData);
        const userRaw = innerParams.get('user');
        if (userRaw) {
          const parsed = JSON.parse(userRaw) as TelegramUser;
          if (parsed && parsed.id) {
            cacheTelegramUser(parsed);
            return parsed;
          }
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  // 4. Parse from window.location.search (?tgWebAppData=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const tgData = searchParams.get('tgWebAppData');
    if (tgData) {
      const innerParams = new URLSearchParams(tgData);
      const userRaw = innerParams.get('user');
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as TelegramUser;
        if (parsed && parsed.id) {
          cacheTelegramUser(parsed);
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  // 5. Check explicit ?uid= parameter from bot verification link before falling back to cache
  let urlUid: string | null = null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    urlUid = searchParams.get('uid')?.trim() || null;
    if (!urlUid && window.location.hash) {
      const hashQuery = window.location.hash.includes('?')
        ? window.location.hash.split('?')[1]
        : window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashQuery);
      urlUid = hashParams.get('uid')?.trim() || null;
    }
  } catch {
    // Ignore
  }

  // 6. Fallback: check session/local storage cache (only if it matches urlUid when urlUid is present)
  try {
    const cached = localStorage.getItem('rg_telegram_user_cache');
    if (cached) {
      const parsed = JSON.parse(cached) as TelegramUser;
      if (parsed && parsed.id) {
        if (!urlUid || String(parsed.id) === urlUid) {
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  if (urlUid && /^\d+$/.test(urlUid)) {
    return {
      id: Number(urlUid),
      first_name: `User #${urlUid.slice(-4)}`,
    };
  }

  return null;
}

export function openExternalOrTelegramLink(url: string): void {
  if (typeof window !== 'undefined') {
    if (window.Telegram?.WebApp?.openTelegramLink && (url.includes('t.me') || url.startsWith('tg://'))) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}

/**
 * Extracts referral / start parameter from all possible Telegram WebApp & Web URLs:
 * 1. window.Telegram.WebApp.initDataUnsafe.start_param
 * 2. URL query parameters (?tgWebAppStartParam=..., ?startapp=..., ?ref=..., ?start=...)
 * 3. window.Telegram.WebApp.initData string
 * 4. URL hash (#tgWebAppData=... or #startapp=... or #ref=...)
 * 5. Session storage cache
 */
export function getTelegramReferralParam(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Direct Telegram WebApp SDK start_param
  try {
    const sdkParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (sdkParam) {
      const clean = sdkParam.trim();
      sessionStorage.setItem('rg_pending_ref_code', clean);
      return clean;
    }
  } catch {
    // Ignore
  }

  // 2. Query search params in window.location.search
  try {
    const search = new URLSearchParams(window.location.search);
    const fromSearch =
      search.get('tgWebAppStartParam') ||
      search.get('startapp') ||
      search.get('start_param') ||
      search.get('ref') ||
      search.get('start') ||
      search.get('referrer');

    if (fromSearch) {
      const clean = fromSearch.trim();
      sessionStorage.setItem('rg_pending_ref_code', clean);
      return clean;
    }
  } catch {
    // Ignore
  }

  // 3. Telegram initData raw query string
  try {
    if (window.Telegram?.WebApp?.initData) {
      const initParams = new URLSearchParams(window.Telegram.WebApp.initData);
      const fromInit = initParams.get('start_param') || initParams.get('startapp');
      if (fromInit) {
        const clean = fromInit.trim();
        sessionStorage.setItem('rg_pending_ref_code', clean);
        return clean;
      }
    }
  } catch {
    // Ignore
  }

  // 4. URL Hash (Telegram passes tgWebAppData in hash)
  try {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash);
      const tgWebAppData = hashParams.get('tgWebAppData');
      if (tgWebAppData) {
        const innerParams = new URLSearchParams(tgWebAppData);
        const fromInner = innerParams.get('start_param') || innerParams.get('startapp');
        if (fromInner) {
          const clean = fromInner.trim();
          sessionStorage.setItem('rg_pending_ref_code', clean);
          return clean;
        }
      }

      const directHash =
        hashParams.get('tgWebAppStartParam') ||
        hashParams.get('startapp') ||
        hashParams.get('start_param') ||
        hashParams.get('ref') ||
        hashParams.get('start');

      if (directHash) {
        const clean = directHash.trim();
        sessionStorage.setItem('rg_pending_ref_code', clean);
        return clean;
      }
    }
  } catch {
    // Ignore
  }

  // 5. Check cached session storage
  try {
    const pending = sessionStorage.getItem('rg_pending_ref_code');
    if (pending) {
      return pending.trim();
    }
  } catch {
    // Ignore
  }

  return null;
}
