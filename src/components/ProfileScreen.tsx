import React from 'react';
import {
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { TabType } from './BottomNav';
import { triggerHaptic, openExternalOrTelegramLink } from '../services/telegram';
import { RobotAvatar } from './RobotAvatar';

interface ProfileScreenProps {
  user: UserProfile;
  settings: AppSettings;
  onNavigate: (tab: TabType) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSecretOpenAdmin?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  settings,
  onNavigate,
  onSecretOpenAdmin,
}) => {
  const [avatarTaps, setAvatarTaps] = React.useState<number>(0);

  const handleAvatarTap = () => {
    setAvatarTaps((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        triggerHaptic('heavy');
        if (onSecretOpenAdmin) {
          onSecretOpenAdmin();
        }
        return 0;
      }
      return next;
    });
  };

  const handleOpenChannel = () => {
    triggerHaptic('light');
    const channelUrl = settings.telegramChannelUrl || 'https://t.me/telegram';
    openExternalOrTelegramLink(channelUrl);
  };

  const displayName = user.name && user.name.trim() !== '' ? user.name : 'Lakshmi pay';
  const displayId = user.id ? String(user.id) : '6612581369';

  return (
    <div className="w-full flex flex-col items-stretch pb-24 animate-fade-in select-none">
      {/* ----------------- 1. TOP PROFILE CARD (ROBOT AVATAR) ----------------- */}
      <div className="w-full bg-white rounded-[32px] p-5 sm:p-6 shadow-md shadow-slate-900/5 border border-slate-100 flex items-center gap-4">
        {/* Robot Avatar (Secret 5-Tap opens Admin) */}
        <div
          onClick={handleAvatarTap}
          className="shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <RobotAvatar className="w-16 h-16 sm:w-18 sm:h-18" rounded="rounded-2xl" />
        </div>

        {/* User Details */}
        <div className="min-w-0 flex-1">
          <h2 className="font-['Outfit'] font-black text-slate-900 text-xl sm:text-2xl leading-tight tracking-tight truncate">
            {displayName}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 mb-2 tracking-wide truncate">
            User&nbsp;&nbsp;ID:&nbsp;&nbsp;#{displayId}
          </p>
          <div className="inline-flex items-center gap-1.5 bg-[#f0f9ff] text-[#0284c7] border border-[#bae6fd] px-3 py-1 rounded-full text-[10px] font-black tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7] stroke-[2.5]" />
            <span>VERIFIED TELEGRAM USER</span>
          </div>
        </div>
      </div>

      {/* ----------------- 2. SECTION HEADER ----------------- */}
      <div className="flex items-center gap-2 mt-5 mb-3 px-1">
        <span className="w-1.5 h-5 bg-[#ff5e00] rounded-full inline-block"></span>
        <h2 className="font-['Outfit'] font-black text-slate-900 text-xl tracking-tight">
          Quick Actions
        </h2>
      </div>

      {/* ----------------- 3. QUICK ACTIONS CARD (MATCHING SCREENSHOT) ----------------- */}
      <div className="w-full bg-white rounded-[32px] p-2 shadow-md shadow-slate-900/5 border border-slate-100 divide-y divide-slate-100 overflow-hidden">
        {/* Row 1: Lucky Spin Wheel */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('home');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="spin">
              🎡
            </span>
            <span className="font-['Outfit'] font-bold text-slate-800 text-[15px]">
              Lucky Spin Wheel
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.2]" />
        </button>

        {/* Row 2: Refer Friends (1 Refer = 1 Spin) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('invite');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="refer">
              🤝
            </span>
            <span className="font-['Outfit'] font-bold text-slate-800 text-[15px]">
              Refer Friends (1 Refer = 1 Spin)
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.2]" />
        </button>

        {/* Row 3: Withdraw Cash (Bank / UPI) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('wallet');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="withdraw">
              💸
            </span>
            <span className="font-['Outfit'] font-bold text-slate-800 text-[15px]">
              Withdraw Cash (Bank / UPI)
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.2]" />
        </button>

        {/* Row 4: Official Telegram Channel */}
        <button
          type="button"
          onClick={handleOpenChannel}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="channel">
              💬
            </span>
            <span className="font-['Outfit'] font-bold text-slate-800 text-[15px]">
              Official Telegram Channel
            </span>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-400 stroke-[2]" />
        </button>

        {/* Row 5: Contact for cheap bot website app creation */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            openExternalOrTelegramLink('https://t.me/lakhsmiiiii');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="rocket">
              🚀
            </span>
            <div className="min-w-0">
              <span className="font-['Outfit'] font-bold text-slate-800 text-[15px] block leading-tight truncate">
                Contact for cheap bot website app creation
              </span>
              <span className="font-['Outfit'] font-bold text-[#0284c7] text-xs mt-0.5 block">
                @lakhsmiiiii
              </span>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-400 stroke-[2] shrink-0 ml-2" />
        </button>

        {/* Row 6: Any problem dm kro */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            openExternalOrTelegramLink('https://t.me/Rohit79041');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="sos">
              🆘
            </span>
            <div className="min-w-0">
              <span className="font-['Outfit'] font-bold text-slate-800 text-[15px] block leading-tight">
                Any problem dm kro
              </span>
              <span className="font-['Outfit'] font-bold text-[#ea580c] text-xs mt-0.5 block">
                @Rohit79041
              </span>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-400 stroke-[2] shrink-0 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
