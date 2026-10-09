import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Send, Flame, Sparkles, Plus, X, RotateCcw, Moon, Sun } from 'lucide-react';
import { AppSettings, UserProfile } from '../types';
import { TabType } from './BottomNav';
import {
  decrementUserSpin,
  addBalanceToUser,
  creditReferralAfterFirstSpin,
} from '../services/store';
import { triggerHaptic, openExternalOrTelegramLink } from '../services/telegram';
import scratchWinBannerArt from '../assets/images/scratch_win_banner_art_1791385622302.jpg?inline';
import fallbackBannerGift from '../assets/images/banner_3d_gift_1791384533459.jpg?inline';

interface HomeScreenProps {
  user: UserProfile;
  settings: AppSettings;
  onNavigate: (tab: TabType) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  settings,
  onNavigate,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [isScratched, setIsScratched] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [wonModal, setWonModal] = useState<{ amount: number } | null>(null);
  const [noScratchesModal, setNoScratchesModal] = useState(false);
  const [cardKey, setCardKey] = useState(0); // to reset card for next scratch

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Stable refs for drawing state to avoid mid-gesture teardowns
  const isPointerDownRef = useRef(false);
  const isScratchingRef = useRef(false);
  const hasTriggeredWinRef = useRef(false);
  const scratchStrokeCountRef = useRef(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const winAmount = settings.spinWinAmount || 5;

  // -------------------------------------------------------------
  // Draw the exact Silver Scratch Foil Canvas (Matches Reference)
  // -------------------------------------------------------------
  const initFoilCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset composite operation to normal draw
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    // 1. Realistic Brushed Silver/Metallic Base Gradient
    const baseGrad = ctx.createLinearGradient(0, 0, width, height);
    baseGrad.addColorStop(0, '#c4c4cc');
    baseGrad.addColorStop(0.2, '#9ca3af');
    baseGrad.addColorStop(0.4, '#71717a');
    baseGrad.addColorStop(0.65, '#52525b');
    baseGrad.addColorStop(0.85, '#9ca3af');
    baseGrad.addColorStop(1, '#6b7280');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Micro-brushed metal horizontal striations
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    for (let i = 0; i < height; i += 2) {
      ctx.fillRect(0, i, width, 1);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 1; i < height; i += 3) {
      ctx.fillRect(0, i, width, 1);
    }

    // 3. Diagonal metallic light sheen
    const sheenGrad = ctx.createLinearGradient(0, 0, width, height);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.12)');
    sheenGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
    sheenGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.08)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Clean golden and white inner border trim on foil
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // 5. Center Embossed "SCRATCH CARD" (Clean, Large, Exactly as Requested)
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    ctx.save();
    // 3D Shadow layer
    ctx.font = '900 32px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#0f172a';
    ctx.fillText('SCRATCH CARD', centerX, centerY + 2);

    // Front embossed metallic text
    const textGrad = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.5, '#f8fafc');
    textGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = textGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillText('SCRATCH CARD', centerX, centerY);
    ctx.restore();

    // Reset drawing tracking state
    hasTriggeredWinRef.current = false;
    scratchStrokeCountRef.current = 0;
    isScratchingRef.current = false;
    isPointerDownRef.current = false;
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    initFoilCanvas();
  }, [initFoilCanvas, cardKey]);

  // -------------------------------------------------------------
  // Reveal Prize: Smoothly clear foil, award cash, show win modal
  // -------------------------------------------------------------
  const handleRevealPrize = useCallback(() => {
    if (hasTriggeredWinRef.current) return;
    hasTriggeredWinRef.current = true;

    // Instantly & cleanly erase all remaining silver foil
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    setIsScratched(true);
    setIsScratching(false);
    triggerHaptic('success');

    // Credit ₹5 (or configured winAmount) to user balance
    addBalanceToUser(userRef.current.id, winAmount, `Won ₹${winAmount} in Scratch & Win!`, true, 'spin_win');

    // Referral bonus credit after first scratch
    creditReferralAfterFirstSpin(userRef.current.id);

    // Confetti celebration
    try {
      confetti({
        particleCount: 85,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff5e00', '#22c55e', '#eab308', '#38bdf8', '#ffffff'],
      });
    } catch {
      // safe fallback
    }

    setWonModal({ amount: winAmount });
  }, [winAmount]);

  // -------------------------------------------------------------
  // Percentage Check: auto-reveal if enough foil is scratched
  // -------------------------------------------------------------
  const checkScratchPercentage = useCallback(() => {
    if (hasTriggeredWinRef.current) return;

    // Fast-path: auto-reveal after 14 satisfying scratch strokes
    if (scratchStrokeCountRef.current >= 14) {
      handleRevealPrize();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparent = 0;
      const totalSampled = Math.max(1, Math.floor(pixels.length / 32));

      for (let i = 3; i < pixels.length; i += 32) {
        if (pixels[i] < 128) {
          transparent++;
        }
      }

      const percent = (transparent / totalSampled) * 100;
      if (percent > 16 || scratchStrokeCountRef.current >= 10) {
        handleRevealPrize();
      }
    } catch {
      if (scratchStrokeCountRef.current >= 8) {
        handleRevealPrize();
      }
    }
  }, [handleRevealPrize]);

  // -------------------------------------------------------------
  // Scratch Stroke: Works 100% on BOTH Touch (Mobile) and Mouse!
  // -------------------------------------------------------------
  const scratchAtPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || hasTriggeredWinRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // CRITICAL: Set destination-out with 100% OPAQUE stroke & fill to completely erase foil!
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 52;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (lastPointRef.current) {
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPointRef.current = { x, y };

    scratchStrokeCountRef.current += 1;

    // Realistic scratch sound & haptic feedback during foil rubbing
    triggerHaptic('scratch');

    // Check if auto-reveal threshold reached
    if (scratchStrokeCountRef.current % 2 === 0) {
      checkScratchPercentage();
    }
  }, [checkScratchPercentage]);

  // -------------------------------------------------------------
  // HTML5 Pointer Events (Universal: Mobile Touch + Desktop Mouse)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isScratched || hasTriggeredWinRef.current) return;

    // Check available spins
    if (userRef.current.spins <= 0) {
      triggerHaptic('error');
      setNoScratchesModal(true);
      return;
    }

    // Deduct 1 scratch on initial touch
    if (!isScratchingRef.current) {
      const decremented = decrementUserSpin(userRef.current.id);
      if (!decremented) {
        triggerHaptic('error');
        setNoScratchesModal(true);
        return;
      }
      isScratchingRef.current = true;
      setIsScratching(true);
      triggerHaptic('medium');
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    isPointerDownRef.current = true;
    lastPointRef.current = null;
    scratchAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || isScratched || hasTriggeredWinRef.current) return;
    scratchAtPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    checkScratchPercentage();
  };

  // Instant Auto Scratch (Single Tap or button click)
  const handleAutoScratch = () => {
    if (isScratched || hasTriggeredWinRef.current) return;

    if (userRef.current.spins <= 0) {
      triggerHaptic('error');
      setNoScratchesModal(true);
      return;
    }

    const decremented = decrementUserSpin(userRef.current.id);
    if (!decremented) {
      triggerHaptic('error');
      setNoScratchesModal(true);
      return;
    }

    setIsScratching(true);
    isScratchingRef.current = true;
    triggerHaptic('heavy');

    const canvas = canvasRef.current;
    if (!canvas) {
      handleRevealPrize();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      handleRevealPrize();
      return;
    }

    // Animated smooth wipe across foil
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.16;
      ctx.fillRect(0, 0, canvas.width * progress, canvas.height);
      if (progress >= 1.0) {
        clearInterval(interval);
        handleRevealPrize();
      }
    }, 28);
  };

  const handleScratchAgain = () => {
    setWonModal(null);
    setIsScratched(false);
    setIsScratching(false);
    hasTriggeredWinRef.current = false;
    scratchStrokeCountRef.current = 0;
    isPointerDownRef.current = false;
    isScratchingRef.current = false;
    lastPointRef.current = null;
    setCardKey((prev) => prev + 1);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3.5 pb-20 animate-fade-in select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CAROUSEL BANNER CARD (Optimized for Mobile Phone Screens) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full relative">
        <div className="w-full bg-white rounded-[26px] sm:rounded-[28px] p-3.5 sm:p-5 shadow-xl shadow-orange-950/10 relative overflow-hidden border-2 border-[#ff5e00]">
          {/* Festive Tri-Color Wavy Background Gradients */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-gradient-to-br from-orange-500/35 via-amber-400/25 to-transparent blur-2xl pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gradient-to-bl from-emerald-500/35 via-green-400/25 to-transparent blur-2xl pointer-events-none" />
          
          {/* Top Left Organic Saffron Wave Accent */}
          <svg className="absolute top-0 left-0 w-36 h-20 opacity-80 pointer-events-none" viewBox="0 0 140 80" fill="none">
            <path d="M 0 0 C 40 0, 70 20, 80 40 C 90 60, 110 75, 140 80 L 0 80 Z" fill="url(#saffronWave)" opacity="0.15" />
            <defs>
              <linearGradient id="saffronWave" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top Right Organic Green Wave Accent */}
          <svg className="absolute top-0 right-0 w-44 h-24 opacity-80 pointer-events-none" viewBox="0 0 160 90" fill="none">
            <path d="M 160 0 C 120 0, 90 25, 75 45 C 60 65, 30 80, 0 90 L 160 90 Z" fill="url(#emeraldWave)" opacity="0.18" />
            <defs>
              <linearGradient id="emeraldWave" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top-Right Speech Bubble Badge: "Always ₹5" */}
          <div className="absolute top-3 right-3 sm:top-3.5 sm:right-4 z-20">
            <div className="relative bg-[#16a34a] text-white font-['Outfit'] font-black text-[10px] sm:text-[11px] px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full shadow-md shadow-emerald-700/30 tracking-tight flex items-center gap-1 border border-emerald-400/40">
              <span>Always ₹5</span>
              {/* Speech bubble pointer tail */}
              <div className="absolute -bottom-1 left-3 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#16a34a] rotate-45" />
            </div>
          </div>

          {/* 2-Column Responsive Layout: Text on Left, 3D Render on Right - No collision or overlap on phone */}
          <div className="flex items-center justify-between gap-2 relative z-10 pt-1">
            <div className="flex-1 min-w-0 pr-1">
              {/* Title Line 1: Scratch & Win */}
              <h2 className="font-['Outfit'] font-black text-slate-900 text-[21px] sm:text-[25px] tracking-tight leading-tight">
                Scratch &amp; Win
              </h2>

              {/* Title Line 2: Instant ₹5 Cash */}
              <div className="flex items-center gap-1.5 font-['Outfit'] font-black text-[21px] sm:text-[25px] tracking-tight leading-tight mb-1 sm:mb-2">
                <span className="text-[#16a34a]">Instant</span>
                <span className="text-[#ea580c]">₹5 Cash</span>
              </div>

              {/* Description */}
              <p className="text-slate-600 text-[11px] sm:text-xs font-semibold leading-snug sm:leading-relaxed mb-3 max-w-[200px]">
                Scratch card &amp; win real cash directly in your wallet!
              </p>

              {/* Action Button: JOIN CHANNEL (Telegram Join Button) */}
              <button
                type="button"
                onClick={() => openExternalOrTelegramLink(settings.telegramChannelUrl)}
                className="bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-[11px] sm:text-xs px-4 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/35 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5 fill-white" />
                <span>JOIN CHANNEL</span>
              </button>
            </div>

            {/* Right 3D Visual: Smoothly contained, never cuts into text */}
            <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 relative flex items-center justify-center self-end sm:self-center">
              <img
                src={scratchWinBannerArt}
                alt="Scratch & Win 3D Card"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== fallbackBannerGift) {
                    target.src = fallbackBannerGift;
                  }
                }}
                className="w-full h-full object-contain filter drop-shadow-xl select-none"
              />
              {/* Floating 3D Golden Coin Accent */}
              <div className="absolute top-1 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-100 shadow-md flex items-center justify-center text-white font-['Outfit'] font-black text-[10px] sm:text-xs animate-bounce" style={{ animationDuration: '2.8s' }}>
                ₹
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip Directly Under Banner (Responsive on Mobile) */}
        <div className="w-full bg-white rounded-2xl py-2.5 px-3 sm:py-3 sm:px-4 shadow-md shadow-slate-900/5 border-2 border-[#ff5e00] flex items-center justify-around text-slate-800 mt-2">
          {/* Left: 1 SIGN UP = 1 SCRATCH */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg sm:text-xl shadow-xs">
              🎁
            </div>
            <div className="text-left">
              <div className="text-[10px] sm:text-[11px] font-black tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                1 SIGN UP
              </div>
              <div className="text-[10px] sm:text-[11px] font-black text-[#ff5e00] leading-tight whitespace-nowrap">
                = 1 SCRATCH
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-6 sm:h-7 bg-slate-200" />

          {/* Right: 1 REFER = 1 SCRATCH */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavigate('invite');
            }}
            className="flex items-center gap-2 sm:gap-2.5 text-left active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg sm:text-xl shadow-xs">
              👥
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-black tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                1 REFER
              </div>
              <div className="text-[10px] sm:text-[11px] font-black text-[#ff5e00] leading-tight whitespace-nowrap">
                = 1 SCRATCH
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SECTION HEADER: Flame Badge + "Scratch & Win" + Dark Mode Toggle */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full flex items-center justify-between px-1 mt-1 gap-2">
        <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30">
            <Flame className="w-4.5 h-4.5 fill-white text-white" />
          </div>
          <h2 className="font-['Outfit'] font-black text-slate-900 text-xl sm:text-2xl tracking-tight leading-none">
            Scratch &amp; Win
          </h2>
        </div>

        {/* Right Side: Dark Mode On/Off Toggle Switch */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            if (onToggleDarkMode) onToggleDarkMode();
          }}
          aria-label="Toggle Dark Mode"
          className={`rounded-2xl px-3 py-2 shadow-sm border flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDarkMode
              ? 'bg-slate-800 border-amber-400/50 text-amber-300 shadow-amber-500/10'
              : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
              isDarkMode
                ? 'bg-amber-400/20 text-amber-300'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isDarkMode ? (
              <Moon className="w-4 h-4 fill-amber-300 text-amber-300" />
            ) : (
              <Sun className="w-4 h-4 text-orange-500" />
            )}
          </div>

          <div className="text-left pr-0.5">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
              Dark Mode
            </span>
            <span
              className={`block font-['Outfit'] font-black text-xs leading-tight mt-0.5 ${
                isDarkMode ? 'text-emerald-400' : 'text-slate-600'
              }`}
            >
              {isDarkMode ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* Toggle Pill Indicator */}
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
              isDarkMode ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform" />
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CENTER STAGE: Big Prominent Scratch Card (Clean, No Clutter) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full relative flex flex-col items-center justify-center py-1 select-none">
        {/* ----------------- THE BIG 3D GOLDEN SCRATCH CARD ----------------- */}
        <div className="relative z-10 w-full max-w-[420px]">
          {/* Glowing Golden Beveled Outer Frame with LED Bulbs */}
          <div className="w-full rounded-[28px] sm:rounded-[32px] p-2 sm:p-2.5 bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#92400e] shadow-2xl shadow-amber-950/35 border-2 border-[#fef9c3] relative overflow-hidden">
            {/* Embedded Glowing LED Bulbs Along Top Border */}
            <div className="absolute top-1 left-0 right-0 flex justify-around px-4 pointer-events-none z-20">
              {[...Array(9)].map((_, i) => (
                <span
                  key={`top-led-${i}`}
                  className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fef08a] animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>

            {/* Embedded Glowing LED Bulbs Along Bottom Border */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-around px-4 pointer-events-none z-20">
              {[...Array(9)].map((_, i) => (
                <span
                  key={`bot-led-${i}`}
                  className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fef08a] animate-pulse"
                  style={{ animationDelay: `${(8 - i) * 120}ms` }}
                />
              ))}
            </div>

            {/* Inner Metallic Gold Background */}
            <div className="w-full rounded-[22px] sm:rounded-[26px] p-1.5 bg-gradient-to-br from-[#ca8a04] via-[#eab308] to-[#854d0e] shadow-inner relative">
              {/* Big Inner Card Container (Expanded Canvas Area: aspect-[16/11]) */}
              <div className="relative w-full aspect-[16/11] rounded-[18px] sm:rounded-[22px] overflow-hidden bg-slate-900 shadow-2xl border border-amber-300/40">
                {/* ------------------------------------------------------------- */}
                {/* LAYER 1: UNDERNEATH REVEALED PRIZE CARD                       */}
                {/* ------------------------------------------------------------- */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#fef08a] via-[#f59e0b] to-[#ea580c] flex flex-col items-center justify-center p-4 text-center select-none overflow-hidden">
                  {/* Sunburst Background Pattern */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

                  {/* Sparkles */}
                  <div className="absolute top-2 left-3 text-amber-200 text-sm">✨</div>
                  <div className="absolute bottom-2 right-3 text-amber-200 text-sm">✨</div>
                  <div className="absolute top-2 right-3 text-amber-200 text-sm">🎉</div>

                  {/* Top Won Label */}
                  <span className="font-['Outfit'] font-black text-slate-950 text-xs uppercase tracking-wider bg-white/80 px-3 py-0.5 rounded-full shadow-sm mb-1">
                    🎉 INSTANT CASH WON!
                  </span>

                  {/* Big Bold Rupee Prize Amount */}
                  <div className="font-['Outfit'] font-black text-white text-5xl sm:text-6xl tracking-tighter drop-shadow-md flex items-center justify-center leading-none my-1">
                    <span>₹{winAmount}</span>
                  </div>

                  {/* Subtitle */}
                  <p className="text-amber-100 text-[11px] font-bold tracking-tight">
                    Credited directly to your wallet!
                  </p>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* LAYER 2: INTERACTIVE SILVER FOIL CANVAS                       */}
                {/* ------------------------------------------------------------- */}
                {!isScratched && (
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={260}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10 select-none"
                    style={{ touchAction: 'none' }}
                  />
                )}

                {/* Subtle Rub Finger Helper Hint at Bottom of Card (Does not block SCRATCH CARD text) */}
                {!isScratched && !isScratching && (
                  <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center pointer-events-none select-none">
                    <span className="text-[10px] font-extrabold text-white/95 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs shadow-md">
                      👆 Rub finger here to scratch
                    </span>
                  </div>
                )}

                {/* Revealed state overlay with instant Scratch Next Card action */}
                {isScratched && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-3 pointer-events-auto bg-black/20 backdrop-blur-[1px]">
                    <button
                      type="button"
                      onClick={handleScratchAgain}
                      className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-600 active:scale-95 text-white font-['Outfit'] font-black text-xs px-5 py-2.5 rounded-full shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-300"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Scratch Next Card 🚀</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Grounding 3D Shadow Beneath Card (All side clutter removed as requested) */}
        <div className="w-4/5 h-3.5 bg-slate-900/10 rounded-[100%] blur-sm mx-auto -mt-1 mb-1 pointer-events-none" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SCRATCHES AVAILABLE & "+ GET MORE" BAR (Compact)           */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-white rounded-2xl px-3.5 py-2.5 shadow-md shadow-orange-950/5 border border-slate-100 flex items-center justify-between gap-2 mt-0.5">
        {/* Left: 3D Orange Ticket + "Scratches Available" + Bold Green Count */}
        <div className="flex items-center gap-2.5">
          {/* 3D Orange Ticket with Side Notches */}
          <div className="w-11 h-7 rounded-lg bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] text-white flex items-center justify-center font-['Outfit'] font-black text-xs shadow-sm shadow-orange-500/30 relative overflow-hidden">
            <span className="text-white text-xs font-black">₹</span>
            {/* Cutout circular notches */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-left">
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                Scratches
              </span>
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                Available
              </span>
            </div>

            {/* Bold Green Count */}
            <span className="font-['Outfit'] font-black text-2xl text-[#16a34a] leading-none ml-0.5">
              {user.spins}
            </span>
          </div>
        </div>

        {/* Right: Compact Orange "+ Get More" Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('invite');
          }}
          className="bg-gradient-to-r from-[#ff5e00] to-[#ff3b00] hover:from-[#e55300] hover:to-[#ea3300] text-white font-['Outfit'] font-black text-xs px-4 py-2 rounded-full shadow-md shadow-orange-500/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Get More</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. CELEBRATION WON MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {wonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-2xl border border-white flex flex-col items-center text-center relative animate-scale-up">
            <button
              type="button"
              onClick={() => setWonModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40 text-4xl mb-3">
              🎉
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
              GUARANTEED CASH WIN
            </span>

            <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight leading-tight">
              Congratulations!
            </h3>

            <div className="my-3 font-['Outfit'] font-black text-4xl text-orange-600">
              ₹{wonModal.amount.toFixed(2)}
            </div>

            <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-5 max-w-[240px]">
              ₹{wonModal.amount} has been added directly to your wallet balance!
            </p>

            <div className="w-full space-y-2.5">
              {user.spins > 0 ? (
                <button
                  type="button"
                  onClick={handleScratchAgain}
                  className="w-full bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-500/35 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scratch Again ({user.spins} Left) 🚀</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setWonModal(null);
                    onNavigate('invite');
                  }}
                  className="w-full bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-500/35 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Get More Scratches (Invite Friends) 🤝</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setWonModal(null);
                  onNavigate('wallet');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-['Outfit'] font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer"
              >
                Go to Wallet &amp; Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. NO SCRATCHES AVAILABLE MODAL                               */}
      {/* ------------------------------------------------------------- */}
      {noScratchesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-2xl border border-white flex flex-col items-center text-center relative animate-scale-up">
            <button
              type="button"
              onClick={() => setNoScratchesModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mb-3">
              🎫
            </div>

            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight leading-tight mb-1">
              0 Scratches Available!
            </h3>

            <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-4 max-w-[250px]">
              You don&apos;t have any scratches left. Invite friends to get 1 free scratch for every friend who joins!
            </p>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setNoScratchesModal(false);
                  onNavigate('invite');
                }}
                className="w-full bg-gradient-to-r from-[#ff5e00] to-[#ff7a00] hover:from-[#e55300] hover:to-[#f06e00] text-white font-['Outfit'] font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-500/35 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Invite Friends (+1 Free Scratch) 🚀</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNoScratchesModal(false);
                  onNavigate('wallet');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-['Outfit'] font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer"
              >
                Go to Wallet &amp; Withdraw
              </button>

              <button
                type="button"
                onClick={() => setNoScratchesModal(false)}
                className="w-full text-slate-400 hover:text-slate-600 font-bold text-xs py-1.5 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
