/**
 * Generates a complete, single-file HTML document (with all CSS & JS embedded)
 * containing both the User Telegram Mini App & Admin Control Panel
 * with Firebase Realtime Database integration readiness.
 */
export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Rohit Giveaway - Telegram Mini App</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
  <!-- Firebase Realtime Database & Auth SDKs -->
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-database-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
    .font-outfit { font-family: 'Outfit', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
    .animate-pulse-glow { animation: pulse-glow 3s infinite ease-in-out; }
  </style>
</head>
<body class="bg-gradient-to-b from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] min-h-screen text-slate-800 antialiased flex flex-col items-center justify-start pb-24">
  <!-- Container max-w-md matching Telegram Mini App standard view -->
  <div id="app" class="w-full max-w-md min-h-screen flex flex-col px-4 pt-3 relative">
    <!-- Top Header -->
    <header class="flex items-center justify-between py-2 mb-3">
      <div class="flex items-center gap-3">
        <!-- Instant Cashback Logo -->
        <svg class="w-13 h-13 filter drop-shadow-md flex-shrink-0" style="width: 52px; height: 52px;" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ic-back-glow-html" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4" />
              <stop offset="70%" stop-color="#0284c7" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#0369a1" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="ic-badge-bg-html" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#1e293b" />
              <stop offset="50%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="ic-wallet-base-html" x1="40" y1="70" x2="160" y2="155" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="35%" stop-color="#2563eb" />
              <stop offset="75%" stop-color="#1d4ed8" />
              <stop offset="100%" stop-color="#1e40af" />
            </linearGradient>
            <linearGradient id="ic-wallet-inner-html" x1="60" y1="65" x2="140" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#1e3a8a" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
            <linearGradient id="ic-wallet-flap-html" x1="45" y1="90" x2="155" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="25%" stop-color="#3b82f6" />
              <stop offset="70%" stop-color="#2563eb" />
              <stop offset="100%" stop-color="#1e40af" />
            </linearGradient>
            <linearGradient id="ic-note-grad-1-html" x1="0" y1="0" x2="70" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#34d399" />
              <stop offset="40%" stop-color="#10b981" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
            <linearGradient id="ic-note-grad-2-html" x1="0" y1="0" x2="75" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#6ee7b7" />
              <stop offset="50%" stop-color="#10b981" />
              <stop offset="100%" stop-color="#047857" />
            </linearGradient>
            <linearGradient id="ic-gold-grad-html" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="25%" stop-color="#fde047" />
              <stop offset="50%" stop-color="#f59e0b" />
              <stop offset="85%" stop-color="#d97706" />
              <stop offset="100%" stop-color="#b45309" />
            </linearGradient>
            <linearGradient id="ic-gold-rim-html" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#78350f" />
              <stop offset="30%" stop-color="#f59e0b" />
              <stop offset="70%" stop-color="#fef08a" />
              <stop offset="100%" stop-color="#b45309" />
            </linearGradient>
            <linearGradient id="ic-arrow-grad-html" x1="20" y1="130" x2="175" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="35%" stop-color="#f59e0b" />
              <stop offset="70%" stop-color="#eab308" />
              <stop offset="100%" stop-color="#fef08a" />
            </linearGradient>
            <linearGradient id="ic-banner-grad-html" x1="20" y1="150" x2="180" y2="185" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#090d16" />
              <stop offset="50%" stop-color="#1e293b" />
              <stop offset="100%" stop-color="#090d16" />
            </linearGradient>
            <linearGradient id="ic-banner-gold-border-html" x1="20" y1="150" x2="180" y2="185" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#d97706" />
              <stop offset="50%" stop-color="#fef08a" />
              <stop offset="100%" stop-color="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="94" fill="url(#ic-back-glow-html)" />
          <circle cx="100" cy="100" r="88" fill="url(#ic-badge-bg-html)" stroke="#38bdf8" stroke-width="2.5" stroke-opacity="0.5" />
          <circle cx="100" cy="100" r="84" stroke="url(#ic-gold-rim-html)" stroke-width="1.2" stroke-opacity="0.6" stroke-dasharray="3 2" />
          <g transform="translate(62, 52) rotate(-22)">
            <rect x="0" y="0" width="56" height="32" rx="4" fill="url(#ic-note-grad-1-html)" stroke="#a7f3d0" stroke-width="1" />
            <circle cx="28" cy="16" r="7.5" fill="#047857" opacity="0.3" stroke="#d1fae5" stroke-width="0.8" />
            <text x="28" y="20" text-anchor="middle" fill="#ecfdf5" font-size="11" font-weight="bold">₹</text>
          </g>
          <g transform="translate(94, 46) rotate(14)">
            <rect x="0" y="0" width="60" height="34" rx="4" fill="url(#ic-note-grad-2-html)" stroke="#d1fae5" stroke-width="1" />
            <circle cx="30" cy="17" r="8" fill="#065f46" opacity="0.3" stroke="#ecfdf5" stroke-width="0.8" />
            <text x="30" y="21.5" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">₹</text>
          </g>
          <path d="M 44 86 C 44 76, 52 68, 62 68 L 138 68 C 148 68, 156 76, 156 86 L 156 138 C 156 148, 148 156, 138 156 L 62 156 C 52 156, 44 148, 44 138 Z" fill="url(#ic-wallet-base-html)" />
          <path d="M 52 74 L 148 74 C 152 74, 154 78, 152 82 L 144 100 L 56 100 L 48 82 C 46 78, 48 74, 52 74 Z" fill="url(#ic-wallet-inner-html)" />
          <path d="M 42 98 C 42 90, 48 84, 56 84 L 144 84 C 152 84, 158 90, 158 98 L 158 140 C 158 150, 150 158, 140 158 L 60 158 C 50 158, 42 150, 42 140 Z" fill="url(#ic-wallet-flap-html)" />
          <path d="M 46 100 L 154 100 M 46 154 L 154 154" stroke="#93c5fd" stroke-width="1" stroke-dasharray="3 3" opacity="0.75" />
          <circle cx="142" cy="120" r="7.5" fill="url(#ic-gold-rim-html)" />
          <circle cx="142" cy="120" r="5" fill="url(#ic-gold-grad-html)" />
          <path d="M 32 126 C 26 102, 34 76, 56 60 C 68 51, 84 46, 102 46 C 122 46, 142 53, 156 66" fill="none" stroke="url(#ic-arrow-grad-html)" stroke-width="11" stroke-linecap="round" />
          <path d="M 148 52 L 174 68 L 148 84 L 154 68 Z" fill="url(#ic-gold-grad-html)" stroke="#b45309" stroke-width="1" />
          <g transform="translate(142, 114)">
            <ellipse cx="14" cy="14" rx="18" ry="18" fill="url(#ic-gold-rim-html)" />
            <ellipse cx="14" cy="14" rx="15" ry="15" fill="url(#ic-gold-grad-html)" />
            <text x="14" y="20" text-anchor="middle" fill="#78350f" font-size="16" font-weight="900">₹</text>
          </g>
          <g transform="translate(24, 92)">
            <ellipse cx="12" cy="12" rx="13" ry="13" fill="url(#ic-gold-rim-html)" />
            <ellipse cx="12" cy="12" rx="10.5" ry="10.5" fill="url(#ic-gold-grad-html)" />
            <text x="12" y="16.5" text-anchor="middle" fill="#78350f" font-size="12" font-weight="900">₹</text>
          </g>
          <path d="M 24 154 C 24 150, 28 146, 34 146 L 166 146 C 172 146, 176 150, 176 154 L 176 178 C 176 182, 172 186, 166 186 L 34 186 C 28 186, 24 182, 24 178 Z" fill="url(#ic-banner-grad-html)" stroke="url(#ic-banner-gold-border-html)" stroke-width="1.8" />
          <text x="100" y="160" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="900" letter-spacing="2">★ INSTANT ★</text>
          <text x="100" y="176" text-anchor="middle" fill="url(#ic-gold-grad-html)" font-size="13" font-weight="900" letter-spacing="1">CASHBACK</text>
        </svg>
        <div>
          <h1 id="app-title-display" class="font-outfit font-extrabold text-white text-lg tracking-tight leading-tight">Rohit Giveaway</h1>
          <p id="bot-username-display" class="text-[11px] font-bold text-sky-200 tracking-wider">@RohitGiveawayBot</p>
        </div>
      </div>
      <div class="flex items-center bg-white/20 backdrop-blur-md border border-white/40 rounded-full px-4 py-1.5 shadow-sm">
        <span class="font-outfit font-bold text-white text-base mr-1">₹</span>
        <span id="user-balance-top" class="font-outfit font-extrabold text-white text-base">0.00</span>
      </div>
    </header>

    <!-- Active Tab Screens -->
    <main id="main-content" class="flex-1 w-full"></main>

    <!-- Floating Bottom Navigation -->
    <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/95 backdrop-blur-lg rounded-full py-2 px-3 shadow-xl shadow-sky-950/20 flex items-center justify-around z-40 border border-white/60">
      <button onclick="switchTab('home')" id="nav-btn-home" class="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-sky-600 bg-sky-100 font-bold">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        <span class="text-[11px]">Home</span>
      </button>
      <button onclick="switchTab('invite')" id="nav-btn-invite" class="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-slate-500">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
        <span class="text-[11px]">Invite</span>
      </button>
      <button onclick="switchTab('wallet')" id="nav-btn-wallet" class="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-slate-500">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></svg>
        <span class="text-[11px]">Wallet</span>
      </button>
      <button onclick="switchTab('profile')" id="nav-btn-profile" class="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-slate-500">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <span class="text-[11px]">Profile</span>
      </button>
    </nav>
  </div>

  <script>
    // Embedded App State & Telegram Detection
    let tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }

    // Firebase Configuration from user
    const firebaseConfig = {
      apiKey: "AIzaSyDM1IlucIajIDR75L2t970weK8K2fJ1BQE",
      authDomain: "scratch-7d728.firebaseapp.com",
      databaseURL: "https://scratch-7d728-default-rtdb.firebaseio.com",
      projectId: "scratch-7d728",
      storageBucket: "scratch-7d728.firebasestorage.app",
      messagingSenderId: "62211978639",
      appId: "1:62211978639:web:e84305824045078a0907fa"
    };

    let rtdb = null;
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        rtdb = firebase.database();
        if (firebase.auth) {
          firebase.auth().signInAnonymously().catch(function(e) {
            console.log('Firebase anonymous auth notice:', e);
          });
        }
      }
    } catch(err) {
      console.warn("Firebase RTDB init notice:", err);
    }

    const tgUser = tg?.initDataUnsafe?.user || {
      id: 88491204,
      first_name: "Rohit",
      last_name: "User",
      username: "rohit_winner"
    };

    let currentUser = {
      id: String(tgUser.id),
      name: \`\${tgUser.first_name || 'Rohit'} \${tgUser.last_name || 'User'}\`.trim(),
      username: tgUser.username || 'rohit_user',
      balance: 0,
      spins: 1, // First spin free for everyone!
      friendsJoined: 0,
      spinsEarned: 1
    };

    let appSettings = {
      botUsername: "RohitGiveawayBot",
      telegramChannelUrl: "https://t.me/RohitGiveaway",
      appTitle: "Rohit Giveaway",
      spinWinAmount: 5,
      minWithdrawalLimit: 20,
      adminPin: "7777"
    };

    let withdrawals = [];
    let transactions = [];
    let activeTab = 'home';
    let isSpinning = false;
    let wheelRotation = 0;

    // Load from local storage
    try {
      const savedUser = localStorage.getItem('rg_user_' + currentUser.id);
      if (savedUser) currentUser = { ...currentUser, ...JSON.parse(savedUser) };
      const savedSettings = localStorage.getItem('rg_settings');
      if (savedSettings) appSettings = { ...appSettings, ...JSON.parse(savedSettings) };
      const savedWithdrawals = localStorage.getItem('rg_withdrawals');
      if (savedWithdrawals) withdrawals = JSON.parse(savedWithdrawals);
      const savedTxs = localStorage.getItem('rg_transactions');
      if (savedTxs) transactions = JSON.parse(savedTxs);
    } catch(e){}

    function saveState() {
      localStorage.setItem('rg_user_' + currentUser.id, JSON.stringify(currentUser));
      localStorage.setItem('rg_settings', JSON.stringify(appSettings));
      localStorage.setItem('rg_withdrawals', JSON.stringify(withdrawals));
      localStorage.setItem('rg_transactions', JSON.stringify(transactions));
      updateTopUI();

      if (rtdb) {
        try {
          rtdb.ref('users/' + currentUser.id).set(currentUser);
          rtdb.ref('settings').update(appSettings);
        } catch(e){}
      }
    }

    // Live Real-Time Firebase Listeners
    if (rtdb) {
      try {
        rtdb.ref('withdrawals').on('value', function(snapshot) {
          if (snapshot.exists()) {
            const data = snapshot.val();
            withdrawals = Object.values(data).sort(function(a, b) {
              return (b.createdAt || b.date || 0) > (a.createdAt || a.date || 0) ? 1 : -1;
            });
            localStorage.setItem('rg_withdrawals', JSON.stringify(withdrawals));
            if (document.getElementById('admin-modal')) {
              document.getElementById('admin-modal').remove();
              openAdminModal();
            }
          }
        });

        rtdb.ref('settings').on('value', function(snapshot) {
          if (snapshot.exists()) {
            appSettings = Object.assign({}, appSettings, snapshot.val());
            localStorage.setItem('rg_settings', JSON.stringify(appSettings));
            updateTopUI();
          }
        });

        rtdb.ref('users/' + currentUser.id).on('value', function(snapshot) {
          if (snapshot.exists()) {
            currentUser = Object.assign({}, currentUser, snapshot.val());
            localStorage.setItem('rg_user_' + currentUser.id, JSON.stringify(currentUser));
            updateTopUI();
            if (activeTab === 'wallet' || activeTab === 'profile' || activeTab === 'home') {
              renderTab();
            }
          }
        });
      } catch(e) {
        console.warn('Realtime listener error:', e);
      }
    }

    function updateTopUI() {
      const balEl = document.getElementById('user-balance-top');
      if (balEl) balEl.innerText = currentUser.balance.toFixed(2);
      const titleEl = document.getElementById('app-title-display');
      if (titleEl) titleEl.innerText = appSettings.appTitle || 'Rohit Giveaway';
      const botEl = document.getElementById('bot-username-display');
      if (botEl) botEl.innerText = '@' + (appSettings.botUsername || 'RohitGiveawayBot');
    }

    function switchTab(tab) {
      activeTab = tab;
      ['home', 'invite', 'wallet', 'profile'].forEach(t => {
        const btn = document.getElementById('nav-btn-' + t);
        if (t === tab) {
          btn.className = "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-sky-600 bg-sky-100 font-bold";
        } else {
          btn.className = "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all text-slate-500";
        }
      });
      renderTab();
    }

    function renderTab() {
      const container = document.getElementById('main-content');
      if (activeTab === 'home') renderHome(container);
      else if (activeTab === 'invite') renderInvite(container);
      else if (activeTab === 'wallet') renderWallet(container);
      else if (activeTab === 'profile') renderProfile(container);
    }

    function renderHome(c) {
      c.innerHTML = \`
        <!-- Hero Banner -->
        <div class="w-full bg-gradient-to-r from-white via-sky-50 to-cyan-100 rounded-3xl p-5 shadow-lg relative overflow-hidden mb-5">
          <div class="pr-20 z-10 relative">
            <span class="text-sky-600 font-extrabold text-sm tracking-wider uppercase block mb-1">... 1 REFER = 1 LUCKY SPIN</span>
            <p class="text-slate-700 text-xs font-semibold leading-relaxed mb-3">Invite your friends & win instant cash with guaranteed payout!</p>
            <button onclick="switchTab('invite')" class="bg-[#0369a1] hover:bg-[#0284c7] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md shadow-sky-900/20 active:scale-95 transition-all">
              <span>✈️ JOIN NOW</span>
              <span>→</span>
            </button>
          </div>
          <div class="absolute -right-2 top-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-tr from-sky-400 to-cyan-200 rounded-full flex items-center justify-center opacity-90 shadow-inner">
            <div class="w-20 h-20 bg-sky-500 rounded-full flex items-center justify-center shadow-lg text-white text-3xl">
              ✈️
            </div>
          </div>
        </div>

        <!-- Section Header -->
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-5 bg-sky-400 rounded-full"></span>
            <h2 class="font-outfit font-extrabold text-white text-lg tracking-tight">Lucky Spin Wheel</h2>
          </div>
          <span class="text-xs font-bold text-sky-200 uppercase tracking-wider">1 REFER = 1 SPIN</span>
        </div>

        <!-- Spin Wheel Card -->
        <div class="w-full bg-[#0a192f] border border-sky-900/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-950/80 border border-sky-400/30 rounded-full text-[11px] font-bold text-amber-300 mb-3">
            <span>✨ 100% GUARANTEED CASH WIN</span>
          </div>
          <h3 class="font-outfit font-black text-2xl text-white tracking-tight mb-1">Spin & Win Direct Cash</h3>
          <p class="text-slate-300 text-xs mb-4 max-w-xs">Refer your friends to get spins! Win instant real cash directly into your wallet.</p>

          <!-- Spins Available Capsule -->
          <div class="bg-[#071324] border border-sky-800/50 rounded-full px-4 py-1.5 flex items-center gap-3 mb-6">
            <span class="text-xs text-slate-300">Spins Available: <strong id="spins-count" class="text-sky-400 font-extrabold text-sm">\${currentUser.spins}</strong></span>
            <button onclick="switchTab('invite')" class="bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">+ Invite</button>
          </div>

          <!-- The Wheel -->
          <div class="relative w-64 h-64 my-2 flex items-center justify-center">
            <!-- Pin Pointer at Top -->
            <div class="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
              <div class="w-5 h-7 bg-red-500 rounded-b-full shadow-lg border-2 border-white"></div>
            </div>
            <!-- Rotating Wheel Container -->
            <div id="spin-wheel" class="w-full h-full rounded-full border-4 border-sky-400 shadow-2xl shadow-sky-500/20 overflow-hidden relative transition-transform duration-[4000ms] cubic-bezier(0.15, 0.9, 0.25, 1)" style="transform: rotate(0deg);">
              <svg viewBox="0 0 100 100" class="w-full h-full">
                <!-- 6 Slices: ₹100, ₹500, ₹5, ₹10, ₹20, ₹50 -->
                <path d="M50 50 L50 0 A50 50 0 0 1 93.3 25 Z" fill="#00d2ff"/>
                <path d="M50 50 L93.3 25 A50 50 0 0 1 93.3 75 Z" fill="#ff3366"/>
                <path d="M50 50 L93.3 75 A50 50 0 0 1 50 100 Z" fill="#0066ff"/>
                <path d="M50 50 L50 100 A50 50 0 0 1 6.7 75 Z" fill="#9933ff"/>
                <path d="M50 50 L6.7 75 A50 50 0 0 1 6.7 25 Z" fill="#e91e63"/>
                <path d="M50 50 L6.7 25 A50 50 0 0 1 50 0 Z" fill="#ff9900"/>
              </svg>
              <!-- Slice Labels -->
              <span class="absolute top-6 left-1/2 -translate-x-1/2 font-outfit font-black text-white text-xs drop-shadow">₹100</span>
              <span class="absolute top-16 right-6 font-outfit font-black text-white text-xs drop-shadow">₹500</span>
              <span class="absolute bottom-16 right-8 font-outfit font-black text-white text-xs drop-shadow">₹5</span>
              <span class="absolute bottom-6 left-1/2 -translate-x-1/2 font-outfit font-black text-white text-xs drop-shadow">₹10</span>
              <span class="absolute bottom-16 left-8 font-outfit font-black text-white text-xs drop-shadow">₹20</span>
              <span class="absolute top-16 left-6 font-outfit font-black text-white text-xs drop-shadow">₹50</span>
            </div>
            <!-- Center Spin Hub Button -->
            <button onclick="handleSpin()" class="absolute w-16 h-16 bg-white rounded-full shadow-2xl border-4 border-sky-400 z-20 flex items-center justify-center font-outfit font-black text-sky-600 text-sm tracking-wider active:scale-90 transition-transform">
              SPIN
            </button>
          </div>

          <!-- Big Blue Button: REFER FRIENDS TO GET SPINS -->
          <div class="w-full mt-4 flex flex-col items-center gap-2">
            <button onclick="switchTab('invite')" class="w-full bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-outfit font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-wider">
              <span class="text-base">🎯</span>
              <span>REFER FRIENDS TO GET SPINS</span>
            </button>
            <p class="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <span>💡</span>
              <span>1 Friend Invite via Bot = 1 Free Lucky Spin Chance</span>
            </p>
          </div>
        </div>

        <!-- How to Earn & Withdraw Section Card -->
        <div class="w-full bg-white rounded-3xl p-5 shadow-xl shadow-sky-950/10 border border-white mt-4 mb-4">
          <h3 class="font-outfit font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <span class="text-base">📋</span>
            <span>How to Earn &amp; Withdraw:</span>
          </h3>

          <div class="space-y-3.5">
            <!-- Step 1 -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full border-2 border-sky-400 bg-sky-50 text-sky-600 flex items-center justify-center font-outfit font-black text-xs shrink-0 mt-0.5 shadow-sm">
                1
              </div>
              <div>
                <h4 class="font-outfit font-black text-xs text-slate-800 leading-tight">
                  Share Your Telegram Bot Referral Link
                </h4>
                <p class="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                  Share your unique bot link with friends on Telegram
                </p>
              </div>
            </div>

            <div class="w-full h-px bg-slate-100"></div>

            <!-- Step 2 -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full border-2 border-sky-400 bg-sky-50 text-sky-600 flex items-center justify-center font-outfit font-black text-xs shrink-0 mt-0.5 shadow-sm">
                2
              </div>
              <div>
                <h4 class="font-outfit font-black text-xs text-slate-800 leading-tight">
                  Get 1 Spin per Referral
                </h4>
                <p class="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                  When your friend opens the bot mini app, you get +1 Spin
                </p>
              </div>
            </div>

            <div class="w-full h-px bg-slate-100"></div>

            <!-- Step 3 -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full border-2 border-sky-400 bg-sky-50 text-sky-600 flex items-center justify-center font-outfit font-black text-xs shrink-0 mt-0.5 shadow-sm">
                3
              </div>
              <div>
                <h4 class="font-outfit font-black text-xs text-slate-800 leading-tight">
                  Spin Wheel &amp; Win Cash
                </h4>
                <p class="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                  Spin the wheel to win real wallet cash every time
                </p>
              </div>
            </div>

            <div class="w-full h-px bg-slate-100"></div>

            <!-- Step 4 -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full border-2 border-sky-400 bg-sky-50 text-sky-600 flex items-center justify-center font-outfit font-black text-xs shrink-0 mt-0.5 shadow-sm">
                4
              </div>
              <div>
                <h4 class="font-outfit font-black text-xs text-slate-800 leading-tight">
                  Instant Withdrawal (Min ₹\${appSettings.minWithdrawalLimit})
                </h4>
                <p class="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                  Direct payout to your Bank Account or UPI ID
                </p>
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    function handleSpin() {
      if (isSpinning) return;
      if (currentUser.spins <= 0) {
        alert("Oops! You have 0 spins available. Refer friends to get free spins!");
        switchTab('invite');
        return;
      }

      isSpinning = true;
      currentUser.spins--;
      saveState();
      document.getElementById('spins-count').innerText = currentUser.spins;

      // Guaranteed Win Logic: ALWAYS strictly ₹5 every single spin!
      const winAmount = 5;
      const naturalJitter = Math.floor(Math.random() * 12) - 6;
      const targetSliceAngle = 210 + naturalJitter;
      const fullSpins = (5 + Math.floor(Math.random() * 2)) * 360;
      const currentModulo = wheelRotation % 360;
      const forwardDistance = (targetSliceAngle - currentModulo + 360) % 360;
      wheelRotation += fullSpins + (forwardDistance === 0 ? 360 : forwardDistance);

      const wheel = document.getElementById('spin-wheel');
      if (wheel) wheel.style.transform = \`rotate(\${wheelRotation}deg)\`;

      setTimeout(() => {
        isSpinning = false;
        currentUser.balance += winAmount;
        transactions.unshift({
          id: 'tx_' + Date.now(),
          type: 'spin_win',
          amount: winAmount,
          description: 'Won ₹' + winAmount + ' from Lucky Spin!',
          status: 'completed',
          date: new Date().toLocaleTimeString()
        });
        saveState();
        if (window.confetti) {
          confetti({ particleCount: 85, spread: 80, origin: { y: 0.6 } });
        }
        alert("🎉 Congratulations! You won ₹" + winAmount + " directly added to your balance!");
        renderTab();
      }, 4200);
    }

    function renderInvite(c) {
      const botUrl = \`https://t.me/\${appSettings.botUsername}?start=ref_\${currentUser.id}\`;
      c.innerHTML = \`
        <div class="w-full bg-gradient-to-br from-blue-600 to-sky-500 rounded-3xl p-6 text-white text-center shadow-lg mb-4">
          <div class="text-4xl mb-2">🤝</div>
          <h2 class="font-outfit font-black text-2xl mb-1">Invite & Get Free Spins</h2>
          <p class="text-sky-100 text-xs">Get 1 Free Lucky Spin for every friend who joins via your Telegram Bot referral link!</p>
        </div>

        <div class="w-full bg-white rounded-3xl p-5 shadow-lg mb-4 text-left border border-slate-100">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">YOUR BOT REFERRAL LINK</span>
          <div class="border-2 border-dashed border-sky-400 bg-sky-50/50 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4">
            <span class="text-xs font-semibold text-sky-700 truncate">\${botUrl}</span>
            <button onclick="navigator.clipboard.writeText('\${botUrl}'); alert('Referral link copied!');" class="bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95">COPY</button>
          </div>
          <button onclick="window.open('https://t.me/share/url?url=' + encodeURIComponent('\${botUrl}') + '&text=' + encodeURIComponent('Join Rohit Giveaway & Spin to win free real cash!'), '_blank')" class="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <span>✈️ Invite Friends on Telegram 🚀</span>
          </button>
          <button onclick="simulateInvite()" class="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl border border-slate-200">
            🧪 Simulate 1 Referral (+1 Spin Test)
          </button>
        </div>

        <div class="flex items-center gap-2 mb-3 px-1">
          <span class="w-1.5 h-5 bg-sky-400 rounded-full"></span>
          <h2 class="font-outfit font-extrabold text-white text-lg">Referral Statistics</h2>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white rounded-2xl p-4 text-center shadow-md">
            <span class="font-outfit font-black text-2xl text-sky-600 block">\${currentUser.friendsJoined}</span>
            <span class="text-xs text-slate-500 font-semibold">Friends Joined</span>
          </div>
          <div class="bg-white rounded-2xl p-4 text-center shadow-md">
            <span class="font-outfit font-black text-2xl text-sky-600 block">\${currentUser.spinsEarned}</span>
            <span class="text-xs text-slate-500 font-semibold">Spins Earned</span>
          </div>
        </div>
      \`;
    }

    function simulateInvite() {
      currentUser.friendsJoined++;
      currentUser.spins++;
      currentUser.spinsEarned++;
      saveState();
      alert("✅ 1 Friend joined via referral! +1 Lucky Spin added.");
      renderTab();
    }

    function renderWallet(c) {
      c.innerHTML = \`
        <div class="w-full bg-[#0a192f] border border-sky-900/50 rounded-3xl p-6 text-white shadow-2xl mb-4 relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-400 tracking-wider uppercase">AVAILABLE BALANCE</span>
            <span class="text-[11px] font-bold text-sky-300 bg-sky-950 px-2.5 py-1 rounded-full border border-sky-800">Min ₹\${appSettings.minWithdrawalLimit} Payout</span>
          </div>
          <h2 class="font-outfit font-black text-4xl text-sky-400 mb-2">₹ \${currentUser.balance.toFixed(2)}</h2>
          <p class="text-xs text-slate-400 mb-5">Instant 100% Payout via Bank Account & UPI</p>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="openWithdrawModal()" class="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs py-3 rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 active:scale-95">
              <span>⚡ Withdraw Cash</span>
            </button>
            <button onclick="switchTab('home')" class="bg-sky-950/80 hover:bg-sky-900 text-sky-200 font-bold text-xs py-3 rounded-2xl border border-sky-800 flex items-center justify-center gap-1.5 active:scale-95">
              <span>🎡 Go to Spin</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 mb-3 px-1">
          <span class="w-1.5 h-5 bg-sky-400 rounded-full"></span>
          <h2 class="font-outfit font-extrabold text-white text-lg">Recent Transactions</h2>
        </div>
        <div id="tx-list" class="space-y-2">
          \${transactions.length === 0 ? \`
            <div class="p-8 text-center text-sky-100 text-xs">
              No transactions yet. Refer friends on Telegram to get spins & earn!
            </div>
          \` : transactions.map(t => \`
            <div class="bg-white rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
              <div>
                <strong class="text-xs font-bold text-slate-800 block">\${t.description}</strong>
                <span class="text-[10px] text-slate-400">\${t.date || 'Today'}</span>
              </div>
              <span class="font-outfit font-black text-sm \${t.amount >= 0 ? 'text-emerald-600' : 'text-slate-800'}">
                \${t.amount >= 0 ? '+' : ''}₹\${Math.abs(t.amount)}
              </span>
            </div>
          \`).join('')}
        </div>
      \`;
    }

    function renderProfile(c) {
      c.innerHTML = \`
        <div class="w-full bg-white rounded-3xl p-5 shadow-lg mb-5 flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-sky-300 shadow-md flex items-center justify-center shrink-0 bg-slate-900">
            <img src="/images/robot_avatar.jpg" alt="Robot Avatar" class="w-full h-full object-cover rounded-2xl" onerror="this.onerror=null;this.parentElement.innerHTML='🤖';" />
          </div>
          <div>
            <h2 class="font-outfit font-black text-lg text-slate-800 leading-tight">\${currentUser.name}</h2>
            <p class="text-xs font-semibold text-slate-500 mb-1">User ID: #\${currentUser.id}</p>
            <span class="inline-block bg-sky-100 text-sky-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wide">VERIFIED TELEGRAM USER</span>
          </div>
        </div>

        <div class="flex items-center gap-2 mb-3 px-1">
          <span class="w-1.5 h-5 bg-sky-400 rounded-full"></span>
          <h2 class="font-outfit font-extrabold text-white text-lg">Quick Actions</h2>
        </div>

        <div class="bg-white rounded-3xl p-2 shadow-lg divide-y divide-slate-100">
          <button onclick="switchTab('home')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <span class="text-xs font-bold text-slate-700">🎡 Lucky Spin Wheel</span>
            <span class="text-slate-400 text-sm">›</span>
          </button>
          <button onclick="switchTab('invite')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <span class="text-xs font-bold text-slate-700">🤝 Refer Friends (1 Refer = 1 Spin)</span>
            <span class="text-slate-400 text-sm">›</span>
          </button>
          <button onclick="switchTab('wallet')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <span class="text-xs font-bold text-slate-700">💸 Withdraw Cash (Bank / UPI)</span>
            <span class="text-slate-400 text-sm">›</span>
          </button>
          <button onclick="window.open('\${appSettings.telegramChannelUrl}', '_blank')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <span class="text-xs font-bold text-slate-700">💬 Official Telegram Channel</span>
            <span class="text-slate-400 text-sm">›</span>
          </button>
          <button onclick="window.open('https://t.me/lakhsmiiiii', '_blank')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-700">🚀 Contact for cheap bot website app creation</span>
              <span class="text-[11px] font-semibold text-sky-600">@lakhsmiiiii</span>
            </div>
            <span class="text-slate-400 text-sm">›</span>
          </button>
          <button onclick="window.open('https://t.me/Rohit79041', '_blank')" class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-2xl">
            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-700">🆘 Any problem dm kro</span>
              <span class="text-[11px] font-semibold text-amber-600">@Rohit79041</span>
            </div>
            <span class="text-slate-400 text-sm">›</span>
          </button>
        </div>
      \`;
    }

    function openWithdrawModal() {
      const amount = prompt(\`Enter withdrawal amount (Min ₹\${appSettings.minWithdrawalLimit}, Balance: ₹\${currentUser.balance}):\`);
      if (!amount) return;
      const num = parseFloat(amount);
      if (isNaN(num) || num < appSettings.minWithdrawalLimit) {
        alert(\`Minimum withdrawal amount is ₹\${appSettings.minWithdrawalLimit}\`);
        return;
      }
      if (num > currentUser.balance) {
        alert("Insufficient balance!");
        return;
      }
      const upi = prompt("Enter your UPI ID (e.g. mobile@upi):");
      if (!upi) return;

      currentUser.balance -= num;
      const wId = 'w_' + Date.now();
      const newWithdrawal = {
        id: wId,
        userId: currentUser.id,
        userName: currentUser.name,
        amount: num,
        method: 'upi',
        upiId: upi,
        status: 'pending',
        date: new Date().toLocaleString(),
        createdAt: Date.now()
      };
      withdrawals.unshift(newWithdrawal);
      transactions.unshift({
        id: 'tx_' + Date.now(),
        type: 'withdrawal',
        amount: -num,
        description: 'Withdrawal to UPI: ' + upi,
        status: 'pending',
        date: new Date().toLocaleTimeString(),
        createdAt: Date.now()
      });
      saveState();

      if (rtdb) {
        try {
          rtdb.ref('withdrawals/' + wId).set(newWithdrawal);
        } catch(e){}
      }

      alert("✅ Withdrawal request submitted! It will appear in Admin Panel for instant approval.");
      renderTab();
    }

    function openAdminModal() {
      const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
      let html = \`
        <div id="admin-modal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div class="bg-white w-full max-w-md rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div class="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3"></div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-outfit font-black text-slate-800 text-lg flex items-center gap-1.5">
                <span>🛡️ Admin Control Panel</span>
              </h3>
              <button onclick="document.getElementById('admin-modal').remove()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">✕</button>
            </div>
            <p class="text-xs text-slate-500 mb-4">Manage Withdrawals, Theme Colors, Spins & Bot Settings</p>

            <div class="border-t border-slate-100 pt-3">
              <h4 class="font-bold text-xs text-slate-700 mb-2">User Withdrawal Requests (\${pendingCount} Pending)</h4>
              \${withdrawals.length === 0 ? \`
                <div class="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl mb-4">No withdrawal requests yet.</div>
              \` : withdrawals.map(w => \`
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2 flex items-center justify-between">
                  <div>
                    <strong class="text-xs text-slate-800 block">\${w.userName} (#\${w.userId})</strong>
                    <span class="text-xs text-sky-600 font-bold">₹\${w.amount}</span> • <span class="text-[11px] text-slate-500">\${w.method}: \${w.upiId || w.accountNumber}</span>
                    <div class="text-[10px] uppercase font-bold \${w.status === 'pending' ? 'text-amber-500' : w.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}">\${w.status}</div>
                  </div>
                  \${w.status === 'pending' ? \`
                    <div class="flex items-center gap-1">
                      <button onclick="adminAction('\${w.id}', 'approve')" class="bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg">Approve</button>
                      <button onclick="adminAction('\${w.id}', 'reject')" class="bg-red-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg">Reject</button>
                    </div>
                  \` : ''}
                </div>
              \`).join('')}

              <h4 class="font-bold text-xs text-slate-700 mt-4 mb-2">Bot & App Settings</h4>
              <div class="space-y-2 mb-4">
                <input id="set-title" value="\${appSettings.appTitle}" placeholder="App Title" class="w-full text-xs p-2.5 border rounded-xl" />
                <input id="set-bot" value="\${appSettings.botUsername}" placeholder="Bot Username" class="w-full text-xs p-2.5 border rounded-xl" />
                <input id="set-win" type="number" value="\${appSettings.spinWinAmount}" placeholder="Spin Win (₹)" class="w-full text-xs p-2.5 border rounded-xl" />
                <input id="set-min" type="number" value="\${appSettings.minWithdrawalLimit}" placeholder="Min Withdraw Limit (₹)" class="w-full text-xs p-2.5 border rounded-xl" />
                <button onclick="saveAdminSettings()" class="w-full bg-sky-600 text-white font-bold text-xs py-2.5 rounded-xl">SAVE ALL SETTINGS 💾</button>
              </div>

              <h4 class="font-bold text-xs text-slate-700 mt-4 mb-2">Add Spins / Balance to User</h4>
              <div class="grid grid-cols-2 gap-2 mb-4">
                <button onclick="adminAddSpins(5)" class="bg-sky-100 text-sky-700 font-bold text-xs py-2 rounded-xl">+5 Free Spins</button>
                <button onclick="adminAddBalance(50)" class="bg-emerald-100 text-emerald-700 font-bold text-xs py-2 rounded-xl">+₹50 Balance</button>
              </div>
            </div>
          </div>
        </div>
      \`;
      document.body.insertAdjacentHTML('beforeend', html);
    }

    function adminAction(id, act) {
      const item = withdrawals.find(w => w.id === id);
      if (!item) return;
      if (act === 'approve') {
        item.status = 'approved';
        item.updatedAt = Date.now();
        if (rtdb) {
          try { rtdb.ref('withdrawals/' + id).update({ status: 'approved', updatedAt: Date.now() }); } catch(e){}
        }
        alert("✅ Withdrawal approved!");
      } else {
        item.status = 'rejected';
        item.updatedAt = Date.now();
        currentUser.balance += item.amount; // Refund
        if (rtdb) {
          try {
            rtdb.ref('withdrawals/' + id).update({ status: 'rejected', updatedAt: Date.now() });
            rtdb.ref('users/' + item.userId + '/balance').set(currentUser.balance);
          } catch(e){}
        }
        alert("❌ Withdrawal rejected and money refunded!");
      }
      saveState();
      document.getElementById('admin-modal')?.remove();
      openAdminModal();
      renderTab();
    }

    function saveAdminSettings() {
      const titleInput = document.getElementById('set-title');
      const botInput = document.getElementById('set-bot');
      const winInput = document.getElementById('set-win');
      const minInput = document.getElementById('set-min');
      if (titleInput) appSettings.appTitle = titleInput.value.trim() || 'Rohit Giveaway';
      if (botInput) appSettings.botUsername = botInput.value.replace(/^@/, '').trim() || 'RohitGiveawayBot';
      if (winInput) appSettings.spinWinAmount = Number(winInput.value) || 5;
      if (minInput) appSettings.minWithdrawalLimit = Number(minInput.value) || 20;
      saveState();
      updateTopUI();
      alert("✅ Settings saved instantly! Updated in real time across all user screens and Firebase.");
      document.getElementById('admin-modal')?.remove();
      renderTab();
    }

    function adminAddSpins(count) {
      currentUser.spins += count;
      currentUser.spinsEarned += count;
      saveState();
      alert(\`⚡ Added \${count} spins to user!\`);
      renderTab();
    }

    function adminAddBalance(amt) {
      currentUser.balance += amt;
      saveState();
      alert(\`⚡ Added ₹\${amt} to user balance!\`);
      renderTab();
    }

    // Initialize App
    updateTopUI();
    renderTab();
  </script>
</body>
</html>`;
}
