import React from 'react';

interface TelegramLogoProps {
  className?: string;
  size?: number | string;
}

export const TelegramLogo: React.FC<TelegramLogoProps> = ({
  className = 'w-12 h-12',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Telegram Logo"
    >
      <defs>
        {/* Official Telegram Blue Linear Gradient */}
        <linearGradient
          id="tg-official-blue-grad"
          x1="12"
          y1="0"
          x2="12"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2AABEE" />
          <stop offset="100%" stopColor="#229ED9" />
        </linearGradient>
        <filter id="tg-official-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284c7" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Telegram Blue Circle */}
      <circle
        cx="12"
        cy="12"
        r="11.8"
        fill="url(#tg-official-blue-grad)"
        filter="url(#tg-official-shadow)"
      />

      {/* Official Telegram Paper Airplane geometry */}
      <path
        d="M 5.432 11.871 C 4.864 12.097 4.566 12.318 4.539 12.534 C 4.487 12.949 5.084 13.078 5.836 13.323 C 6.449 13.522 7.273 13.755 7.701 13.763 C 8.09 13.773 8.523 13.613 9.003 13.283 C 12.271 11.078 13.958 9.962 14.064 9.938 C 14.139 9.921 14.243 9.9 14.313 9.962 C 14.383 10.024 14.376 10.142 14.369 10.174 C 14.309 10.427 11.239 13.22 11.062 13.404 C 10.387 14.104 9.619 14.534 10.804 15.314 C 11.829 15.99 12.426 16.421 13.482 17.114 C 14.157 17.556 14.686 18.081 15.382 18.016 C 15.703 17.987 16.034 17.686 16.202 16.786 C 16.6 14.661 17.382 10.057 17.562 8.159 C 17.578 7.993 17.558 7.78 17.542 7.687 C 17.542 7.643 17.515 7.48 17.371 7.362 C 17.227 7.245 17.006 7.22 16.906 7.222 C 16.455 7.23 15.762 7.471 12.43 8.857 C 11.262 9.342 8.93 10.347 5.432 11.871 Z"
        fill="#ffffff"
      />
    </svg>
  );
};
