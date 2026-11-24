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

export const CatEmoticonIcon: React.FC<CatEmoticonIconProps> = ({
  emoticonId,
  text = '',
  blockHint,
  sizeClass = 'h-[17px] w-[17px]',
  title,
  variant = 'medallion',
}) => {
  const resolvedId = resolveCatEmoticonId(emoticonId, text, blockHint);
  const meta = CAT_EMOTICON_MAP[resolvedId];

  if (variant === 'fullFace') {
    const renderFullFaceEyesAndMouth = () => {
      switch (resolvedId) {
        case 'cat_happy':
          return (
            <>
              <path
                d="M7.8 17 C9.2 13.8 12.2 13.8 13.6 17"
                stroke="#FAF5E8"
                strokeWidth="2.3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M18.4 17 C19.8 13.8 22.8 13.8 24.2 17"
                stroke="#FAF5E8"
                strokeWidth="2.3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M12.2 22.4 Q16 26.8 19.8 22.4"
                stroke="#FDA4AF"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          );
        case 'cat_sleep':
          return (
            <>
              <path
                d="M7.8 16.5 Q10.8 19 13.8 16.5"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M18.2 16.5 Q21.2 19 24.2 16.5"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="16" cy="23.8" r="1.4" fill="#F9A8D4" />
            </>
          );
        case 'cat_idea':
          return (
            <>
              <circle cx="10.8" cy="16.5" r="2.7" fill="#FEF08A" />
              <circle cx="21.2" cy="16.5" r="2.7" fill="#FEF08A" />
              <circle cx="11.4" cy="15.8" r="0.95" fill="#1C1917" />
              <circle cx="21.8" cy="15.8" r="0.95" fill="#1C1917" />
              <path
                d="M13 22.8 Q16 25.4 19 22.8"
                stroke="#FAF5E8"
                strokeWidth="1.7"
                strokeLinecap="round"
                fill="none"
              />
            </>
          );
        default:
          return (
            <>
              <circle cx="10.8" cy="16.5" r="2.6" fill="#FAF5E8" />
              <circle cx="21.2" cy="16.5" r="2.6" fill="#FAF5E8" />
              <circle cx="11.5" cy="15.7" r="1" fill="#1C1917" />
              <circle cx="21.9" cy="15.7" r="1" fill="#1C1917" />
              <path
                d="M13 22.8 Q14.6 24.4 16 22.9 Q17.4 24.4 19 22.8"
                stroke="#FAF5E8"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </>
          );
      }
    };

    const renderCostumeOrAccessory = () => {
      switch (resolvedId) {
        case 'cat_note':
          return (
            <>
              {/* Round blue reading glasses + pencil behind ear */}
              <circle cx="10.8" cy="16.5" r="4.1" fill="#60A5FA" fillOpacity="0.18" stroke="#60A5FA" strokeWidth="1.4" />
              <circle cx="21.2" cy="16.5" r="4.1" fill="#60A5FA" fillOpacity="0.18" stroke="#60A5FA" strokeWidth="1.4" />
              <line x1="14.9" y1="16.5" x2="17.1" y2="16.5" stroke="#60A5FA" strokeWidth="1.4" />
              <g transform="translate(22.5, 1.5) rotate(28)">
                <rect x="0" y="0" width="3.2" height="9.5" rx="0.8" fill="#FACC15" stroke="#854D0E" strokeWidth="0.7" />
                <rect x="0" y="0" width="3.2" height="2.2" rx="0.6" fill="#FB7185" />
              </g>
            </>
          );
        case 'cat_happy':
          return (
            <>
              {/* Festive party cone hat */}
              <path d="M11.2 8.2 L16 0.6 L20.8 8.2 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.9" strokeLinejoin="round" />
              <path d="M12.6 6 L19.4 6" stroke="#FEF08A" strokeWidth="1.3" />
              <circle cx="16" cy="1.2" r="1.5" fill="#2DD4BF" />
            </>
          );
        case 'cat_love':
          return (
            <>
              {/* Pink heart-shaped sunglasses + bowtie */}
              <path
                d="M6.4 15.8 C6.4 13.5 9.6 13.4 10.8 15.1 C12 13.4 15.2 13.5 15.2 15.8 C15.2 18.2 10.8 20.6 10.8 20.6 C10.8 20.6 6.4 18.2 6.4 15.8 Z"
                fill="#FB7185"
                fillOpacity="0.88"
                stroke="#FFF1F2"
                strokeWidth="0.9"
              />
              <path
                d="M16.8 15.8 C16.8 13.5 20 13.4 21.2 15.1 C22.4 13.4 25.6 13.5 25.6 15.8 C25.6 18.2 21.2 20.6 21.2 20.6 C21.2 20.6 16.8 18.2 16.8 15.8 Z"
                fill="#FB7185"
                fillOpacity="0.88"
                stroke="#FFF1F2"
                strokeWidth="0.9"
              />
              <line x1="14.9" y1="15.8" x2="17.1" y2="15.8" stroke="#FFF1F2" strokeWidth="1.1" />
              <path d="M11.5 27.6 L16 29.4 L11.5 31.2 Z" fill="#F472B6" />
              <path d="M20.5 27.6 L16 29.4 L20.5 31.2 Z" fill="#F472B6" />
              <circle cx="16" cy="29.4" r="1.3" fill="#FDF2F8" />
            </>
          );
        case 'cat_idea':
          return (
            <>
              {/* Glowing lightbulb headband on top of head */}
              <path d="M10.5 8.5 Q16 6.5 21.5 8.5" stroke="#F59E0B" strokeWidth="1.4" fill="none" />
              <circle cx="16" cy="4.2" r="3.4" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.9" />
              <rect x="14.5" y="7" width="3" height="1.8" rx="0.6" fill="#64748B" />
              <line x1="16" y1="0.2" x2="16" y2="1" stroke="#FACC15" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="11.2" y1="2.2" x2="12.2" y2="3" stroke="#FACC15" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="20.8" y1="2.2" x2="19.8" y2="3" stroke="#FACC15" strokeWidth="1.2" strokeLinecap="round" />
            </>
          );
        case 'cat_bills':
          return (
            <>
              {/* Golden banker monocle + emerald bowtie */}
              <circle cx="21.2" cy="16.5" r="4.2" fill="#FDE68A" fillOpacity="0.2" stroke="#FBBF24" strokeWidth="1.5" />
              <path d="M25.3 18.2 Q26.8 23.5 24 27.5" stroke="#FBBF24" strokeWidth="1.1" fill="none" strokeDasharray="1.5 1.2" />
              <path d="M11.5 27.5 L16 29.3 L11.5 31.1 Z" fill="#10B981" />
              <path d="M20.5 27.5 L16 29.3 L20.5 31.1 Z" fill="#10B981" />
              <circle cx="16" cy="29.3" r="1.4" fill="#FBBF24" />
            </>
          );
        case 'cat_shop':
          return (
            <>
              {/* Cute striped grocer/baker hat + blue collar */}
              <path d="M10 8.5 C10 3.2 22 3.2 22 8.5 Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.1" />
              <line x1="13" y1="4.8" x2="13" y2="8.2" stroke="#3B82F6" strokeWidth="1.4" />
              <line x1="16" y1="4.4" x2="16" y2="8.2" stroke="#3B82F6" strokeWidth="1.4" />
              <line x1="19" y1="4.8" x2="19" y2="8.2" stroke="#3B82F6" strokeWidth="1.4" />
              <rect x="9.2" y="7.4" width="13.6" height="2" rx="1" fill="#2563EB" />
              <path d="M11 28.4 Q16 31.4 21 28.4" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </>
          );
        case 'cat_call':
          return (
            <>
              {/* Cyan headset band, earcup & boom mic */}
              <path d="M3 16 C3 5.5 29 5.5 29 16" stroke="#0EA5E9" strokeWidth="2.1" fill="none" />
              <rect x="0.8" y="13.5" width="3.8" height="6.8" rx="1.6" fill="#38BDF8" stroke="#0369A1" strokeWidth="0.9" />
              <rect x="27.4" y="13.5" width="3.8" height="6.8" rx="1.6" fill="#38BDF8" stroke="#0369A1" strokeWidth="0.9" />
              <path d="M3 19.2 Q5.5 24.8 13.5 25" stroke="#0284C7" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <circle cx="14.2" cy="25" r="1.4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.8" />
            </>
          );
        case 'cat_work':
          return (
            <>
              {/* Golden square glasses + red necktie */}
              <rect x="6.5" y="12.8" width="8.4" height="7" rx="1.8" fill="#0F172A" fillOpacity="0.25" stroke="#FBBF24" strokeWidth="1.4" />
              <rect x="17.1" y="12.8" width="8.4" height="7" rx="1.8" fill="#0F172A" fillOpacity="0.25" stroke="#FBBF24" strokeWidth="1.4" />
              <line x1="14.9" y1="16" x2="17.1" y2="16" stroke="#FBBF24" strokeWidth="1.4" />
              <path d="M14.3 27.6 H17.7 L17 31.6 H15 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="0.6" />
              <path d="M12 27.2 Q16 29.2 20 27.2" stroke="#F8FAFC" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            </>
          );
        case 'cat_coffee':
          return (
            <>
              {/* Cozy warm caramel beret hat + cup pin */}
              <path d="M8.5 8.5 C7.8 3.2 22.5 2 24.5 7.2 Q16 9.8 8.5 8.5 Z" fill="#D97706" stroke="#78350F" strokeWidth="1" />
              <line x1="16" y1="2.8" x2="16.8" y2="1.3" stroke="#78350F" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="16" cy="29.4" r="2.1" fill="#FFF7ED" stroke="#9A3412" strokeWidth="0.9" />
            </>
          );
        case 'cat_fun':
          return (
            <>
              {/* Purple sunglasses + music headphones */}
              <rect x="6.2" y="13.2" width="8.6" height="6.2" rx="2.4" fill="#A855F7" fillOpacity="0.85" stroke="#F3E8FF" strokeWidth="1" />
              <rect x="17.2" y="13.2" width="8.6" height="6.2" rx="2.4" fill="#A855F7" fillOpacity="0.85" stroke="#F3E8FF" strokeWidth="1" />
              <line x1="14.8" y1="15.8" x2="17.2" y2="15.8" stroke="#F3E8FF" strokeWidth="1.3" />
              <path d="M2.6 15 C2.6 5.2 29.4 5.2 29.4 15" stroke="#9333EA" strokeWidth="2" fill="none" />
              <rect x="0.6" y="13" width="3.5" height="6.8" rx="1.6" fill="#C084FC" />
              <rect x="27.9" y="13" width="3.5" height="6.8" rx="1.6" fill="#C084FC" />
            </>
          );
        case 'cat_sport':
          return (
            <>
              {/* Emerald sweatband across forehead + gold whistle */}
              <path d="M5.2 10.6 Q16 8.2 26.8 10.6 L27.3 13.1 Q16 10.8 4.7 13.1 Z" fill="#10B981" stroke="#065F46" strokeWidth="0.8" />
              <path d="M5.2 11.8 Q16 9.5 26.8 11.8" stroke="#ECFDF5" strokeWidth="1.1" fill="none" />
              <circle cx="16" cy="29.4" r="1.9" fill="#FBBF24" stroke="#92400E" strokeWidth="0.8" />
            </>
          );
        case 'cat_clean':
          return (
            <>
              {/* Aqua polka-dot cleaning bandana on forehead */}
              <path d="M5.4 10.4 Q16 6.2 26.6 10.4 L27.2 12.8 Q16 10.2 4.8 12.8 Z" fill="#06B6D4" stroke="#0E7490" strokeWidth="0.8" />
              <circle cx="10.5" cy="10.1" r="0.9" fill="#ECFEFF" />
              <circle cx="16" cy="9.1" r="1" fill="#ECFEFF" />
              <circle cx="21.5" cy="10.1" r="0.9" fill="#ECFEFF" />
              <path d="M16 4.5 L17.6 6.8 L16 8.2 L14.4 6.8 Z" fill="#22D3EE" stroke="#0E7490" strokeWidth="0.7" />
            </>
          );
        case 'cat_health':
          return (
            <>
              {/* Nurse/doctor cap with medical cross + stethoscope */}
              <rect x="10.2" y="2.6" width="11.6" height="5.8" rx="1.6" fill="#FFFFFF" stroke="#0F766E" strokeWidth="0.9" />
              <path d="M16 3.7 V7.3 M14.2 5.5 H17.8" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8.5 26.8 Q16 31.2 23.5 26.8" stroke="#94A3B8" strokeWidth="1.7" fill="none" strokeLinecap="round" />
              <circle cx="16" cy="29.3" r="1.5" fill="#22C55E" />
            </>
          );
        case 'cat_car':
          return (
            <>
              {/* Vintage aviator pilot goggles across forehead + red pilot scarf */}
              <path d="M4.8 10.6 Q16 8.8 27.2 10.6" stroke="#78350F" strokeWidth="2.1" fill="none" />
              <rect x="8.2" y="7.8" width="6.8" height="4.4" rx="2" fill="#38BDF8" stroke="#78350F" strokeWidth="1.2" />
              <rect x="17" y="7.8" width="6.8" height="4.4" rx="2" fill="#38BDF8" stroke="#78350F" strokeWidth="1.2" />
              <path d="M9.5 27.8 Q16 30.8 22.5 27.8 L24 30.6 L19 31 L16 29.6 L12 31 Z" fill="#F43F5E" />
            </>
          );
        case 'cat_gift':
          return (
            <>
              {/* Big festive coral-pink gift bow on top of head */}
              <path d="M15.8 6.4 C11 2.2 8.2 6.8 13.5 8.5 Z" fill="#FB7185" stroke="#9F1239" strokeWidth="0.8" />
              <path d="M16.2 6.4 C21 2.2 23.8 6.8 18.5 8.5 Z" fill="#FB7185" stroke="#9F1239" strokeWidth="0.8" />
              <circle cx="16" cy="7.2" r="2" fill="#FFF1F2" stroke="#9F1239" strokeWidth="0.9" />
              <path d="M10.5 28 Q16 30.8 21.5 28" stroke="#FB7185" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </>
          );
        case 'cat_sleep':
          return (
            <>
              {/* Cozy indigo-lavender nightcap with golden moon & pompom */}
              <path
                d="M9.5 8.6 C10.5 2 21.5 1.2 26.5 5.4 C24 7.6 22 8.4 20.5 8.6 Z"
                fill="#6366F1"
                stroke="#312E81"
                strokeWidth="0.9"
              />
              <circle cx="27.2" cy="5.6" r="2" fill="#FDE68A" />
              <path d="M15.6 3.5 A2 2 0 1 0 17.6 6 A1.5 1.5 0 1 1 15.6 3.5 Z" fill="#FDE047" />
            </>
          );
        default:
          return null;
      }
    };

    return (
      <svg
        viewBox="0 0 32 32"
        className={`${sizeClass} shrink-0 select-none overflow-visible`}
        aria-label={title || meta.label}
        role="img"
      >
        {/* Full-frame chibi black cat face filling almost the entire emoticon box */}
        <path
          d="M5.4 11.6 L3.8 2.2 L11.4 7.4 Q16 5.8 20.6 7.4 L28.2 2.2 L26.6 11.6 C28.9 13.8 30.1 17 29.7 20.6 C28.9 26.5 23.4 29.9 16 29.9 C8.6 29.9 3.1 26.5 2.3 20.6 C1.9 17 3.1 13.8 5.4 11.6 Z"
          fill="#1C1917"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Inner ears */}
        <path d="M6.5 10.6 L5.4 4.8 L10.3 8.1 Z" fill="#DDD6FE" />
        <path d="M25.5 10.6 L26.6 4.8 L21.7 8.1 Z" fill="#DDD6FE" />
        {/* Rosy cheeks */}
        <ellipse cx="6.4" cy="21.4" rx="2.1" ry="1.3" fill="#F9A8D4" opacity="0.82" />
        <ellipse cx="25.6" cy="21.4" rx="2.1" ry="1.3" fill="#F9A8D4" opacity="0.82" />
        {/* Nose */}
        <path d="M14.5 20.4 L17.5 20.4 L16 22 Z" fill="#F9A8D4" />
        {/* Eyes & mouth */}
        {renderFullFaceEyesAndMouth()}
        {/* Costume / accessory */}
        {renderCostumeOrAccessory()}
      </svg>
    );
  }

  const renderEyes = () => {
    switch (resolvedId) {
      case 'cat_happy':
        return (
          <>
            <path d="M10.5 17.5 C11.5 15.2 13.5 15.2 14.5 17.5" stroke="#FAF5E8" strokeWidth="1.9" strokeLinecap="round" fill="none" />
            <path d="M17.5 17.5 C18.5 15.2 20.5 15.2 21.5 17.5" stroke="#FAF5E8" strokeWidth="1.9" strokeLinecap="round" fill="none" />
            <path d="M13.5 21 Q16 23.8 18.5 21" stroke="#FDA4AF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_love':
        return (
          <>
            <path d="M12.5 18.8 C10.6 17.5 10.6 15.3 12.2 15.3 C12.8 15.3 13.1 15.8 13.1 15.8 C13.1 15.8 13.4 15.3 14 15.3 C15.6 15.3 15.6 17.5 13.7 18.8 L13.1 19.3 Z" fill="#FB7185" />
            <path d="M18.9 18.8 C17 17.5 17 15.3 18.6 15.3 C19.2 15.3 19.5 15.8 19.5 15.8 C19.5 15.8 19.8 15.3 20.4 15.3 C22 15.3 22 17.5 20.1 18.8 L19.5 19.3 Z" fill="#FB7185" />
            <path d="M14.2 21.2 Q16 22.8 17.8 21.2" stroke="#FAF5E8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_sleep':
        return (
          <>
            <path d="M10.5 17.2 Q12.5 18.8 14.5 17.2" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M17.5 17.2 Q19.5 18.8 21.5 17.2" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="21.4" r="1.1" fill="#F9A8D4" />
          </>
        );
      case 'cat_work':
        return (
          <>
            <circle cx="12.5" cy="17" r="2.6" stroke="#FBBF24" strokeWidth="1.3" fill="#0F172A" />
            <circle cx="19.5" cy="17" r="2.6" stroke="#FBBF24" strokeWidth="1.3" fill="#0F172A" />
            <line x1="15.1" y1="17" x2="16.9" y2="17" stroke="#FBBF24" strokeWidth="1.2" />
            <circle cx="12.5" cy="17" r="1" fill="#FAF5E8" />
            <circle cx="19.5" cy="17" r="1" fill="#FAF5E8" />
            <path d="M14.5 21.2 Q16 22.2 17.5 21.2" stroke="#FAF5E8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </>
        );
      default:
        return (
          <>
            <circle cx="12.5" cy="17" r="1.8" fill="#FAF5E8" />
            <circle cx="19.5" cy="17" r="1.8" fill="#FAF5E8" />
            <circle cx="13" cy="16.4" r="0.65" fill="#1C1917" />
            <circle cx="20" cy="16.4" r="0.65" fill="#1C1917" />
            <path d="M14.5 21.2 Q16 22.5 17.5 21.2" stroke="#FAF5E8" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          </>
        );
    }
  };

  const renderBadgeProp = () => {
    switch (resolvedId) {
      case 'cat_note':
        return (
          <g transform="translate(20, 19)">
            <rect x="0" y="1" width="9" height="9" rx="2" fill="#EFF6FF" stroke="#1E40AF" strokeWidth="1.2" />
            <line x1="2.2" y1="4" x2="6.8" y2="4" stroke="#1E40AF" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="2.2" y1="6.8" x2="5.6" y2="6.8" stroke="#60A5FA" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        );
      case 'cat_happy':
        return (
          <path d="M25 6 L26 8.5 L28.5 9 L26.5 10.5 L27 13 L25 11.5 L23 13 L23.5 10.5 L21.5 9 L24 8.5 Z" fill="#FBBF24" />
        );
      case 'cat_love':
        return (
          <path d="M24.8 11.8 C22.5 10.3 22.5 7.5 24.4 7.5 C25.2 7.5 25.6 8.2 25.6 8.2 C25.6 8.2 26 7.5 26.8 7.5 C28.7 7.5 28.7 10.3 26.4 11.8 L25.6 12.4 Z" fill="#F43F5E" />
        );
      case 'cat_idea':
        return (
          <g transform="translate(21, 3)">
            <circle cx="4.5" cy="4.5" r="3.6" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" />
            <rect x="3" y="8" width="3" height="2" rx="0.8" fill="#64748B" />
          </g>
        );
      case 'cat_bills':
        return (
          <g transform="translate(19, 19)">
            <rect x="0" y="1" width="11" height="8" rx="1.8" fill="#FBBF24" stroke="#92400E" strokeWidth="1.1" />
            <line x1="1.5" y1="4" x2="9.5" y2="4" stroke="#78350F" strokeWidth="1.3" />
          </g>
        );
      case 'cat_shop':
        return (
          <g transform="translate(19.5, 19)">
            <path d="M1 3 H10 L9 10 H2 Z" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M3.5 3 C3.5 1 7.5 1 7.5 3" stroke="#1E3A8A" strokeWidth="1.2" fill="none" />
          </g>
        );
      case 'cat_call':
        return (
          <g transform="translate(19.5, 19)">
            <circle cx="5.5" cy="5.5" r="5" fill="#0EA5E9" stroke="#0369A1" strokeWidth="1" />
            <path d="M3.8 3.6 C3.4 4.8 4.8 7 6.8 7.3 L7.6 6.4 L6.5 5.6 L5.9 6 C5.3 5.7 4.9 5.2 4.7 4.7 L5.2 4.1 Z" fill="#FFFFFF" />
          </g>
        );
      case 'cat_coffee':
        return (
          <g transform="translate(19.5, 19)">
            <rect x="1" y="3" width="8" height="7" rx="2" fill="#FFF7ED" stroke="#9A3412" strokeWidth="1.1" />
            <path d="M9 4.5 C11 4.5 11 7.5 9 7.5" stroke="#9A3412" strokeWidth="1.2" fill="none" />
            <path d="M3.5 1.5 Q4 0 3.5 -1 M6 1.5 Q6.5 0 6 -1" stroke="#FDBA74" strokeWidth="1" strokeLinecap="round" fill="none" />
          </g>
        );
      case 'cat_fun':
        return (
          <g transform="translate(20, 4)">
            <circle cx="5" cy="7" r="2" fill="#A855F7" />
            <path d="M6.5 7 V2 L10 1 V5.5" stroke="#7E22CE" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'cat_sport':
        return (
          <path d="M8.5 12.2 Q16 10.6 23.5 12.2" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        );
      case 'cat_clean':
        return (
          <g transform="translate(20, 3)">
            <path d="M5 1 L6 4.5 L9.5 5.5 L6 6.5 L5 10 L4 6.5 L0.5 5.5 L4 4.5 Z" fill="#22D3EE" stroke="#0E7490" strokeWidth="0.7" />
          </g>
        );
      case 'cat_health':
        return (
          <g transform="translate(20, 19.5)">
            <circle cx="5" cy="5" r="4.8" fill="#DCFCE7" stroke="#15803D" strokeWidth="1" />
            <path d="M5 2.6 V7.4 M2.6 5 H7.4" stroke="#16A34A" strokeWidth="1.7" strokeLinecap="round" />
          </g>
        );
      case 'cat_car':
        return (
          <g transform="translate(18.5, 20)">
            <rect x="0.5" y="3" width="11" height="5.5" rx="1.8" fill="#64748B" stroke="#0F172A" strokeWidth="1" />
            <circle cx="3" cy="8.5" r="1.5" fill="#0F172A" />
            <circle cx="9" cy="8.5" r="1.5" fill="#0F172A" />
          </g>
        );
      case 'cat_gift':
        return (
          <g transform="translate(19.5, 19.5)">
            <rect x="1" y="2" width="9" height="8" rx="1.5" fill="#FB7185" stroke="#9F1239" strokeWidth="1" />
            <line x1="5.5" y1="2" x2="5.5" y2="10" stroke="#FFF1F2" strokeWidth="1.4" />
            <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="#FFF1F2" strokeWidth="1.4" />
          </g>
        );
      case 'cat_sleep':
        return (
          <path d="M25.5 4.2 A4 4 0 1 0 29 9.5 A3 3 0 1 1 25.5 4.2 Z" fill="#818CF8" stroke="#4338CA" strokeWidth="0.7" />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 32 32"
      className={`${sizeClass} shrink-0 select-none`}
      aria-label={title || meta.label}
      role="img"
    >
      {/* Subtle glossy light aqua-green medallion backdrop */}
      <circle cx="16" cy="16" r="15" fill="#BEECE1" stroke="#4DB8A7" strokeWidth="1" />
      <circle cx="16" cy="16" r="13.5" fill="#EFFCF9" />
      {/* Black chibi companion cat silhouette */}
      <path
        d="M8.5 13.5 L7.5 6.5 L12.8 10.5 C14.5 10 17.5 10 19.2 10.5 L24.5 6.5 L23.5 13.5 C25 15.2 25.6 17.5 25.1 20 C24.2 23.8 20.6 26 16 26 C11.4 26 7.8 23.8 6.9 20 C6.4 17.5 7 15.2 8.5 13.5 Z"
        fill="#1C1917"
        stroke="#0F172A"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Cute soft lilac/pink inner ears */}
      <path d="M9.4 11.8 L8.9 8.4 L11.7 10.6 Z" fill="#DDD6FE" />
      <path d="M22.6 11.8 L23.1 8.4 L20.3 10.6 Z" fill="#DDD6FE" />
      {/* Rosy cheeks */}
      <ellipse cx="9.6" cy="19.6" rx="1.4" ry="0.9" fill="#F9A8D4" opacity="0.75" />
      <ellipse cx="22.4" cy="19.6" rx="1.4" ry="0.9" fill="#F9A8D4" opacity="0.75" />
      {/* Tiny nose */}
      <path d="M15.1 19.2 L16 20 L16.9 19.2 Z" fill="#F9A8D4" />
      {/* Eyes + mouth */}
      {renderEyes()}
      {/* Thematic companion overlay */}
      {renderBadgeProp()}
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
    <div className="rounded-xl border border-[#7ECBBF]/90 bg-[#EDFBF8]/95 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold text-[#083B37]">
          Gatto companion ({CAT_EMOTICON_MAP[value].label})
        </span>
        {onResetAuto && (
          <button
            type="button"
            onClick={onResetAuto}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              isAuto
                ? 'border-[#0F766E] bg-[#0F766E] text-white'
                : 'border-[#7ECBBF] bg-[#F7FEFC] text-[#083B37] hover:bg-[#D8F4EE]'
            }`}
          >
            Auto
          </button>
        )}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {CAT_EMOTICON_LIBRARY.map((cat) => {
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              title={cat.label}
              aria-label={`Emoticon gatto: ${cat.label}`}
              aria-pressed={active}
              onClick={() => onSelect(cat.id)}
              className={`flex h-8 items-center justify-center rounded-lg border transition-all ${
                active
                  ? 'border-[#0F766E] bg-[#C4EFE6] ring-1 ring-[#0F766E] scale-105'
                  : 'border-[#9BDCD1] bg-[#F7FEFC] hover:border-[#0E8A7E] hover:bg-[#D8F4EE]'
              }`}
            >
              <CatEmoticonIcon
                emoticonId={cat.id}
                variant={variant}
                sizeClass={variant === 'fullFace' ? 'h-6 w-6' : 'h-5 w-5'}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
