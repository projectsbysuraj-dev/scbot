import React from 'react';
import { Home, Share2, Wallet, User } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

export type TabType = 'home' | 'invite' | 'wallet' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const handleSelect = (tab: TabType) => {
    triggerHaptic('light');
    onTabChange(tab);
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'invite',
      label: 'Invite',
      icon: <Share2 className="w-5 h-5" />,
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none select-none">
      <nav className="pointer-events-auto w-full max-w-[400px] bg-white rounded-[28px] p-1.5 shadow-2xl shadow-orange-950/15 flex items-center justify-around border border-slate-200/80">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-200 select-none cursor-pointer rounded-[22px] ${
                isActive
                  ? 'bg-gradient-to-b from-[#ff6a00] to-[#ee4d00] text-white shadow-md shadow-orange-500/35'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={isActive ? 'text-white' : 'text-slate-500'}>
                {item.icon}
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight font-['Outfit'] ${isActive ? 'font-black text-white' : 'font-bold text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
