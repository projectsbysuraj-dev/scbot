import { useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  ThemeSettings,
  UserProfile,
} from './types';
import {
  getCurrentUser,
  getStoredSettings,
  getStoredTheme,
  subscribeRealtime,
  recordPendingReferral,
  syncUserWithRemote,
  saveSingleUser,
} from './services/store';
import { initTelegramApp, getTelegramReferralParam } from './services/telegram';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { InviteScreen } from './components/InviteScreen';
import { WalletScreen } from './components/WalletScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminPortal } from './components/AdminPortal';
import { DeviceVerificationScreen } from './components/DeviceVerificationScreen';

function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  // If Telegram WebApp environment is active, never open admin route
  if (Boolean(window.Telegram?.WebApp?.initData)) return false;

  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  return (
    path === '/admin' ||
    path.startsWith('/admin') ||
    hash === '#/admin' ||
    hash.startsWith('#/admin') ||
    hash === '#admin' ||
    search.get('admin') === 'true' ||
    search.get('tab') === 'admin'
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute());
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [user, setUser] = useState<UserProfile>(getCurrentUser());
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [theme, setTheme] = useState<ThemeSettings>(getStoredTheme());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rg_dark_mode_v1') === 'true';
  });

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_dark_mode_v1', String(next));
      }
      return next;
    });
  }, []);
  const [showVerification, setShowVerification] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (checkIsAdminRoute()) return false;
    // App open hote hi direct open ho - device verification screen block nahi karega
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isExplicitVerify = search.get('verify') === 'true' || hash.includes('verify=true');
    return isExplicitVerify;
  });

  const handleNavigateToUserApp = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, '/') || '/';
        const search = new URLSearchParams(window.location.search);
        search.delete('admin');
        search.delete('tab');
        const searchStr = search.toString() ? `?${search.toString()}` : '';
        window.history.replaceState(null, '', `${cleanPath}${searchStr}`);
        if (window.location.hash.toLowerCase().includes('admin')) {
          window.location.hash = '';
        }
      } catch {
        window.location.hash = '';
      }
    }
    setIsAdminRoute(false);
  }, []);

  const handleNavigateToAdmin = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '#admin');
    }
    setIsAdminRoute(true);
  }, []);

  useEffect(() => {
    initTelegramApp();
    // Synchronize user immediately after Telegram WebApp initialization
    const initialUser = getCurrentUser();
    setUser(initialUser);

    const checkAndProcessReferral = (u: UserProfile) => {
      try {
        const refParam = getTelegramReferralParam();
        if (refParam) {
          recordPendingReferral(refParam, u.id);
        }
      } catch (e) {
        console.warn('Referral check notice:', e);
      }
    };

    // Run referral check immediately
    checkAndProcessReferral(initialUser);
    saveSingleUser(initialUser);

    // Re-check after Telegram WebApp finishes injecting (250ms)
    const tgTimer = setTimeout(() => {
      const freshUser = getCurrentUser();
      setUser(freshUser);
      saveSingleUser(freshUser);
      checkAndProcessReferral(freshUser);
      syncUserWithRemote(freshUser.id).then((fresh) => {
        if (fresh) setUser(fresh);
      });
    }, 250);

    // Initial remote profile sync
    syncUserWithRemote(initialUser.id).then((fresh) => {
      if (fresh) setUser(fresh);
    });

    // Auto-sync user balance & spins every 3.5 seconds
    const userSyncInterval = setInterval(() => {
      const current = getCurrentUser();
      syncUserWithRemote(current.id).then((fresh) => {
        if (fresh) setUser(fresh);
      });
    }, 3500);

    // 2. Listen to route / URL changes (popstate & hashchange)
    const handleUrlChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const isVerify = search.get('verify') === 'true' || hash.includes('verify=true');
      if (isVerify) {
        setShowVerification(true);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // 3. Subscribe to real-time events across all tabs, storage, and Firebase
    const unsubscribe = subscribeRealtime(() => {
      setUser(getCurrentUser());
      setSettings(getStoredSettings());
      setTheme(getStoredTheme());
    });

    return () => {
      clearTimeout(tgTimer);
      clearInterval(userSyncInterval);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------
  // Device Verification Screen (Matching Screenshot 3 & Anti-Switch Lock)
  // -------------------------------------------------------------
  if (showVerification) {
    return (
      <DeviceVerificationScreen
        user={user}
        settings={settings}
        referrerId={getTelegramReferralParam()}
        onContinue={() => setShowVerification(false)}
      />
    );
  }

  // -------------------------------------------------------------
  // Dedicated Admin Portal at /admin
  // -------------------------------------------------------------
  if (isAdminRoute) {
    return (
      <AdminPortal
        settings={settings}
        theme={theme}
        onNavigateToUserApp={handleNavigateToUserApp}
      />
    );
  }

  // -------------------------------------------------------------
  // User Panel: Clean Telegram Mini App (0 Admin traces)
  // -------------------------------------------------------------
  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-start transition-colors duration-300 overflow-x-hidden ${
        isDarkMode
          ? 'dark-mode bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#090d16] text-slate-100'
          : 'bg-gradient-to-b from-[#fbfbfa] via-[#f8f9fa] to-[#f1f3f6] text-slate-800'
      }`}
    >
      {/* Mobile Telegram App View Container */}
      <div
        className={`w-full max-w-md min-h-screen flex flex-col px-3 sm:px-4 ${
          activeTab === 'profile' ? 'pt-4' : 'pt-2'
        } pb-16 relative transition-colors duration-300 ${
          isDarkMode
            ? 'bg-transparent text-slate-100'
            : 'bg-gradient-to-b from-[#fbfbfa] via-[#f8f9fa] to-[#f1f3f6] text-slate-800'
        }`}
      >
        {/* Header (shown on Home, Invite, Wallet; hidden on Profile to match screenshot) */}
        {activeTab !== 'profile' && (
          <Header
            user={user}
            settings={settings}
            theme={theme}
            activeTab={activeTab}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab Views */}
        <main className={`flex-1 w-full ${activeTab === 'profile' ? 'mt-0' : 'mt-2'}`}>
          {activeTab === 'home' && (
            <HomeScreen
              user={user}
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />
          )}

          {activeTab === 'invite' && (
            <InviteScreen user={user} settings={settings} />
          )}

          {activeTab === 'wallet' && (
            <WalletScreen
              user={user}
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onSecretOpenAdmin={handleNavigateToAdmin}
            />
          )}
        </main>

        {/* Floating Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      </div>
    </div>
  );
}
