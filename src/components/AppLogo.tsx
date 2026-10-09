import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'w-[54px] h-[54px]',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Scratch The Win Official Emblem"
    >
      <defs>
        {/* Outer Gold Ring Metallic Gradient */}
        <linearGradient id="stw-gold-rim" x1="40" y1="20" x2="360" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7AD" />
          <stop offset="22%" stopColor="#FFD026" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="78%" stopColor="#FFAE00" />
          <stop offset="100%" stopColor="#FFF085" />
        </linearGradient>

        {/* Inner Gold Bevel Gradient */}
        <linearGradient id="stw-gold-inner" x1="60" y1="360" x2="340" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#FFE46B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Deep Emerald Green Background Radial */}
        <radialGradient id="stw-emerald-bg" cx="200" cy="185" r="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="55%" stopColor="#065F46" />
          <stop offset="100%" stopColor="#022C22" />
        </radialGradient>

        {/* Green Ribbon Gradient */}
        <linearGradient id="stw-green-ribbon" x1="30" y1="200" x2="370" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="25%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#15803D" />
          <stop offset="75%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Golden Scratch Ticket Frame */}
        <linearGradient id="stw-ticket-gold" x1="95" y1="60" x2="275" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF380" />
          <stop offset="30%" stopColor="#FFB800" />
          <stop offset="70%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Silver Scratched Foil Gradient */}
        <linearGradient id="stw-silver-foil" x1="120" y1="80" x2="255" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E2E8F0" />
          <stop offset="80%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* 3D Gold Coin Gradient */}
        <linearGradient id="stw-coin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF8A6" />
          <stop offset="35%" stopColor="#FFD000" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Crown Gold Gradient */}
        <linearGradient id="stw-crown-grad" x1="165" y1="150" x2="235" y2="205" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9A6" />
          <stop offset="40%" stopColor="#FFD000" />
          <stop offset="80%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* "SCRATCH" White-Cream 3D Face Gradient */}
        <linearGradient id="stw-scratch-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        {/* "SCRATCH" Golden-Orange 3D Extrusion */}
        <linearGradient id="stw-scratch-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>

        {/* "THE" Silver Metallic Gradient */}
        <linearGradient id="stw-the-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* "WIN" Radiant Gold 3D Gradient */}
        <linearGradient id="stw-win-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFB5" />
          <stop offset="28%" stopColor="#FFE121" />
          <stop offset="65%" stopColor="#FF9E00" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* "WIN" Deep Amber 3D Bevel */}
        <linearGradient id="stw-win-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="55%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>

        {/* Heavy Drop Shadow */}
        <filter id="stw-drop-shadow" x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.85" />
        </filter>
      </defs>

      {/* 1. CIRCULAR EMERALD & GOLD MEDALLION BASE */}
      <circle cx="200" cy="196" r="182" fill="#031B14" />
      <circle cx="200" cy="196" r="172" fill="url(#stw-emerald-bg)" />

      {/* Inner Emerald Glow Ring */}
      <circle
        cx="200"
        cy="196"
        r="156"
        fill="none"
        stroke="#22C55E"
        strokeWidth="2"
        opacity="0.35"
      />

      {/* Double Metallic Gold Medallion Rim */}
      <circle
        cx="200"
        cy="196"
        r="172"
        fill="none"
        stroke="url(#stw-gold-inner)"
        strokeWidth="15"
      />
      <circle
        cx="200"
        cy="196"
        r="172"
        fill="none"
        stroke="url(#stw-gold-rim)"
        strokeWidth="9"
      />
      <circle cx="200" cy="196" r="163" fill="none" stroke="#78350F" strokeWidth="2.5" />

      {/* 2. BACKGROUND CONFETTI & FLOATING GOLD COINS */}
      {/* Top-Left Tilted Rupee Coin */}
      <g transform="translate(142, 66) rotate(-25)" filter="url(#stw-drop-shadow)">
        <ellipse cx="0" cy="5" rx="28" ry="22" fill="#B45309" />
        <ellipse cx="0" cy="0" rx="28" ry="22" fill="url(#stw-coin-grad)" stroke="#FEF08A" strokeWidth="2" />
        <ellipse cx="0" cy="0" rx="21" ry="16" fill="none" stroke="#D97706" strokeWidth="1.5" />
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="#92400E"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="22"
        >
          ₹
        </text>
      </g>

      {/* Top-Right Tilted Rupee Coin */}
      <g transform="translate(298, 82) rotate(32)" filter="url(#stw-drop-shadow)">
        <ellipse cx="0" cy="5" rx="26" ry="20" fill="#B45309" />
        <ellipse cx="0" cy="0" rx="26" ry="20" fill="url(#stw-coin-grad)" stroke="#FEF08A" strokeWidth="2" />
        <ellipse cx="0" cy="0" rx="19" ry="14" fill="none" stroke="#D97706" strokeWidth="1.5" />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fill="#92400E"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="20"
        >
          ₹
        </text>
      </g>

      {/* Green Curved Ribbon Behind Ticket */}
      <path
        d="M 54,132 C 62,92 98,96 112,126 C 88,120 72,135 64,154 Z"
        fill="#16A34A"
        stroke="#4ADE80"
        strokeWidth="1.5"
      />

      {/* 3. CENTER TILTED GOLDEN SCRATCH TICKET WITH SILVER FOIL & ₹ */}
      <g transform="translate(192, 128) rotate(-16)" filter="url(#stw-drop-shadow)">
        {/* Ticket Outer Shadow Base */}
        <rect x="-88" y="-56" width="176" height="114" rx="10" fill="#7C2D12" />

        {/* Ticket Golden Body */}
        <rect
          x="-88"
          y="-60"
          width="176"
          height="114"
          rx="10"
          fill="url(#stw-ticket-gold)"
          stroke="#FEF08A"
          strokeWidth="3"
        />

        {/* Ticket Inner Orange Textured Frame */}
        <rect
          x="-76"
          y="-50"
          width="152"
          height="94"
          rx="6"
          fill="#EA580C"
          stroke="#FDE047"
          strokeWidth="1.5"
        />

        {/* Scalloped Perforation Notches on Left Edge */}
        <circle cx="-88" cy="-34" r="6.5" fill="#064E3B" />
        <circle cx="-88" cy="-12" r="6.5" fill="#064E3B" />
        <circle cx="-88" cy="10" r="6.5" fill="#064E3B" />
        <circle cx="-88" cy="32" r="6.5" fill="#064E3B" />

        {/* Diagonal Scratched Silver Foil Area */}
        <path
          d="M -62,-22 L 52,-44 L 38,-18 L 66,-26 L 44,4 L 68,2 L 32,32 L 54,30 L -38,42 L -22,16 L -58,24 L -32,-4 L -66,2 Z"
          fill="url(#stw-silver-foil)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />

        {/* Bold Dark-Slate Indian Rupee Symbol (₹) in Center of Scratch Foil */}
        <text
          x="2"
          y="18"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="68"
        >
          ₹
        </text>
      </g>

      {/* 4. LEFT FOREGROUND 3D GOLD RUPEE COIN */}
      <g transform="translate(76, 162) rotate(-18)" filter="url(#stw-drop-shadow)">
        <ellipse cx="0" cy="7" rx="36" ry="29" fill="#92400E" />
        <ellipse cx="0" cy="0" rx="36" ry="29" fill="url(#stw-coin-grad)" stroke="#FEF08A" strokeWidth="2.5" />
        <ellipse cx="0" cy="0" rx="27" ry="21" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
        <text
          x="0"
          y="9"
          textAnchor="middle"
          fill="#78350F"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="28"
        >
          ₹
        </text>
      </g>

      {/* 5. RIGHT FOREGROUND 3D WHITE GIFT BOX WITH ORANGE RIBBON + COIN */}
      <g transform="translate(310, 166) rotate(18)" filter="url(#stw-drop-shadow)">
        {/* Gift Box Lower Body */}
        <rect x="-36" y="-8" width="72" height="44" rx="6" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* Orange Vertical Ribbon on Box */}
        <rect x="-9" y="-8" width="18" height="44" fill="#EA580C" />
        {/* Gift Box White Lid */}
        <rect x="-40" y="-22" width="80" height="18" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Orange Ribbon on Lid */}
        <rect x="-10" y="-22" width="20" height="18" fill="#F97316" />
        {/* 3D Orange Bow Loops on Top */}
        <path
          d="M 0,-22 C -26,-44 -34,-18 -4,-20 Z"
          fill="#F97316"
          stroke="#FDBA74"
          strokeWidth="1.5"
        />
        <path
          d="M 0,-22 C 26,-44 34,-18 4,-20 Z"
          fill="#EA580C"
          stroke="#FDBA74"
          strokeWidth="1.5"
        />
        <circle cx="0" cy="-23" r="5" fill="#FB923C" />
      </g>

      {/* Small Gold Coin in front of Gift Box */}
      <g transform="translate(262, 174) rotate(12)" filter="url(#stw-drop-shadow)">
        <circle cx="0" cy="0" r="24" fill="url(#stw-coin-grad)" stroke="#FEF08A" strokeWidth="2" />
        <circle cx="0" cy="0" r="18" fill="none" stroke="#B45309" strokeWidth="1.5" />
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="#78350F"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="19"
        >
          ₹
        </text>
      </g>

      {/* 6. SWEEPING EMERALD GREEN RIBBON BANNER + GOLDEN CROWN */}
      <path
        d="M 22,226 C 75,168 325,168 378,226 C 362,258 345,274 320,278 C 245,244 155,244 80,278 C 55,274 38,258 22,226 Z"
        fill="url(#stw-green-ribbon)"
        stroke="#4ADE80"
        strokeWidth="2.5"
        filter="url(#stw-drop-shadow)"
      />

      {/* Golden Royal Crown in Center Above "SCRATCH" */}
      <g transform="translate(200, 178)" filter="url(#stw-drop-shadow)">
        <path
          d="M -26,14 L -32,-10 L -12,4 L 0,-16 L 12,4 L 32,-10 L 26,14 Z"
          fill="url(#stw-crown-grad)"
          stroke="#FEF08A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Crown Base Band */}
        <rect x="-26" y="12" width="52" height="7" rx="3.5" fill="#D97706" stroke="#FEF08A" strokeWidth="1.5" />
        {/* Crown Pearls */}
        <circle cx="-33" cy="-13" r="4" fill="#FEF08A" />
        <circle cx="0" cy="-20" r="4.5" fill="#FEF08A" />
        <circle cx="33" cy="-13" r="4" fill="#FEF08A" />
      </g>

      {/* 7. "SCRATCH" 3D WHITE-GOLD BLOCK TEXT */}
      <g filter="url(#stw-drop-shadow)">
        {/* Dark Forest Outer Backing */}
        <text
          x="200"
          y="246"
          textAnchor="middle"
          fill="#022C22"
          stroke="#022C22"
          strokeWidth="18"
          strokeLinejoin="round"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="60"
          letterSpacing="1"
        >
          SCRATCH
        </text>
        {/* Orange-Gold 3D Bottom Extrusion */}
        <text
          x="200"
          y="245"
          textAnchor="middle"
          fill="url(#stw-scratch-bevel)"
          stroke="url(#stw-scratch-bevel)"
          strokeWidth="10"
          strokeLinejoin="round"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="60"
          letterSpacing="1"
        >
          SCRATCH
        </text>
        {/* Crisp White-Cream Top Face */}
        <text
          x="200"
          y="239"
          textAnchor="middle"
          fill="url(#stw-scratch-face)"
          stroke="#F59E0B"
          strokeWidth="1.5"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="60"
          letterSpacing="1"
        >
          SCRATCH
        </text>
      </g>

      {/* 8. "THE" SILVER METALLIC PILL BADGE */}
      <g filter="url(#stw-drop-shadow)">
        <rect
          x="148"
          y="246"
          width="104"
          height="32"
          rx="9"
          fill="#064E3B"
          stroke="#10B981"
          strokeWidth="2"
        />
        <text
          x="200"
          y="270"
          textAnchor="middle"
          fill="url(#stw-the-face)"
          stroke="#0F172A"
          strokeWidth="3"
          paintOrder="stroke"
          fontFamily="'Outfit', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="25"
          letterSpacing="2"
        >
          THE
        </text>
      </g>

      {/* 9. "WIN" MASSIVE 3D RADIANT GOLD LETTERS */}
      <g filter="url(#stw-drop-shadow)">
        {/* Dark Outer Shield Stroke */}
        <text
          x="200"
          y="354"
          textAnchor="middle"
          fill="#022C22"
          stroke="#022C22"
          strokeWidth="22"
          strokeLinejoin="round"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="92"
          letterSpacing="2"
        >
          WIN
        </text>
        {/* Deep Amber 3D Extrusion */}
        <text
          x="200"
          y="353"
          textAnchor="middle"
          fill="url(#stw-win-bevel)"
          stroke="url(#stw-win-bevel)"
          strokeWidth="12"
          strokeLinejoin="round"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="92"
          letterSpacing="2"
        >
          WIN
        </text>
        {/* Bright Metallic Gold Front Face */}
        <text
          x="200"
          y="344"
          textAnchor="middle"
          fill="url(#stw-win-face)"
          stroke="#FEF08A"
          strokeWidth="2"
          fontFamily="'Outfit', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="92"
          letterSpacing="2"
        >
          WIN
        </text>
      </g>

      {/* 10. SPARKLE STARS & CONFETTI */}
      <g fill="#FEF08A">
        {/* Top-Left Sparkle */}
        <path d="M 92,74 L 96,84 L 106,88 L 96,92 L 92,102 L 88,92 L 78,88 L 88,84 Z" />
        {/* Top Ticket Corner Sparkle */}
        <path d="M 244,44 L 248,54 L 258,58 L 248,62 L 244,72 L 240,62 L 230,58 L 240,54 Z" />
        {/* Right Rim Sparkle */}
        <path d="M 362,192 L 365,200 L 373,203 L 365,206 L 362,214 L 359,206 L 351,203 L 359,200 Z" />
        {/* Bottom-Left Sparkle */}
        <path d="M 110,256 L 113,263 L 120,266 L 113,269 L 110,276 L 107,269 L 100,266 L 107,263 Z" />
        {/* Golden Confetti Diamonds */}
        <polygon points="198,38 210,44 204,58 192,52" fill="#FBBF24" />
        <polygon points="326,102 338,112 328,124 316,114" fill="#FDE047" />
        <polygon points="266,258 278,268 268,280 256,270" fill="#FBBF24" />
      </g>
    </svg>
  );
};

export default AppLogo;
