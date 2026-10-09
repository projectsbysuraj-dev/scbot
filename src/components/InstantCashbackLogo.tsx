import React from 'react';

interface InstantCashbackLogoProps {
  className?: string;
  size?: number | string;
}

export const InstantCashbackLogo: React.FC<InstantCashbackLogoProps> = ({
  className = 'w-16 h-16',
  size,
}) => {
  return (
    <svg
      className={`${className} filter drop-shadow-md shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Instant Cashback Emblem"
    >
      <defs>
        <radialGradient id="ic-back-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ic-badge-bg" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="ic-wallet-base" x1="40" y1="70" x2="160" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="35%" stopColor="#2563eb" />
          <stop offset="75%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="ic-wallet-inner" x1="60" y1="65" x2="140" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="ic-wallet-flap" x1="45" y1="90" x2="155" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="25%" stopColor="#3b82f6" />
          <stop offset="70%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="ic-note-grad-1" x1="0" y1="0" x2="70" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ic-note-grad-2" x1="0" y1="0" x2="75" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="ic-gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ic-gold-rim" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ic-arrow-grad" x1="20" y1="130" x2="175" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <linearGradient id="ic-banner-grad" x1="20" y1="150" x2="180" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#090d16" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
        <linearGradient id="ic-banner-gold-border" x1="20" y1="150" x2="180" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="url(#ic-back-glow)" />
      <circle cx="100" cy="100" r="88" fill="url(#ic-badge-bg)" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.5" />
      <circle cx="100" cy="100" r="84" stroke="url(#ic-gold-rim)" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 2" />
      <g transform="translate(62, 52) rotate(-22)">
        <rect x="0" y="0" width="56" height="32" rx="4" fill="url(#ic-note-grad-1)" stroke="#a7f3d0" strokeWidth="1" />
        <circle cx="28" cy="16" r="7.5" fill="#047857" opacity="0.3" stroke="#d1fae5" strokeWidth="0.8" />
        <text x="28" y="20" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="bold">₹</text>
      </g>
      <g transform="translate(94, 46) rotate(14)">
        <rect x="0" y="0" width="60" height="34" rx="4" fill="url(#ic-note-grad-2)" stroke="#d1fae5" strokeWidth="1" />
        <circle cx="30" cy="17" r="8" fill="#065f46" opacity="0.3" stroke="#ecfdf5" strokeWidth="0.8" />
        <text x="30" y="21.5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">₹</text>
      </g>
      <path d="M 44 86 C 44 76, 52 68, 62 68 L 138 68 C 148 68, 156 76, 156 86 L 156 138 C 156 148, 148 156, 138 156 L 62 156 C 52 156, 44 148, 44 138 Z" fill="url(#ic-wallet-base)" />
      <path d="M 52 74 L 148 74 C 152 74, 154 78, 152 82 L 144 100 L 56 100 L 48 82 C 46 78, 48 74, 52 74 Z" fill="url(#ic-wallet-inner)" />
      <path d="M 42 98 C 42 90, 48 84, 56 84 L 144 84 C 152 84, 158 90, 158 98 L 158 140 C 158 150, 150 158, 140 158 L 60 158 C 50 158, 42 150, 42 140 Z" fill="url(#ic-wallet-flap)" />
      <path d="M 46 100 L 154 100 M 46 154 L 154 154" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
      <circle cx="142" cy="120" r="7.5" fill="url(#ic-gold-rim)" />
      <circle cx="142" cy="120" r="5" fill="url(#ic-gold-grad)" />
      <path d="M 32 126 C 26 102, 34 76, 56 60 C 68 51, 84 46, 102 46 C 122 46, 142 53, 156 66" fill="none" stroke="url(#ic-arrow-grad)" strokeWidth="11" strokeLinecap="round" />
      <path d="M 148 52 L 174 68 L 148 84 L 154 68 Z" fill="url(#ic-gold-grad)" stroke="#b45309" strokeWidth="1" />
      <g transform="translate(142, 114)">
        <ellipse cx="14" cy="14" rx="18" ry="18" fill="url(#ic-gold-rim)" />
        <ellipse cx="14" cy="14" rx="15" ry="15" fill="url(#ic-gold-grad)" />
        <text x="14" y="20" textAnchor="middle" fill="#78350f" fontSize="16" fontWeight="900">₹</text>
      </g>
      <g transform="translate(24, 92)">
        <ellipse cx="12" cy="12" rx="13" ry="13" fill="url(#ic-gold-rim)" />
        <ellipse cx="12" cy="12" rx="10.5" ry="10.5" fill="url(#ic-gold-grad)" />
        <text x="12" y="16.5" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900">₹</text>
      </g>
      <path d="M 24 154 C 24 150, 28 146, 34 146 L 166 146 C 172 146, 176 150, 176 154 L 176 178 C 176 182, 172 186, 166 186 L 34 186 C 28 186, 24 182, 24 178 Z" fill="url(#ic-banner-grad)" stroke="url(#ic-banner-gold-border)" strokeWidth="1.8" />
      <text x="100" y="160" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="900" letterSpacing="2">★ INSTANT ★</text>
      <text x="100" y="176" textAnchor="middle" fill="url(#ic-gold-grad)" fontSize="13" fontWeight="900" letterSpacing="1">CASHBACK</text>
    </svg>
  );
};

export default InstantCashbackLogo;
