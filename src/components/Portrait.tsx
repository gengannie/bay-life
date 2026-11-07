import React from 'react';
import { SimAppearance } from '../types/game';

interface PortraitProps {
  appearance: SimAppearance;
  size?: number;
  className?: string;
  ringColor?: string;
  mood?: 'happy' | 'neutral' | 'tired';
}

function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16) || 0xd4a373;
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

export const Portrait: React.FC<PortraitProps> = ({
  appearance,
  size = 48,
  className = '',
  ringColor,
  mood = 'happy',
}) => {
  const skin = appearance.skin || '#E8B89A';
  const skinShadow = shadeColor(skin, -0.1);
  const hairColor = appearance.hairColor || '#18181B';
  const topColor = appearance.topColor || '#007AFF';
  const clipId = React.useId().replace(/:/g, '');

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: ringColor ? `0 0 0 2.5px ${ringColor}` : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <defs>
          <clipPath id={`clip-${clipId}`}>
            <circle cx="32" cy="32" r="32" />
          </clipPath>
          <linearGradient id={`bg-${clipId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#clip-${clipId})`}>
          <rect width="64" height="64" fill={`url(#bg-${clipId})`} />

          {/* Back hair for long/waves/bob */}
          {appearance.hair === 'waves' && (
            <path
              d="M14,24 Q14,8 32,8 Q50,8 50,24 L52,50 L12,50 Z"
              fill={hairColor}
            />
          )}
          {appearance.hair === 'bob' && (
            <path
              d="M15,24 Q15,9 32,9 Q49,9 49,24 L49,41 L15,41 Z"
              fill={hairColor}
            />
          )}
          {appearance.hair === 'bun' && (
            <circle cx="32" cy="10" r="8" fill={hairColor} />
          )}

          {/* Shoulders / Outfit */}
          <path d="M8,64 Q12,45 32,44 Q52,45 56,64 Z" fill={topColor} />

          {/* Outfit Details */}
          {appearance.outfit === 'patagonia' && (
            <>
              {/* Down vest panels over shirt */}
              <path d="M15,47 L25,45 L25,64 L12,64 Z" fill="#1E293B" />
              <path d="M49,47 L39,45 L39,64 L52,64 Z" fill="#1E293B" />
              <rect x="41" y="51" width="6" height="3" rx="1" fill="#F97316" />
            </>
          )}
          {appearance.outfit === 'ychoodie' && (
            <>
              <path
                d="M23,44 Q32,51 41,44"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
              <line x1="28" y1="47" x2="28" y2="56" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="36" y1="47" x2="36" y2="56" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
          {appearance.outfit === 'turtleneck' && (
            <rect x="25" y="40" width="14" height="7" rx="2" fill={topColor} />
          )}
          {appearance.outfit === 'founderlinen' && (
            <path d="M25,44 L32,58 L39,44" fill="#F8FAFC" />
          )}

          {/* Neck */}
          <rect x="27" y="36" width="10" height="9" rx="4" fill={skinShadow} />

          {/* Ears */}
          <circle cx="18" cy="28" r="3.2" fill={skinShadow} />
          <circle cx="46" cy="28" r="3.2" fill={skinShadow} />

          {/* Head */}
          <rect x="19" y="14" width="26" height="27" rx="12.5" fill={skin} />

          {/* Hair Top */}
          {appearance.hair === 'lowcut' && (
            <path d="M19,23 Q19,12 32,12 Q45,12 45,23 Q32,18 19,23 Z" fill={hairColor} />
          )}
          {appearance.hair === 'textured' && (
            <path
              d="M18,24 Q17,10 32,10 Q47,10 46,24 Q40,18 32,19 Q24,18 18,24 Z"
              fill={hairColor}
            />
          )}
          {appearance.hair === 'parted' && (
            <path
              d="M18,24 Q18,11 32,11 Q46,11 46,24 Q38,16 25,21 Z"
              fill={hairColor}
            />
          )}
          {appearance.hair === 'curly' && (
            <g fill={hairColor}>
              <circle cx="23" cy="16" r="5.5" />
              <circle cx="32" cy="14" r="6" />
              <circle cx="41" cy="16" r="5.5" />
              <circle cx="19" cy="21" r="4.5" />
              <circle cx="45" cy="21" r="4.5" />
            </g>
          )}
          {(appearance.hair === 'bob' || appearance.hair === 'waves' || appearance.hair === 'bun') && (
            <path
              d="M18,24 Q19,11 32,11 Q45,11 46,24 Q38,17 32,18 Q26,17 18,24 Z"
              fill={hairColor}
            />
          )}

          {/* Eyes & Brows */}
          <path d="M23.5,23.5 Q26.5,22 29,23.5" fill="none" stroke={hairColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M35,23.5 Q37.5,22 40.5,23.5" fill="none" stroke={hairColor} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="26.5" cy="27" r="1.8" fill="#18181B" />
          <circle cx="37.5" cy="27" r="1.8" fill="#18181B" />
          <circle cx="27.1" cy="26.4" r="0.6" fill="#FFFFFF" />
          <circle cx="38.1" cy="26.4" r="0.6" fill="#FFFFFF" />

          {/* Nose */}
          <path d="M32,27 L31,31.5 L33,31.8" fill="none" stroke={skinShadow} strokeWidth="1.4" strokeLinecap="round" />

          {/* Mouth */}
          {mood === 'happy' && (
            <path d="M28,35 Q32,38.2 36,35" fill="none" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
          )}
          {mood === 'neutral' && (
            <line x1="28.5" y1="35.5" x2="35.5" y2="35.5" stroke="#881337" strokeWidth="1.7" strokeLinecap="round" />
          )}
          {mood === 'tired' && (
            <path d="M28.5,36.5 Q32,34.5 35.5,36.5" fill="none" stroke="#881337" strokeWidth="1.7" strokeLinecap="round" />
          )}

          {/* Accessories */}
          {appearance.accessory === 'glasses' && (
            <g stroke="#1E293B" strokeWidth="1.5" fill="rgba(255,255,255,0.22)">
              <rect x="22" y="24" width="8.5" height="6" rx="2" />
              <rect x="33.5" y="24" width="8.5" height="6" rx="2" />
              <line x1="30.5" y1="26.8" x2="33.5" y2="26.8" />
            </g>
          )}
          {appearance.accessory === 'airpodsmax' && (
            <g>
              <path
                d="M16,27 Q16,9 32,9 Q48,9 48,27"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              <rect x="13.5" y="22" width="5" height="10" rx="2.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
              <rect x="45.5" y="22" width="5" height="10" rx="2.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            </g>
          )}
          {appearance.accessory === 'visionpro' && (
            <g>
              <rect
                x="19.5"
                y="22.5"
                width="25"
                height="8.5"
                rx="4.2"
                fill="#1E293B"
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />
              <path
                d="M22,25 Q32,23.5 42,25"
                fill="none"
                stroke="rgba(168,85,247,0.75)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </svg>
    </span>
  );
};
