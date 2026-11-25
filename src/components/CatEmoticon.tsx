import React from 'react';
import {
  CAT_EMOTICON_LIBRARY,
  CAT_EMOTICON_MAP,
  resolveCatEmoticonId,
  type CatEmoticonId,
} from '../utils/catEmoticonLibrary';
import type { TodoBlockKey } from '../types/dailyTodo';

export type CatEmoticonVariant = 'medallion' | 'fullFace';

interface CatEmoticonIconProps {
  emoticonId?: string;
  text?: string;
  blockHint?: TodoBlockKey;
  sizeClass?: string;
  title?: string;
  variant?: CatEmoticonVariant;
}

/**
 * Companion-style MicioMiao Cat Icon Renderer:
 * - Same aesthetic as the Compagno del giorno chibi cat:
 *   big chubby obsidian-black head, coral-pink notched inner ears,
 *   messy fur tuft, cream-glossy expressive eyes, tiny coral nose,
 *   sleek black outer whiskers, soft pastel lilac backdrop & cute mini outfits/props.
 */
export const CatEmoticonIcon: React.FC<CatEmoticonIconProps> = ({
  emoticonId,
  text = '',
  blockHint,
  sizeClass = 'h-[20px] w-[20px]',
  title,
  variant = 'medallion',
}) => {
  const resolvedId = resolveCatEmoticonId(emoticonId, text, blockHint);
  const meta = CAT_EMOTICON_MAP[resolvedId];
  const isFullFace = variant === 'fullFace';

  const renderFaceExpression = () => {
    switch (resolvedId) {
      case 'cat_happy':
        return (
          <>
            {/* Happy curved sparkling companion eyes */}
            <path
              d="M8.6 15.8 C10.2 12.6 13.6 12.6 15.2 15.8"
              stroke="#FAF1D8"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M20.8 15.8 C22.4 12.6 25.8 12.6 27.4 15.8"
              stroke="#FAF1D8"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M14.2 21.8 Q18 27.2 21.8 21.8 Z"
              fill="#F48A94"
              stroke="#0B080C"
              strokeWidth="0.7"
            />
          </>
        );
      case 'cat_love':
        return (
          <>
            <path
              d="M11.7 17.8 C8.5 15.6 8.6 12.1 10.9 12.1 C11.6 12.1 12 12.9 12 12.9 C12 12.9 12.4 12.1 13.1 12.1 C15.4 12.1 15.5 15.6 12.3 17.8 L12 18.2 Z"
              fill="#F48A94"
              stroke="#FAF1D8"
              strokeWidth="0.6"
            />
            <path
              d="M23.7 17.8 C20.5 15.6 20.6 12.1 22.9 12.1 C23.6 12.1 24 12.9 24 12.9 C24 12.9 24.4 12.1 25.1 12.1 C27.4 12.1 27.5 15.6 24.3 17.8 L24 18.2 Z"
              fill="#F48A94"
              stroke="#FAF1D8"
              strokeWidth="0.6"
            />
            <path
              d="M14.5 21.8 Q16.2 23.8 18 22 Q19.8 23.8 21.5 21.8"
              stroke="#FAF1D8"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'cat_sleep':
        return (
          <>
            <path
              d="M9.2 15.8 Q12.1 18.5 15 15.8"
              stroke="#FAF1D8"
              strokeWidth="2.1"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M21 15.8 Q23.9 18.5 26.8 15.8"
              stroke="#FAF1D8"
              strokeWidth="2.1"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="18" cy="22.8" r="1.35" fill="#F48A94" />
          </>
        );
      case 'cat_sad':
        return (
          <>
            <path
              d="M9.5 12.2 Q12.2 10.6 14.6 11.4"
              stroke="#C4B5FD"
              strokeWidth="1.25"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M21.4 11.4 Q23.8 10.6 26.5 12.2"
              stroke="#C4B5FD"
              strokeWidth="1.25"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="12.1" cy="15.6" rx="2.75" ry="2.9" fill="#FAF1D8" />
            <circle cx="12.2" cy="16.1" r="1.45" fill="#0B080C" />
            <circle cx="12.8" cy="14.9" r="0.7" fill="#FFFFFF" />
            <ellipse cx="23.9" cy="15.6" rx="2.75" ry="2.9" fill="#FAF1D8" />
            <circle cx="24" cy="16.1" r="1.45" fill="#0B080C" />
            <circle cx="24.6" cy="14.9" r="0.7" fill="#FFFFFF" />
            <path
              d="M9.2 18.4 C8.2 20.2 9.4 21.8 10.5 20.6 C11.1 19.9 10.5 18.7 9.2 18.4 Z"
              fill="#60A5FA"
            />
            <path
              d="M15 23.2 Q18 21.2 21 23.2"
              stroke="#FAF1D8"
              strokeWidth="1.45"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'cat_think':
        return (
          <>
            <path
              d="M9.4 11.4 Q12.1 10.2 14.6 11.3"
              stroke="#FAF1D8"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M21.4 12.2 Q23.9 13 26.4 11.7"
              stroke="#FAF1D8"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="12.1" cy="15.4" rx="2.75" ry="2.8" fill="#FAF1D8" />
            <circle cx="12.8" cy="14.9" r="1.45" fill="#0B080C" />
            <circle cx="13.2" cy="14.2" r="0.65" fill="#FFFFFF" />
            <ellipse cx="23.9" cy="15.4" rx="2.75" ry="2.8" fill="#FAF1D8" />
            <circle cx="24.6" cy="14.9" r="1.45" fill="#0B080C" />
            <circle cx="25" cy="14.2" r="0.65" fill="#FFFFFF" />
            <path
              d="M15.2 22.3 Q18 21.5 20.8 22.7"
              stroke="#FAF1D8"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'cat_sun':
        return (
          <>
            {/* Sleek dark sunglasses over companion eyes */}
            <rect
              x="7.2"
              y="12.5"
              width="9.4"
              height="5.8"
              rx="2"
              fill="#0B080C"
              stroke="#FAF1D8"
              strokeWidth="1.15"
            />
            <rect
              x="19.4"
              y="12.5"
              width="9.4"
              height="5.8"
              rx="2"
              fill="#0B080C"
              stroke="#FAF1D8"
              strokeWidth="1.15"
            />
            <line x1="16.6" y1="14.5" x2="19.4" y2="14.5" stroke="#FAF1D8" strokeWidth="1.3" />
            <line x1="8.8" y1="13.8" x2="11.4" y2="16.8" stroke="#38BDF8" strokeWidth="1.15" strokeLinecap="round" />
            <line x1="21" y1="13.8" x2="23.6" y2="16.8" stroke="#38BDF8" strokeWidth="1.15" strokeLinecap="round" />
            <path
              d="M14.8 21.7 Q18.2 24 21.3 21.4"
              stroke="#FAF1D8"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      default:
        return (
          <>
            {/* Signature Compagno del giorno wide glossy cream-amber eyes */}
            <ellipse cx="12.1" cy="15.4" rx="2.85" ry="2.95" fill="#FAF1D8" />
            <circle cx="12.45" cy="15.55" r="1.55" fill="#0B080C" />
            <circle cx="13.1" cy="14.4" r="0.72" fill="#FFFFFF" />
            <circle cx="11.6" cy="16.5" r="0.4" fill="#FFFFFF" opacity="0.85" />

            <ellipse cx="23.9" cy="15.4" rx="2.85" ry="2.95" fill="#FAF1D8" />
            <circle cx="24.25" cy="15.55" r="1.55" fill="#0B080C" />
            <circle cx="24.9" cy="14.4" r="0.72" fill="#FFFFFF" />
            <circle cx="23.4" cy="16.5" r="0.4" fill="#FFFFFF" opacity="0.85" />

            {/* Cheerful cat :3 mouth */}
            <path
              d="M14.3 21.6 Q16.1 23.6 18 21.8 Q19.9 23.6 21.7 21.6"
              stroke="#FAF1D8"
              strokeWidth="1.45"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
    }
  };

  const renderHeadwear = () => {
    switch (resolvedId) {
      case 'cat_fuel':
        return (
          <g>
            {/* Attendant cap with red stripe */}
            <path
              d="M10.2 7.4 C12.5 3.6 23.5 3.6 25.8 7.4 L26.5 9.6 Q18 8.2 9.5 9.6 Z"
              fill="#EA580C"
              stroke="#0B080C"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M13 7.8 H23" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M9.2 9.4 Q18 7.8 27.6 10.1" stroke="#0B080C" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        );
      case 'cat_barber':
        return (
          <g transform="translate(13.2, 2.2)">
            {/* Classic barber-pole ribbon crest */}
            <rect x="0" y="0" width="9.6" height="4.4" rx="1.6" fill="#FFFFFF" stroke="#0B080C" strokeWidth="0.9" />
            <line x1="2.2" y1="0.4" x2="3.8" y2="4" stroke="#EF4444" strokeWidth="1.4" />
            <line x1="5.4" y1="0.4" x2="7" y2="4" stroke="#2563EB" strokeWidth="1.4" />
          </g>
        );
      case 'cat_shower':
        return (
          <g>
            {/* Fluffy pastel sky shower cap + crisp soap bubbles */}
            <path
              d="M7.2 10 C8.8 3.2 27.2 3.2 28.8 10 Q18 8.1 7.2 10 Z"
              fill="#BAE6FD"
              stroke="#0284C7"
              strokeWidth="1"
            />
            <circle cx="28" cy="5.5" r="2.5" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.8" />
            <circle cx="31.2" cy="8.5" r="1.7" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.7" />
            <circle cx="5.8" cy="7.5" r="1.8" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.7" />
          </g>
        );
      case 'cat_clean':
        return (
          <g>
            {/* Mint-teal cleaning bandana */}
            <path
              d="M6.8 9.6 Q18 5.2 29.2 9.6 L29.6 12 Q18 9.4 6.4 12 Z"
              fill="#14B8A6"
              stroke="#0B080C"
              strokeWidth="0.9"
            />
            <circle cx="13.5" cy="9" r="0.9" fill="#CCFBF1" />
            <circle cx="18" cy="8.2" r="1" fill="#CCFBF1" />
            <circle cx="22.5" cy="9" r="0.9" fill="#CCFBF1" />
          </g>
        );
      case 'cat_food':
        return (
          <g>
            {/* Fluffy white chef toque */}
            <path
              d="M10.5 7.4 C8.8 3.8 12.2 0.8 18 1.6 C23.8 0.8 27.2 3.8 25.5 7.4 Z"
              fill="#FFFFFF"
              stroke="#0B080C"
              strokeWidth="1"
            />
            <rect
              x="11.2"
              y="6.4"
              width="13.6"
              height="2.2"
              rx="0.9"
              fill="#F1F5F9"
              stroke="#0B080C"
              strokeWidth="0.8"
            />
          </g>
        );
      case 'cat_health':
        return (
          <g>
            {/* Doctor headband + green medical cross */}
            <rect
              x="11.4"
              y="2.2"
              width="13.2"
              height="6"
              rx="1.6"
              fill="#FFFFFF"
              stroke="#0B080C"
              strokeWidth="0.95"
            />
            <path d="M18 3.4 V7 M16.2 5.2 H19.8" stroke="#16A34A" strokeWidth="1.7" strokeLinecap="round" />
          </g>
        );
      case 'cat_work':
      case 'cat_bills':
        return (
          <g>
            {/* Gold wire-frame round scholar/banker glasses */}
            <circle
              cx="12.1"
              cy="15.4"
              r="4.35"
              fill="#FDE047"
              fillOpacity="0.1"
              stroke="#F59E0B"
              strokeWidth="1.35"
            />
            <circle
              cx="23.9"
              cy="15.4"
              r="4.35"
              fill="#FDE047"
              fillOpacity="0.1"
              stroke="#F59E0B"
              strokeWidth="1.35"
            />
            <line x1="16.45" y1="15.2" x2="19.55" y2="15.2" stroke="#F59E0B" strokeWidth="1.35" />
          </g>
        );
      case 'cat_car':
        return (
          <g>
            {/* Retro aviator goggles pushed up on forehead */}
            <path d="M6.4 9.6 Q18 7.8 29.6 9.6" stroke="#78350F" strokeWidth="2.1" fill="none" />
            <rect
              x="9.5"
              y="6.5"
              width="7.4"
              height="4.4"
              rx="1.9"
              fill="#38BDF8"
              stroke="#0B080C"
              strokeWidth="1"
            />
            <rect
              x="19.1"
              y="6.5"
              width="7.4"
              height="4.4"
              rx="1.9"
              fill="#38BDF8"
              stroke="#0B080C"
              strokeWidth="1"
            />
          </g>
        );
      case 'cat_sport':
        return (
          <g>
            <path
              d="M6.8 10 Q18 7.4 29.2 10 L29.6 12.5 Q18 9.8 6.4 12.5 Z"
              fill="#10B981"
              stroke="#0B080C"
              strokeWidth="0.9"
            />
            <path d="M7 11.2 Q18 8.6 29 11.2" stroke="#ECFDF5" strokeWidth="1" fill="none" />
          </g>
        );
      case 'cat_call':
      case 'cat_music': {
        const cupColor = resolvedId === 'cat_call' ? '#38BDF8' : '#C084FC';
        const arcColor = resolvedId === 'cat_call' ? '#0284C7' : '#7E22CE';
        return (
          <g>
            <path d="M3.4 15.6 C3.4 4.2 32.6 4.2 32.6 15.6" stroke={arcColor} strokeWidth="2.1" fill="none" />
            <rect x="1.2" y="13" width="4" height="6.8" rx="1.8" fill={cupColor} stroke="#0B080C" strokeWidth="0.9" />
            <rect x="30.8" y="13" width="4" height="6.8" rx="1.8" fill={cupColor} stroke="#0B080C" strokeWidth="0.9" />
          </g>
        );
      }
      case 'cat_sleep':
        return (
          <g>
            <path
              d="M11 7.8 C12.5 1.2 24.2 0.8 29.2 5.2 C26.5 7.4 24.4 8.2 22.2 8.2 Z"
              fill="#6366F1"
              stroke="#0B080C"
              strokeWidth="0.95"
            />
            <circle cx="29.8" cy="5.4" r="2.1" fill="#FDE68A" stroke="#0B080C" strokeWidth="0.7" />
          </g>
        );
      case 'cat_gift':
        return (
          <g>
            <path d="M17.7 5.8 C12.4 1.5 9.2 6.4 15.2 8.2 Z" fill="#FB7185" stroke="#0B080C" strokeWidth="0.85" />
            <path d="M18.3 5.8 C23.6 1.5 26.8 6.4 20.8 8.2 Z" fill="#FB7185" stroke="#0B080C" strokeWidth="0.85" />
            <circle cx="18" cy="6.6" r="2" fill="#FFF1F2" stroke="#0B080C" strokeWidth="0.85" />
          </g>
        );
      case 'cat_idea':
        return (
          <g transform="translate(24, 0.2)">
            <circle cx="5" cy="4.8" r="3.9" fill="#FDE047" stroke="#0B080C" strokeWidth="0.9" />
            <rect x="3.5" y="8.4" width="3" height="2" rx="0.6" fill="#64748B" stroke="#0B080C" strokeWidth="0.6" />
            <line x1="5" y1="-0.8" x2="5" y2="0.4" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        );
      case 'cat_fire':
        return (
          <g transform="translate(24.5, 0.4)">
            <path
              d="M4.8 0.5 C7 3.4 8.6 5 8 7.5 C7.5 9.5 5.8 10.5 4.2 10.5 C2.2 10.5 1 8.8 1.3 6.8 C1.6 5.4 2.6 4.4 3.2 3.6 C3.3 4.6 4 5.1 4.5 4.4 C5 3.6 4.5 1.8 4.8 0.5 Z"
              fill="#FB923C"
              stroke="#0B080C"
              strokeWidth="0.85"
            />
            <path d="M4.5 5 C5.4 6.2 5.8 7.8 4.4 8.9 C3.2 8.2 3.5 6.2 4.5 5 Z" fill="#FEF08A" />
          </g>
        );
      case 'cat_happy':
        return (
          <g>
            <path
              d="M5.5 3.5 L6.2 5.5 L8.2 6.2 L6.2 6.9 L5.5 8.9 L4.8 6.9 L2.8 6.2 L4.8 5.5 Z"
              fill="#FDE047"
              stroke="#0B080C"
              strokeWidth="0.6"
            />
            <path
              d="M30.5 3.5 L31.1 5.2 L32.8 5.8 L31.1 6.4 L30.5 8.1 L29.9 6.4 L28.2 5.8 L29.9 5.2 Z"
              fill="#FDE047"
              stroke="#0B080C"
              strokeWidth="0.6"
            />
          </g>
        );
      case 'cat_sad':
        return (
          <g>
            {/* Cozy warm knitted lavender-rose scarf around neck */}
            <path
              d="M8.8 25.8 Q18 28.8 27.2 25.8 L26.5 29.8 Q18 31.8 9.5 29.8 Z"
              fill="#60A5FA"
              stroke="#0B080C"
              strokeWidth="0.9"
            />
            <rect
              x="20"
              y="26.8"
              width="3.6"
              height="6.4"
              rx="1.2"
              fill="#3B82F6"
              stroke="#0B080C"
              strokeWidth="0.85"
            />
          </g>
        );
      default:
        return null;
    }
  };

  const renderObjectProp = () => {
    switch (resolvedId) {
      case 'cat_fuel':
        return (
          <g transform="translate(21.5, 19.6)">
            {/* Red fuel pump + nozzle hose */}
            <rect x="1.5" y="2" width="8.2" height="11" rx="1.6" fill="#EF4444" stroke="#0B080C" strokeWidth="1" />
            <rect x="3" y="3.8" width="5.2" height="3.2" rx="0.6" fill="#FEF08A" stroke="#0B080C" strokeWidth="0.65" />
            <path d="M9.7 5 C12.4 5 12.6 10.6 10.4 11.4" stroke="#0B080C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M10.4 10.4 L12.8 9.2" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            <text x="5.6" y="10.8" textAnchor="middle" fontSize="3.4" fontWeight="900" fill="#FFFFFF">
              GPL
            </text>
          </g>
        );
      case 'cat_barber':
        return (
          <g transform="translate(21, 19.5)">
            {/* Silver barber scissors badge */}
            <circle cx="6.8" cy="6.8" r="6.4" fill="#FFF1F2" stroke="#0B080C" strokeWidth="0.95" />
            <line x1="3.4" y1="3" x2="10.4" y2="9.4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10.4" y1="3" x2="3.4" y2="9.4" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="3.2" cy="9.8" r="1.5" fill="none" stroke="#EC4899" strokeWidth="1.2" />
            <circle cx="10.4" cy="9.8" r="1.5" fill="none" stroke="#EC4899" strokeWidth="1.2" />
          </g>
        );
      case 'cat_car':
        return (
          <g transform="translate(20.5, 20.5)">
            {/* Red mini car / wheel prop */}
            <path
              d="M1.2 7.5 L2.8 3.6 H10.2 L11.8 7.5 V10.6 H1.2 Z"
              fill="#3B82F6"
              stroke="#0B080C"
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
            <rect x="3.5" y="4.5" width="6" height="2.4" rx="0.5" fill="#E0F2FE" />
            <circle cx="3.6" cy="10.8" r="1.8" fill="#1E293B" stroke="#FFFFFF" strokeWidth="0.6" />
            <circle cx="9.4" cy="10.8" r="1.8" fill="#1E293B" stroke="#FFFFFF" strokeWidth="0.6" />
          </g>
        );
      case 'cat_shower':
        return (
          <g transform="translate(21.5, 20.2)">
            {/* Sparkling water droplets */}
            <path d="M5 1.2 C7 4.2 8.2 6.2 8.2 7.8 A3.2 3.2 0 1 1 1.8 7.8 C1.8 6.2 3 4.2 5 1.2 Z" fill="#38BDF8" stroke="#0B080C" strokeWidth="0.9" />
            <circle cx="4.1" cy="7.3" r="0.9" fill="#E0F2FE" />
            <path d="M10.5 6.2 C11.5 7.8 12.2 8.9 12.2 9.8 A1.7 1.7 0 1 1 8.8 9.8 C8.8 8.9 9.5 7.8 10.5 6.2 Z" fill="#7DD3FC" stroke="#0B080C" strokeWidth="0.8" />
          </g>
        );
      case 'cat_clean':
        return (
          <g transform="translate(21.8, 19.2) rotate(-18)">
            {/* Classic broom & sparkle */}
            <line x1="5" y1="0" x2="5" y2="8.4" stroke="#D97706" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M1.4 8.2 H8.6 L9.8 13.4 H0.2 Z" fill="#FBBF24" stroke="#0B080C" strokeWidth="0.9" strokeLinejoin="round" />
          </g>
        );
      case 'cat_home':
        return (
          <g transform="translate(21, 20.4)">
            <path d="M0.6 5.8 L6.6 0.8 L12.6 5.8 V11.4 H0.6 Z" fill="#99F6E4" stroke="#0B080C" strokeWidth="1" strokeLinejoin="round" />
            <path d="M0 6 L6.6 0.4 L13.2 6" stroke="#0F766E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <rect x="4.9" y="6.8" width="3.4" height="4.6" rx="0.5" fill="#0F766E" />
          </g>
        );
      case 'cat_bills':
        return (
          <g transform="translate(20, 21)">
            {/* Golden payment card + coin */}
            <rect x="0.5" y="1" width="12.5" height="8.6" rx="1.8" fill="#FBBF24" stroke="#0B080C" strokeWidth="1" />
            <line x1="1.5" y1="3.8" x2="12" y2="3.8" stroke="#78350F" strokeWidth="1.5" />
            <text x="9.6" y="8.2" fontSize="4.2" fontWeight="900" fill="#78350F">
              €
            </text>
          </g>
        );
      case 'cat_pet':
        return (
          <g transform="translate(21.5, 20.2)">
            <circle cx="6.2" cy="6.2" r="6" fill="#FCE7F3" stroke="#0B080C" strokeWidth="0.9" />
            <ellipse cx="6.2" cy="7.8" rx="2.4" ry="1.9" fill="#EC4899" />
            <circle cx="3.4" cy="4.7" r="1.05" fill="#EC4899" />
            <circle cx="6.2" cy="3.6" r="1.05" fill="#EC4899" />
            <circle cx="9" cy="4.7" r="1.05" fill="#EC4899" />
          </g>
        );
      case 'cat_health':
        return (
          <g transform="translate(21.2, 20.4)">
            {/* Green cross + pill capsule */}
            <rect x="0.5" y="2.2" width="11.5" height="9.2" rx="2" fill="#ECFDF5" stroke="#0B080C" strokeWidth="0.95" />
            <path d="M6.25 4.2 V9.4 M3.65 6.8 H8.85" stroke="#16A34A" strokeWidth="2.1" strokeLinecap="round" />
          </g>
        );
      case 'cat_shop':
        return (
          <g transform="translate(21, 20)">
            <path d="M1 3.6 H11 L10 11.8 H2 Z" fill="#3B82F6" stroke="#0B080C" strokeWidth="1" strokeLinejoin="round" />
            <path d="M3.8 3.6 C3.8 1 8.2 1 8.2 3.6" stroke="#0B080C" strokeWidth="1.3" fill="none" />
            <circle cx="6" cy="7.5" r="1.5" fill="#DBEAFE" />
          </g>
        );
      case 'cat_food':
        return (
          <g transform="translate(20.6, 20.6)">
            {/* Plate + fork */}
            <circle cx="6.4" cy="6.4" r="5.6" fill="#FFF7ED" stroke="#0B080C" strokeWidth="0.95" />
            <circle cx="6.4" cy="6.4" r="3.4" fill="#FED7AA" />
            <line x1="5.2" y1="3.4" x2="5.2" y2="9.4" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7.8" y1="3.4" x2="7.8" y2="9.4" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        );
      case 'cat_coffee':
        return (
          <g transform="translate(20.8, 20.2)">
            {/* Steaming ceramic coffee cup */}
            <path d="M3 1 C2.2 0 4 -0.4 3.2 -1.2" stroke="#9A3412" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <path d="M6.2 1 C5.4 0 7.2 -0.4 6.4 -1.2" stroke="#9A3412" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <rect x="0.8" y="2.6" width="9" height="8" rx="2.2" fill="#FFF7ED" stroke="#0B080C" strokeWidth="1" />
            <path d="M9.8 4.4 C12.2 4.4 12.2 8 9.8 8" stroke="#0B080C" strokeWidth="1.2" fill="none" />
            <path d="M2.2 5.4 H8.4" stroke="#C2410C" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        );
      case 'cat_call':
        return (
          <g transform="translate(21.6, 20)">
            <rect x="1" y="0.5" width="7.4" height="11.6" rx="1.8" fill="#0EA5E9" stroke="#0B080C" strokeWidth="0.95" />
            <rect x="2.2" y="2.1" width="5" height="7.6" rx="0.8" fill="#E0F2FE" />
            <circle cx="4.7" cy="10.8" r="0.65" fill="#FFFFFF" />
          </g>
        );
      case 'cat_work':
        return (
          <g>
            {/* Red necktie + tiny briefcase */}
            <path d="M16.4 27.6 H19.6 L19 32.8 L18 33.8 L17 32.8 Z" fill="#EF4444" stroke="#0B080C" strokeWidth="0.8" />
            <g transform="translate(21.5, 21.8)">
              <rect x="0" y="2" width="11" height="8" rx="1.6" fill="#92400E" stroke="#0B080C" strokeWidth="0.95" />
              <path d="M3.4 2 V0.8 H7.6 V2" stroke="#0B080C" strokeWidth="1" fill="none" />
              <rect x="4.6" y="5" width="1.8" height="1.5" rx="0.4" fill="#FDE047" />
            </g>
          </g>
        );
      case 'cat_book':
        return (
          <g transform="translate(20, 20.6)">
            {/* Classic diary companion lilac notebook & pen */}
            <path
              d="M0.6 1.8 Q3.8 0 6.8 1.8 Q9.8 0 13 1.8 V10 Q9.8 8.4 6.8 10 Q3.8 8.4 0.6 10 Z"
              fill="#EDE9FE"
              stroke="#0B080C"
              strokeWidth="0.95"
            />
            <line x1="6.8" y1="1.8" x2="6.8" y2="10" stroke="#5B21B6" strokeWidth="1" />
          </g>
        );
      case 'cat_sport':
        return (
          <g transform="translate(20, 21.5)">
            {/* Dumbbell */}
            <rect x="2.5" y="4.2" width="7.5" height="2" rx="0.8" fill="#94A3B8" stroke="#0B080C" strokeWidth="0.8" />
            <rect x="0.4" y="2" width="2.8" height="6.4" rx="1.1" fill="#10B981" stroke="#0B080C" strokeWidth="0.9" />
            <rect x="9.3" y="2" width="2.8" height="6.4" rx="1.1" fill="#10B981" stroke="#0B080C" strokeWidth="0.9" />
          </g>
        );
      case 'cat_music':
        return (
          <g transform="translate(22, 19.6)">
            <circle cx="6" cy="6.2" r="5.6" fill="#F3E8FF" stroke="#0B080C" strokeWidth="0.9" />
            <path d="M4.5 8.5 V3.6 L9 2.6 V7.4" stroke="#7E22CE" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="3.7" cy="8.7" r="1.25" fill="#7E22CE" />
            <circle cx="8.2" cy="7.6" r="1.25" fill="#7E22CE" />
          </g>
        );
      case 'cat_movie':
        return (
          <g transform="translate(20.6, 20.5)">
            <rect x="0.4" y="2" width="11.5" height="8.5" rx="1.5" fill="#F472B6" stroke="#0B080C" strokeWidth="0.95" />
            <path d="M0.4 2 H11.9 V4.2 H0.4 Z" fill="#1E293B" />
            <path d="M4.6 5.2 L8.6 7.3 L4.6 9.4 Z" fill="#FFFFFF" />
          </g>
        );
      case 'cat_game':
        return (
          <g transform="translate(19.6, 21.2)">
            <rect x="0.5" y="1.6" width="12.5" height="7.4" rx="3.4" fill="#6366F1" stroke="#0B080C" strokeWidth="0.95" />
            <path d="M4 3.8 V6.8 M2.5 5.3 H5.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="9.2" cy="4.6" r="0.9" fill="#FDE047" />
            <circle cx="10.7" cy="6.1" r="0.9" fill="#FB7185" />
          </g>
        );
      case 'cat_gift':
        return (
          <g transform="translate(21, 20.5)">
            <rect x="0.8" y="2.8" width="10.4" height="8.4" rx="1.4" fill="#FB7185" stroke="#0B080C" strokeWidth="0.95" />
            <rect x="0" y="1.4" width="12" height="2.4" rx="0.8" fill="#FDA4AF" stroke="#0B080C" strokeWidth="0.85" />
            <line x1="6" y1="1.4" x2="6" y2="11.2" stroke="#FFF1F2" strokeWidth="1.6" />
          </g>
        );
      case 'cat_sun':
        return (
          <g transform="translate(22.2, 0.2)">
            <circle cx="5.2" cy="5.2" r="3.4" fill="#FDE047" stroke="#0B080C" strokeWidth="0.8" />
            <line x1="5.2" y1="0" x2="5.2" y2="1.1" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="5.2" y1="9.3" x2="5.2" y2="10.4" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="0" y1="5.2" x2="1.1" y2="5.2" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="9.3" y1="5.2" x2="10.4" y2="5.2" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        );
      case 'cat_baby':
      case 'cat_love':
        return (
          <g transform="translate(20.6, 20.4)">
            <path
              d="M6.4 10.6 C1.4 7.4 1.5 1.8 5 1.8 C6 1.8 6.4 2.9 6.4 2.9 C6.4 2.9 6.8 1.8 7.8 1.8 C11.3 1.8 11.4 7.4 6.4 10.6 Z"
              fill="#F48A94"
              stroke="#0B080C"
              strokeWidth="0.95"
            />
          </g>
        );
      case 'cat_sleep':
        return (
          <g transform="translate(22.4, 20)">
            <path
              d="M8.5 1.5 A4.6 4.6 0 1 0 10.5 9.2 A3.6 3.6 0 1 1 8.5 1.5 Z"
              fill="#FDE047"
              stroke="#0B080C"
              strokeWidth="0.85"
            />
          </g>
        );
      case 'cat_think':
        return (
          <g transform="translate(21.2, 19.8)">
            <circle cx="5.2" cy="5.2" r="4.2" fill="#E0F2FE" stroke="#0B080C" strokeWidth="1.2" />
            <line x1="8.3" y1="8.3" x2="11.8" y2="11.8" stroke="#0B080C" strokeWidth="2.1" strokeLinecap="round" />
          </g>
        );
      case 'cat_note':
      default:
        return (
          <g transform="translate(21, 20.2)">
            {/* Classic diary pad + yellow pencil */}
            <rect x="0.6" y="1" width="9.8" height="10.6" rx="1.8" fill="#FAF5E8" stroke="#0B080C" strokeWidth="0.95" />
            <line x1="2.6" y1="3.8" x2="8.2" y2="3.8" stroke="#7C3AED" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="2.6" y1="6.4" x2="7.6" y2="6.4" stroke="#A78BFA" strokeWidth="1.1" strokeLinecap="round" />
            <g transform="translate(8, -0.8) rotate(26)">
              <rect x="0" y="0" width="2.8" height="8" rx="0.6" fill="#FACC15" stroke="#0B080C" strokeWidth="0.7" />
              <rect x="0" y="0" width="2.8" height="1.8" rx="0.4" fill="#F48A94" />
            </g>
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 36 36"
      className={`${sizeClass} shrink-0 select-none overflow-visible`}
      aria-label={title || meta.label}
      role="img"
    >
      {/* Signature soft pastel lavender medallion from the Compagno del giorno illustrations */}
      <circle
        cx="18"
        cy="18.6"
        r={isFullFace ? 16.5 : 16.2}
        fill="#DCC0FC"
        stroke={isFullFace ? '#8B64C9' : '#9D77DC'}
        strokeWidth="1.05"
      />
      <circle cx="18" cy="18.6" r="14.7" fill="#E8D4FD" opacity="0.55" />

      {/* Tiny companion body & paws peeking below chin */}
      <path
        d="M11 29.8 C11.4 26.8 24.6 26.8 25 29.8 C25 32.8 11 32.8 11 29.8 Z"
        fill="#1F191E"
        stroke="#0B080C"
        strokeWidth="1"
      />
      <ellipse cx="12.8" cy="29.4" rx="2.6" ry="2" fill="#2A2229" stroke="#0B080C" strokeWidth="0.9" />
      <ellipse cx="23.2" cy="29.4" rx="2.6" ry="2" fill="#2A2229" stroke="#0B080C" strokeWidth="0.9" />

      {/* Big Chubby Obsidian Companion Cat Head + Notched Fur Tuft */}
      <path
        d="M6.4 12.2 L4.4 2.4 L12.5 7 C13.8 5.2 14.9 4.2 15.8 6.4 C16.6 4.4 17.7 4 18.7 6.4 C19.8 4.9 21.1 5.6 23.5 7 L31.6 2.4 L29.6 12.2 C31.8 14.6 32.8 17.8 32.2 21.2 C31.2 26.8 25.4 29.8 18 29.8 C10.6 29.8 4.8 26.8 3.8 21.2 C3.2 17.8 4.2 14.6 6.4 12.2 Z"
        fill="#1E191D"
        stroke="#0B080C"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Warm salmon-coral inner ears matching Compagno del giorno */}
      <path d="M7.5 11.2 L6.1 4.7 L11.5 8.1 Z" fill="#F9989B" />
      <path d="M28.5 11.2 L29.9 4.7 L24.5 8.1 Z" fill="#F9989B" />

      {/* Soft coral cheek glow & tiny coral-pink cat nose (NO cream muzzle patch) */}
      <ellipse cx="8.2" cy="20.4" rx="2.2" ry="1.25" fill="#F48A94" opacity="0.45" />
      <ellipse cx="27.8" cy="20.4" rx="2.2" ry="1.25" fill="#F48A94" opacity="0.45" />
      <path d="M16.5 19.3 H19.5 L18 21 Z" fill="#F48A94" />

      {/* Crisp black outer whiskers extending against pastel lavender */}
      <line x1="0.8" y1="18.2" x2="7.4" y2="19.3" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />
      <line x1="0.4" y1="21.1" x2="7.2" y2="21.1" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />
      <line x1="1.2" y1="23.9" x2="7.5" y2="22.8" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />
      <line x1="35.2" y1="18.2" x2="28.6" y2="19.3" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />
      <line x1="35.6" y1="21.1" x2="28.8" y2="21.1" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />
      <line x1="34.8" y1="23.9" x2="28.5" y2="22.8" stroke="#0B080C" strokeWidth="1.05" strokeLinecap="round" />

      {/* Glossy Companion Cat Eyes & Mouth */}
      {renderFaceExpression()}

      {/* Headwear / Glasses / Hats */}
      {renderHeadwear()}

      {/* In-hand / Foreground Activity Prop or Symbol */}
      {renderObjectProp()}
    </svg>
  );
};

interface CatEmoticonPickerProps {
  value: CatEmoticonId;
  isAuto?: boolean;
  onSelect: (id: CatEmoticonId) => void;
  onResetAuto?: () => void;
  variant?: CatEmoticonVariant;
}

export const CatEmoticonPicker: React.FC<CatEmoticonPickerProps> = ({
  value,
  isAuto = false,
  onSelect,
  onResetAuto,
  variant = 'medallion',
}) => {
  return (
    <div className="rounded-xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold text-[var(--todo-text)]">
          Icona gatto ({CAT_EMOTICON_MAP[value].label})
        </span>
        {onResetAuto && (
          <button
            type="button"
            onClick={onResetAuto}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              isAuto
                ? 'border-[var(--todo-accent)] bg-[var(--todo-accent)] text-white'
                : 'border-[var(--todo-card-border)] bg-[var(--todo-card)] text-[var(--todo-text)] hover:bg-[var(--todo-accent-soft)]'
            }`}
          >
            Auto
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-48 overflow-y-auto pr-0.5">
        {CAT_EMOTICON_LIBRARY.map((cat) => {
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              title={cat.label}
              aria-label={`Icona gatto: ${cat.label}`}
              aria-pressed={active}
              onClick={() => onSelect(cat.id)}
              className={`flex h-9 items-center justify-center rounded-lg border transition-all ${
                active
                  ? 'border-[var(--todo-accent)] bg-[var(--todo-accent-soft)] ring-1 ring-[var(--todo-accent)] scale-[1.03]'
                  : 'border-[var(--todo-note-border)] bg-[var(--todo-card)] hover:border-[var(--todo-accent)] hover:bg-[var(--todo-accent-soft)]'
              }`}
            >
              <CatEmoticonIcon
                emoticonId={cat.id}
                variant={variant}
                sizeClass="h-7 w-7"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
