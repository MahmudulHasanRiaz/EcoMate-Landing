import React from 'react';

interface EcoMateLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export const EcoMateLogo: React.FC<EcoMateLogoProps> = ({
  className = '',
  size = 36,
  showWordmark = true,
  wordmarkClassName = 'text-xl font-bold tracking-tight text-slate-900 dark:text-white',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div 
        className="relative shrink-0 flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="w-full h-full drop-shadow-[0_0_12px_rgba(37,99,235,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle with gradient & white boundary ring matching authentic EcoMate logo */}
          <circle cx="50" cy="50" r="48" fill="url(#ecomate-bg-grad)" />
          <circle cx="50" cy="50" r="46.5" stroke="#FFFFFF" strokeWidth="1.8" strokeOpacity="0.95" />
          
          {/* Subtle luminous inner highlight */}
          <circle cx="50" cy="50" r="45" stroke="url(#ecomate-glow-ring)" strokeWidth="1" />

          {/* Three iconic curved flame/wave swooshes */}
          {/* Left swoosh */}
          <path
            d="M 33 58 C 34 45 42 32 50 22 C 43 32 38 43 37 53 C 36 61 40 68 44 76 C 37 69 32 63 33 58 Z"
            fill="#FFFFFF"
          />
          {/* Middle swoosh */}
          <path
            d="M 43 55 C 45 40 54 28 62 18 C 55 28 50 38 48 49 C 46 58 50 67 54 75 C 47 67 42 61 43 55 Z"
            fill="#FFFFFF"
          />
          {/* Right swoosh */}
          <path
            d="M 54 53 C 56 42 63 32 70 23 C 64 31 59 40 58 49 C 57 56 61 63 65 70 C 58 64 53 58 54 53 Z"
            fill="#FFFFFF"
          />

          <defs>
            <radialGradient id="ecomate-bg-grad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="45%" stopColor="#1D4ED8" />
              <stop offset="85%" stopColor="#0B1954" />
              <stop offset="100%" stopColor="#050C2A" />
            </radialGradient>
            <linearGradient id="ecomate-glow-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showWordmark && (
        <span className={wordmarkClassName}>
          Eco<span className="text-indigo-600 dark:text-indigo-400">Mate</span>
        </span>
      )}
    </div>
  );
};
