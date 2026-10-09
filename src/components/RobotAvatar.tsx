import React, { useState } from 'react';

interface RobotAvatarProps {
  className?: string;
  size?: number | string;
  rounded?: string;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  className = 'w-16 h-16 sm:w-18 sm:h-18',
  size,
  rounded = 'rounded-2xl',
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      style={size ? { width: size, height: size } : undefined}
      className={`relative overflow-hidden ring-2 ring-sky-300/80 shadow-lg shadow-sky-500/25 bg-gradient-to-tr from-sky-400 via-cyan-200 to-blue-500 p-0.5 shrink-0 select-none ${rounded} ${className}`}
    >
      {!imageError ? (
        <img
          src="/images/robot_avatar.jpg"
          alt="Robot Avatar"
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${rounded === 'rounded-full' ? 'rounded-full' : 'rounded-[14px]'}`}
        />
      ) : (
        /* High-Definition Fallback SVG Robot */
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full bg-slate-900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Glow */}
          <circle cx="50" cy="50" r="46" fill="url(#bot-bg)" />
          
          {/* Antennas */}
          <path d="M35 25L28 14" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="27" cy="13" r="3.5" fill="#38BDF8" />
          <path d="M65 25L72 14" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="73" cy="13" r="3.5" fill="#38BDF8" />

          {/* Ears */}
          <rect x="18" y="42" width="6" height="16" rx="3" fill="#0284C7" />
          <rect x="76" y="42" width="6" height="16" rx="3" fill="#0284C7" />

          {/* Head Body */}
          <rect x="23" y="24" width="54" height="50" rx="18" fill="#F8FAFC" stroke="#0284C7" strokeWidth="2.5" />
          
          {/* Screen Visor */}
          <rect x="29" y="34" width="42" height="26" rx="10" fill="#0F172A" />
          
          {/* Glowing Eyes */}
          <path d="M36 46C37 42 41 42 42 46" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M58 46C59 42 63 42 64 46" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />

          {/* Friendly Smile */}
          <path d="M44 64C47 67 53 67 56 64" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />

          <defs>
            <radialGradient id="bot-bg" cx="50" cy="50" r="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#082F49" />
            </radialGradient>
          </defs>
        </svg>
      )}
    </div>
  );
};

export default RobotAvatar;
