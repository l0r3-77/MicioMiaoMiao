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
 * MicioMiao Recognizable Classic Cat Face Renderer:
 * - Warm dark-charcoal chubby cat head with crisp dark outline
 * - Prominent pink inner ears + cream muzzle pad + visible whiskers on both sides
 * - Expressive large glossy eyes, brows & classic emoticon mouths
 * - Distinct accessories / costumes (fullFace) or clear mini activity props (medallion)
 */
export const CatEmoticonIcon: React.FC<CatEmoticonIconProps> = ({
  emoticonId,
  text = '',
  blockHint,
  sizeClass = 'h-[19px] w-[19px]',
  title,
  variant = 'medallion',
}) => {
  const resolvedId = resolveCatEmoticonId(emoticonId, text, blockHint);
  const meta = CAT_EMOTICON_MAP[resolvedId];
  const isFullFace = variant === 'fullFace';

  const renderExpression = () => {
    switch (resolvedId) {
      case 'cat_happy':
        return (
          <>
            <path d="M7.8 16.4 C9.4 13.4 12.2 13.4 13.8 16.4" stroke="#FFFBEB" strokeWidth="2.3" strokeLinecap="round" fill="none" />
            <path d="M18.2 16.4 C19.8 13.4 22.6 13.4 24.2 16.4" stroke="#FFFBEB" strokeWidth="2.3" strokeLinecap="round" fill="none" />
            <path d="M12.2 21.8 Q16 26.8 19.8 21.8 Z" fill="#FB7185" stroke="#1E293B" strokeWidth="0.6" />
          </>
        );
      case 'cat_lol':
        return (
          <>
            <path d="M8 15.8 L13.4 16.6 L8.6 18" stroke="#FFFBEB" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M24 15.8 L18.6 16.6 L23.4 18" stroke="#FFFBEB" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Joy tears */}
            <path d="M5.5 18.8 C3.8 20.6 5.4 22.8 7 21.2 C7.8 20.4 7.2 19 5.5 18.8 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.6" />
            <path d="M26.5 18.8 C28.2 20.6 26.6 22.8 25 21.2 C24.2 20.4 24.8 19 26.5 18.8 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.6" />
            <path d="M11.8 21.4 Q16 27.6 20.2 21.4 Z" fill="#FB7185" stroke="#1E293B" strokeWidth="0.7" />
          </>
        );
      case 'cat_love':
        return (
          <>
            <path d="M10.8 19 C7.5 16.8 7.6 13.2 10 13.2 C10.8 13.2 11.2 14 11.2 14 C11.2 14 11.6 13.2 12.4 13.2 C14.8 13.2 14.9 16.8 11.6 19 L11.2 19.4 Z" fill="#FB7185" stroke="#FFF1F2" strokeWidth="0.6" />
            <path d="M20.4 19 C17.1 16.8 17.2 13.2 19.6 13.2 C20.4 13.2 20.8 14 20.8 14 C20.8 14 21.2 13.2 22 13.2 C24.4 13.2 24.5 16.8 21.2 19 L20.8 19.4 Z" fill="#FB7185" stroke="#FFF1F2" strokeWidth="0.6" />
            <path d="M12.6 22.4 Q14.3 24.5 16 22.5 Q17.7 24.5 19.4 22.4" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_kiss':
        return (
          <>
            <path d="M8.2 16.2 C9.6 13.8 12 13.8 13.4 16.2" stroke="#FFFBEB" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <path d="M18.6 16.2 C20 13.8 22.4 13.8 23.8 16.2" stroke="#FFFBEB" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <path d="M15.2 22 C16.8 22 16.8 23.2 15.6 23.4 C16.9 23.6 16.9 25 15.2 25" stroke="#BE123C" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M24.2 22.2 C22.5 21 22.6 18.6 24.1 18.6 C24.6 18.6 24.9 19.1 24.9 19.1 C24.9 19.1 25.2 18.6 25.7 18.6 C27.2 18.6 27.3 21 25.6 22.2 L24.9 22.7 Z" fill="#F43F5E" stroke="#FFF1F2" strokeWidth="0.5" />
          </>
        );
      case 'cat_wink':
        return (
          <>
            <circle cx="10.8" cy="15.8" r="2.8" fill="#FFFFFF" />
            <circle cx="11.2" cy="15.8" r="1.4" fill="#111827" />
            <circle cx="11.8" cy="15.1" r="0.65" fill="#FFFFFF" />
            <path d="M18.2 16.3 Q21.2 13.8 24.2 16.3" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M12.6 22.6 Q16.6 25 20.2 21.8" stroke="#451A03" strokeWidth="1.7" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_cool':
        return (
          <>
            <rect x="6" y="13.2" width="9" height="5.6" rx="1.6" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1" />
            <rect x="17" y="13.2" width="9" height="5.6" rx="1.6" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1" />
            <line x1="15" y1="15.2" x2="17" y2="15.2" stroke="#F8FAFC" strokeWidth="1.2" />
            <line x1="7.5" y1="14.5" x2="10" y2="17" stroke="#38BDF8" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="18.5" y1="14.5" x2="21" y2="17" stroke="#38BDF8" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M13 22.8 Q16.8 24.8 19.6 22" stroke="#451A03" strokeWidth="1.7" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_star':
        return (
          <>
            <path d="M10.8 12.6 L11.7 14.8 L14 15 L12.2 16.5 L12.8 18.8 L10.8 17.5 L8.8 18.8 L9.4 16.5 L7.6 15 L9.9 14.8 Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.6" />
            <path d="M21.2 12.6 L22.1 14.8 L24.4 15 L22.6 16.5 L23.2 18.8 L21.2 17.5 L19.2 18.8 L19.8 16.5 L18 15 L20.3 14.8 Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.6" />
            <path d="M12.2 21.8 Q16 26.8 19.8 21.8 Z" fill="#FB7185" stroke="#1E293B" strokeWidth="0.6" />
          </>
        );
      case 'cat_think':
        return (
          <>
            <path d="M8.5 11.8 Q11 10.6 13.4 11.8" stroke="#FDE68A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <path d="M18.6 12.4 Q21.2 13.4 23.6 12" stroke="#FDE68A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <circle cx="10.8" cy="15.8" r="2.6" fill="#FFFFFF" />
            <circle cx="11.5" cy="15.1" r="1.3" fill="#111827" />
            <circle cx="21.2" cy="15.8" r="2.6" fill="#FFFFFF" />
            <circle cx="21.9" cy="15.1" r="1.3" fill="#111827" />
            <path d="M13 23.2 Q16 22.4 19 23.6" stroke="#451A03" strokeWidth="1.7" strokeLinecap="round" fill="none" />
            {/* Little paw at chin */}
            <ellipse cx="11.5" cy="27.2" rx="2.6" ry="2" fill="#FEF3C7" stroke="#1F2937" strokeWidth="0.9" />
          </>
        );
      case 'cat_wow':
        return (
          <>
            <circle cx="10.8" cy="15.6" r="3" fill="#FFFFFF" />
            <circle cx="11" cy="15.6" r="1.4" fill="#111827" />
            <circle cx="11.6" cy="14.9" r="0.65" fill="#FFFFFF" />
            <circle cx="21.2" cy="15.6" r="3" fill="#FFFFFF" />
            <circle cx="21.4" cy="15.6" r="1.4" fill="#111827" />
            <circle cx="22" cy="14.9" r="0.65" fill="#FFFFFF" />
            <ellipse cx="16" cy="23.6" rx="2.2" ry="2.5" fill="#FB7185" stroke="#451A03" strokeWidth="0.9" />
          </>
        );
      case 'cat_sad':
        return (
          <>
            <path d="M8.5 13.2 Q11.2 11.4 13.4 12.2" stroke="#93C5FD" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <path d="M18.6 12.2 Q20.8 11.4 23.5 13.2" stroke="#93C5FD" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <circle cx="10.8" cy="16" r="2.6" fill="#FFFFFF" />
            <circle cx="11" cy="16.4" r="1.3" fill="#111827" />
            <circle cx="21.2" cy="16" r="2.6" fill="#FFFFFF" />
            <circle cx="21.4" cy="16.4" r="1.3" fill="#111827" />
            <path d="M8.2 18.6 C7.1 20.6 8.4 22.2 9.5 21 C10.1 20.2 9.5 19 8.2 18.6 Z" fill="#60A5FA" />
            <path d="M13 24.4 Q16 22 19 24.4" stroke="#451A03" strokeWidth="1.7" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_angry':
        return (
          <>
            <line x1="8" y1="12.2" x2="14" y2="14.6" stroke="#FCA5A5" strokeWidth="1.9" strokeLinecap="round" />
            <line x1="24" y1="12.2" x2="18" y2="14.6" stroke="#FCA5A5" strokeWidth="1.9" strokeLinecap="round" />
            <circle cx="10.8" cy="16.2" r="2.5" fill="#FEF08A" />
            <circle cx="11.2" cy="16.2" r="1.2" fill="#111827" />
            <circle cx="21.2" cy="16.2" r="2.5" fill="#FEF08A" />
            <circle cx="20.8" cy="16.2" r="1.2" fill="#111827" />
            <path d="M12.6 24.2 Q16 21.6 19.4 24.2" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </>
        );
      case 'cat_sleep':
        return (
          <>
            <path d="M8 16.2 Q10.8 18.8 13.6 16.2" stroke="#E2E8F0" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <path d="M18.4 16.2 Q21.2 18.8 24 16.2" stroke="#E2E8F0" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="23.4" r="1.4" fill="#FB7185" />
          </>
        );
      case 'cat_sick':
        return (
          <>
            <path d="M8.5 16.5 L13.5 15.5" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <path d="M23.5 16.5 L18.5 15.5" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <path d="M12.8 24.2 Q16 22.4 19.2 24.2" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            {/* Thermometer */}
            <g transform="translate(17.5, 22.5) rotate(-25)">
              <rect x="0" y="0" width="9" height="2.4" rx="1.2" fill="#FFFFFF" stroke="#0F766E" strokeWidth="0.7" />
              <rect x="5" y="0.5" width="3.5" height="1.4" rx="0.7" fill="#EF4444" />
            </g>
          </>
        );
      case 'cat_hug':
        return (
          <>
            <path d="M8.2 16 C9.6 13.4 12.2 13.4 13.6 16" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M18.4 16 C19.8 13.4 22.4 13.4 23.8 16" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M12.6 22.2 Q14.3 24.4 16 22.4 Q17.7 24.4 19.4 22.2" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            {/* Two cute paws waving out */}
            <ellipse cx="6.2" cy="24.5" rx="2.7" ry="2.2" fill="#FEF3C7" stroke="#1F2937" strokeWidth="0.9" />
            <ellipse cx="25.8" cy="24.5" rx="2.7" ry="2.2" fill="#FEF3C7" stroke="#1F2937" strokeWidth="0.9" />
          </>
        );
      case 'cat_idea':
        return (
          <>
            <circle cx="10.8" cy="15.8" r="2.8" fill="#FEF08A" />
            <circle cx="11.4" cy="15.3" r="1.2" fill="#111827" />
            <circle cx="11.9" cy="14.7" r="0.6" fill="#FFFFFF" />
            <circle cx="21.2" cy="15.8" r="2.8" fill="#FEF08A" />
            <circle cx="21.8" cy="15.3" r="1.2" fill="#111827" />
            <circle cx="22.3" cy="14.7" r="0.6" fill="#FFFFFF" />
            <path d="M12.8 22.4 Q16 24.8 19.2 22.4" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        );
      default:
        return (
          <>
            {/* Classic wide recognizable cute cat eyes with crisp catchlight */}
            <circle cx="10.8" cy="15.8" r="2.8" fill="#FFFFFF" />
            <circle cx="11.3" cy="15.8" r="1.45" fill="#111827" />
            <circle cx="11.9" cy="15" r="0.7" fill="#FFFFFF" />
            <circle cx="21.2" cy="15.8" r="2.8" fill="#FFFFFF" />
            <circle cx="21.7" cy="15.8" r="1.45" fill="#111827" />
            <circle cx="22.3" cy="15" r="0.7" fill="#FFFFFF" />
            {/* Classic :3 cat mouth on warm cream muzzle */}
            <path
              d="M12.5 22.4 Q14.3 24.4 16 22.5 Q17.7 24.4 19.5 22.4"
              stroke="#451A03"
              strokeWidth="1.65"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
    }
  };

  const renderAccessoryOrProp = () => {
    switch (resolvedId) {
      case 'cat_note':
        return isFullFace ? (
          <>
            <circle cx="10.8" cy="15.8" r="4.1" fill="#60A5FA" fillOpacity="0.18" stroke="#60A5FA" strokeWidth="1.4" />
            <circle cx="21.2" cy="15.8" r="4.1" fill="#60A5FA" fillOpacity="0.18" stroke="#60A5FA" strokeWidth="1.4" />
            <line x1="14.9" y1="15.8" x2="17.1" y2="15.8" stroke="#60A5FA" strokeWidth="1.4" />
            <g transform="translate(22.5, 1.5) rotate(28)">
              <rect x="0" y="0" width="3.2" height="9" rx="0.8" fill="#FACC15" stroke="#854D0E" strokeWidth="0.7" />
              <rect x="0" y="0" width="3.2" height="2.1" rx="0.5" fill="#FB7185" />
            </g>
          </>
        ) : (
          <g transform="translate(21.5, 19.5)">
            <rect x="0" y="0" width="9" height="9" rx="2" fill="#EFF6FF" stroke="#1E40AF" strokeWidth="1.2" />
            <line x1="2.2" y1="3.2" x2="6.8" y2="3.2" stroke="#1E40AF" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="2.2" y1="5.8" x2="5.8" y2="5.8" stroke="#3B82F6" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        );
      case 'cat_party':
        return (
          <>
            <path d="M11.2 8.2 L16 0.5 L20.8 8.2 Z" fill="#A855F7" stroke="#581C87" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M12.5 5.8 L19.5 5.8" stroke="#FDE047" strokeWidth="1.4" />
            <circle cx="16" cy="1" r="1.5" fill="#2DD4BF" />
          </>
        );
      case 'cat_idea':
        return (
          <g transform="translate(20.5, 0.5)">
            <circle cx="5" cy="4.8" r="3.8" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.9" />
            <rect x="3.5" y="8.2" width="3" height="1.8" rx="0.6" fill="#64748B" />
            <line x1="5" y1="-0.5" x2="5" y2="0.4" stroke="#FACC15" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        );
      case 'cat_fire':
        return (
          <g transform="translate(21.5, 1)">
            <path d="M4.5 0.5 C6.5 3.2 8 4.8 7.5 7.2 C7.1 9 5.5 10 4 10 C2.2 10 1 8.5 1.3 6.5 C1.5 5.2 2.4 4.2 3 3.5 C3.1 4.5 3.7 4.9 4.2 4.3 C4.6 3.5 4.2 1.8 4.5 0.5 Z" fill="#FB923C" stroke="#C2410C" strokeWidth="0.8" />
            <path d="M4.3 4.8 C5.2 6 5.6 7.5 4.2 8.5 C3.1 7.8 3.4 6 4.3 4.8 Z" fill="#FEF08A" />
          </g>
        );
      case 'cat_bills':
        return (
          <g transform="translate(19.5, 19.8)">
            <rect x="0" y="0.5" width="11.5" height="8" rx="1.8" fill="#FBBF24" stroke="#92400E" strokeWidth="1.1" />
            <line x1="1.5" y1="3.4" x2="10" y2="3.4" stroke="#78350F" strokeWidth="1.4" />
          </g>
        );
      case 'cat_shop':
        return (
          <g transform="translate(19.8, 19.5)">
            <path d="M1 3 H10 L9 10 H2 Z" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M3.5 3 C3.5 0.8 7.5 0.8 7.5 3" stroke="#1E3A8A" strokeWidth="1.2" fill="none" />
          </g>
        );
      case 'cat_food':
        return (
          <>
            {/* Cute white chef toque */}
            <path d="M9.5 8 C8.2 5 11.2 2.2 16 2.8 C20.8 2.2 23.8 5 22.5 8 Z" fill="#FFFFFF" stroke="#475569" strokeWidth="0.9" />
            <rect x="10.2" y="7" width="11.6" height="2" rx="0.8" fill="#F1F5F9" stroke="#475569" strokeWidth="0.7" />
          </>
        );
      case 'cat_coffee':
        return (
          <g transform="translate(19.8, 19.8)">
            <rect x="1" y="2.6" width="8.2" height="7" rx="2" fill="#FFF7ED" stroke="#9A3412" strokeWidth="1.1" />
            <path d="M9.2 4.2 C11.2 4.2 11.2 7.2 9.2 7.2" stroke="#9A3412" strokeWidth="1.2" fill="none" />
          </g>
        );
      case 'cat_call':
        return (
          <>
            <path d="M2.6 15.5 C2.6 5.2 29.4 5.2 29.4 15.5" stroke="#0EA5E9" strokeWidth="2" fill="none" />
            <rect x="0.8" y="13.2" width="3.5" height="6.2" rx="1.5" fill="#38BDF8" stroke="#0369A1" strokeWidth="0.8" />
            <rect x="27.7" y="13.2" width="3.5" height="6.2" rx="1.5" fill="#38BDF8" stroke="#0369A1" strokeWidth="0.8" />
          </>
        );
      case 'cat_work':
        return (
          <>
            <rect x="6.6" y="12.6" width="8.3" height="6.4" rx="1.6" fill="#0F172A" fillOpacity="0.14" stroke="#FBBF24" strokeWidth="1.35" />
            <rect x="17.1" y="12.6" width="8.3" height="6.4" rx="1.6" fill="#0F172A" fillOpacity="0.14" stroke="#FBBF24" strokeWidth="1.35" />
            <line x1="14.9" y1="15.5" x2="17.1" y2="15.5" stroke="#FBBF24" strokeWidth="1.3" />
            <path d="M14.4 27.6 H17.6 L17 31.4 H15 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="0.6" />
          </>
        );
      case 'cat_book':
        return (
          <g transform="translate(19.2, 20.5)">
            <path d="M0.5 1.5 Q3.5 0 6 1.5 Q8.5 0 11.5 1.5 V9 Q8.5 7.5 6 9 Q3.5 7.5 0.5 9 Z" fill="#EDE9FE" stroke="#5B21B6" strokeWidth="1" />
            <line x1="6" y1="1.5" x2="6" y2="9" stroke="#5B21B6" strokeWidth="0.9" />
          </g>
        );
      case 'cat_fun':
        return (
          <>
            <path d="M2.6 15 C2.6 5.2 29.4 5.2 29.4 15" stroke="#9333EA" strokeWidth="1.9" fill="none" />
            <rect x="0.8" y="13" width="3.4" height="6.4" rx="1.5" fill="#C084FC" />
            <rect x="27.8" y="13" width="3.4" height="6.4" rx="1.5" fill="#C084FC" />
          </>
        );
      case 'cat_movie':
        return (
          <g transform="translate(19.5, 20)">
            <rect x="0.5" y="1.5" width="10.5" height="8" rx="1.5" fill="#F472B6" stroke="#831843" strokeWidth="1" />
            <path d="M4.2 3.5 L8 5.5 L4.2 7.5 Z" fill="#FFFFFF" />
          </g>
        );
      case 'cat_game':
        return (
          <g transform="translate(18.5, 20.5)">
            <rect x="0.5" y="2" width="11.5" height="6.5" rx="3" fill="#6366F1" stroke="#312E81" strokeWidth="1" />
            <path d="M3.5 4 V6.5 M2.2 5.2 H4.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            <circle cx="8.6" cy="4.6" r="0.8" fill="#FDE047" />
            <circle cx="9.8" cy="5.8" r="0.8" fill="#FB7185" />
          </g>
        );
      case 'cat_sport':
        return (
          <>
            <path d="M5.4 10.6 Q16 8.2 26.6 10.6 L27.1 13 Q16 10.6 4.9 13 Z" fill="#10B981" stroke="#065F46" strokeWidth="0.8" />
            <path d="M5.4 11.8 Q16 9.5 26.6 11.8" stroke="#ECFDF5" strokeWidth="1" fill="none" />
          </>
        );
      case 'cat_shower':
        return (
          <>
            {/* Cute shower cap with fluffy soap bubbles */}
            <path d="M5.8 10.6 C7 3.8 25 3.8 26.2 10.6 Q16 8.6 5.8 10.6 Z" fill="#BAE6FD" stroke="#0284C7" strokeWidth="0.9" />
            <circle cx="24.8" cy="6.2" r="2.6" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="0.8" />
            <circle cx="28" cy="9.4" r="1.8" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="0.8" />
            <circle cx="5.2" cy="8.2" r="1.9" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="0.8" />
          </>
        );
      case 'cat_clean':
        return (
          <>
            <path d="M5.4 10.2 Q16 6 26.6 10.2 L27.2 12.6 Q16 10 4.8 12.6 Z" fill="#06B6D4" stroke="#0E7490" strokeWidth="0.8" />
            <circle cx="11" cy="9.8" r="0.9" fill="#ECFEFF" />
            <circle cx="16" cy="8.8" r="1" fill="#ECFEFF" />
            <circle cx="21" cy="9.8" r="0.9" fill="#ECFEFF" />
          </>
        );
      case 'cat_health':
        return (
          <>
            <rect x="10.2" y="2.4" width="11.6" height="5.6" rx="1.5" fill="#FFFFFF" stroke="#0F766E" strokeWidth="0.9" />
            <path d="M16 3.5 V6.9 M14.3 5.2 H17.7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case 'cat_car':
        return (
          <>
            <path d="M4.8 10.4 Q16 8.6 27.2 10.4" stroke="#78350F" strokeWidth="2" fill="none" />
            <rect x="8.2" y="7.6" width="6.8" height="4.2" rx="1.8" fill="#38BDF8" stroke="#78350F" strokeWidth="1.1" />
            <rect x="17" y="7.6" width="6.8" height="4.2" rx="1.8" fill="#38BDF8" stroke="#78350F" strokeWidth="1.1" />
          </>
        );
      case 'cat_home':
        return (
          <g transform="translate(19.5, 19.5)">
            <path d="M0.5 5.2 L6 0.6 L11.5 5.2 V10.2 H0.5 Z" fill="#99F6E4" stroke="#0F766E" strokeWidth="1.1" strokeLinejoin="round" />
            <rect x="4.5" y="6.2" width="3" height="4" fill="#0F766E" />
          </g>
        );
      case 'cat_gift':
        return (
          <>
            <path d="M15.8 6.4 C11 2.2 8.2 6.8 13.5 8.5 Z" fill="#FB7185" stroke="#9F1239" strokeWidth="0.8" />
            <path d="M16.2 6.4 C21 2.2 23.8 6.8 18.5 8.5 Z" fill="#FB7185" stroke="#9F1239" strokeWidth="0.8" />
            <circle cx="16" cy="7.2" r="1.9" fill="#FFF1F2" stroke="#9F1239" strokeWidth="0.8" />
          </>
        );
      case 'cat_sun':
        return (
          <g transform="translate(21.2, 0.8)">
            <circle cx="5" cy="5" r="3.2" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.8" />
            <line x1="5" y1="0" x2="5" y2="1" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="9" x2="5" y2="10" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="0" y1="5" x2="1" y2="5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="5" x2="10" y2="5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        );
      case 'cat_sleep':
        return (
          <>
            <path d="M9.5 8.6 C10.5 2 21.5 1.2 26.5 5.4 C24 7.6 22 8.4 20.5 8.6 Z" fill="#6366F1" stroke="#312E81" strokeWidth="0.9" />
            <circle cx="27" cy="5.6" r="1.9" fill="#FDE68A" />
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
      {!isFullFace && (
        <circle cx="16" cy="17.2" r="14.5" fill="#E6FBF6" stroke="#7ECBBF" strokeWidth="0.9" />
      )}
      {/* Large recognizable chubby MicioMiao cat head */}
      <path
        d="M5.4 11.4 L3.8 2.2 L11.4 7.2 Q16 5.6 20.6 7.2 L28.2 2.2 L26.6 11.4 C28.9 13.6 30.1 16.8 29.7 20.4 C28.9 26.3 23.4 29.7 16 29.7 C8.6 29.7 3.1 26.3 2.3 20.4 C1.9 16.8 3.1 13.6 5.4 11.4 Z"
        fill="#2B2623"
        stroke="#0F172A"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      {/* Bright sakura-pink inner ears */}
      <path d="M6.4 10.5 L5.3 4.5 L10.3 8 Z" fill="#F9A8D4" />
      <path d="M25.6 10.5 L26.7 4.5 L21.7 8 Z" fill="#F9A8D4" />
      {/* Warm cream chubby muzzle pad for instant cat face readability */}
      <ellipse cx="16" cy="22.8" rx="6.4" ry="4.4" fill="#FEF3C7" />
      {/* Soft rosy cheeks */}
      <ellipse cx="6.7" cy="20.6" rx="2.1" ry="1.25" fill="#F472B6" opacity="0.82" />
      <ellipse cx="25.3" cy="20.6" rx="2.1" ry="1.25" fill="#F472B6" opacity="0.82" />
      {/* Cute pink cat nose */}
      <path d="M14.4 20 L17.6 20 L16 21.8 Z" fill="#EC4899" />
      {/* Distinct cat whiskers on both sides */}
      <line x1="0.8" y1="18.2" x2="7" y2="19.4" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="0.4" y1="21" x2="6.8" y2="21.1" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="1.1" y1="23.8" x2="7.2" y2="22.8" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="31.2" y1="18.2" x2="25" y2="19.4" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="31.6" y1="21" x2="25.2" y2="21.1" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="30.9" y1="23.8" x2="24.8" y2="22.8" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
      {/* Eyes & expression */}
      {renderExpression()}
      {/* Theme costume / accessory */}
      {renderAccessoryOrProp()}
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
          Gatto MicioMiao ({CAT_EMOTICON_MAP[value].label})
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

      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 max-h-44 overflow-y-auto pr-0.5">
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
              className={`flex h-9 items-center justify-center rounded-lg border transition-all ${
                active
                  ? 'border-[#0F766E] bg-[#C4EFE6] ring-1 ring-[#0F766E] scale-[1.03]'
                  : 'border-[#9BDCD1] bg-[#F7FEFC] hover:border-[#0E8A7E] hover:bg-[#D8F4EE]'
              }`}
            >
              <CatEmoticonIcon
                emoticonId={cat.id}
                variant={variant}
                sizeClass="h-6 w-6"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
