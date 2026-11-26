import React, { useMemo, useState } from 'react';
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
 * Tiny MicioMiao neko signature ears/face helper placed unobtrusively on objects
 * or as a subtle companion mark while keeping the main object/gear large (~80% of viewBox).
 */
const NekoEarTop: React.FC<{ cx?: number; y?: number; w?: number; h?: number }> = ({
  cx = 18,
  y = 6,
  w = 7,
  h = 4.5,
}) => (
  <g>
    <path
      d={`M${cx - w + 0.5} ${y + 2} L${cx - w - 1.5} ${y - h} L${cx - 2.2} ${y + 0.3} Z`}
      fill="#120E16"
      stroke="#0B080C"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    <path
      d={`M${cx - w + 0.3} ${y + 0.8} L${cx - w - 0.8} ${y - h + 1.5} L${cx - 3.3} ${y + 0.3} Z`}
      fill="#F48A94"
    />
    <path
      d={`M${cx + w - 0.5} ${y + 2} L${cx + w + 1.5} ${y - h} L${cx + 2.2} ${y + 0.3} Z`}
      fill="#120E16"
      stroke="#0B080C"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    <path
      d={`M${cx + w - 0.3} ${y + 0.8} L${cx + w + 0.8} ${y - h + 1.5} L${cx + 3.3} ${y + 0.3} Z`}
      fill="#F48A94"
    />
  </g>
);

const MiniPeekingNeko: React.FC<{ x?: number; y?: number; scale?: number }> = ({
  x = 24,
  y = 22,
  scale = 1,
}) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <path d="M2 5.2 L1.2 1.2 L4.4 3.5 Z" fill="#120E16" />
    <path d="M10 5.2 L10.8 1.2 L7.6 3.5 Z" fill="#120E16" />
    <path d="M2.2 4.5 L1.8 2.1 L3.8 3.6 Z" fill="#F48A94" />
    <path d="M9.8 4.5 L10.2 2.1 L8.2 3.6 Z" fill="#F48A94" />
    <ellipse cx="6" cy="7.2" rx="4.8" ry="4" fill="#120E16" stroke="#FFFFFF" strokeWidth="0.7" />
    <circle cx="4.3" cy="6.8" r="1" fill="#FAF1D8" />
    <circle cx="7.7" cy="6.8" r="1" fill="#FAF1D8" />
    <circle cx="4.4" cy="6.8" r="0.45" fill="#0B080C" />
    <circle cx="7.8" cy="6.8" r="0.45" fill="#0B080C" />
    <ellipse cx="6" cy="8.2" rx="0.8" ry="0.55" fill="#F48A94" />
  </g>
);

const MiniNekoHeadFull: React.FC<{ variant: 'happy' | 'love' | 'sleep' | 'sad' | 'think' | 'sun' }> = ({
  variant,
}) => (
  <g>
    <NekoEarTop cx={18} y={10.5} w={8.5} h={5.8} />
    <ellipse cx="18" cy="19.5" rx="11.5" ry="9.8" fill="#120E16" stroke="#0B080C" strokeWidth="1" />
    {/* Whiskers */}
    <path d="M6.8 19 L2.5 18.2 M7 21.2 L2.8 21.8" stroke="#120E16" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M29.2 19 L33.5 18.2 M29 21.2 L33.2 21.8" stroke="#120E16" strokeWidth="1.2" strokeLinecap="round" />
    {variant === 'happy' && (
      <>
        <path d="M11 18.5 Q13.3 15.2 15.5 18.5" stroke="#FAF1D8" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        <path d="M20.5 18.5 Q22.7 15.2 25 18.5" stroke="#FAF1D8" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        <path d="M15 23.2 Q18 26.8 21 23.2 Z" fill="#F48A94" />
      </>
    )}
    {variant === 'love' && (
      <>
        <circle cx="13.2" cy="18.2" r="2.2" fill="#F48A94" />
        <circle cx="22.8" cy="18.2" r="2.2" fill="#F48A94" />
        <path d="M15.4 23 Q18 25 20.6 23" stroke="#FAF1D8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </>
    )}
    {variant === 'sleep' && (
      <>
        <path d="M10.8 18.5 Q13.2 21 15.5 18.5" stroke="#FAF1D8" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M20.5 18.5 Q22.8 21 25.2 18.5" stroke="#FAF1D8" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="18" cy="22.4" rx="1.2" ry="0.9" fill="#F48A94" />
      </>
    )}
    {variant === 'sad' && (
      <>
        <ellipse cx="13.2" cy="18.2" rx="2.3" ry="2.5" fill="#FAF1D8" />
        <circle cx="13.2" cy="18.6" r="1.2" fill="#0B080C" />
        <ellipse cx="22.8" cy="18.2" rx="2.3" ry="2.5" fill="#FAF1D8" />
        <circle cx="22.8" cy="18.6" r="1.2" fill="#0B080C" />
        <path d="M15.4 24.4 Q18 22.4 20.6 24.4" stroke="#FAF1D8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </>
    )}
    {variant === 'think' && (
      <>
        <ellipse cx="13.2" cy="18.2" rx="2.3" ry="2.3" fill="#FAF1D8" />
        <circle cx="13.8" cy="17.8" r="1.2" fill="#0B080C" />
        <ellipse cx="22.8" cy="18.2" rx="2.3" ry="2.3" fill="#FAF1D8" />
        <circle cx="23.4" cy="17.8" r="1.2" fill="#0B080C" />
        <path d="M15.5 23.4 L20.5 22.8" stroke="#FAF1D8" strokeWidth="1.5" strokeLinecap="round" />
      </>
    )}
    {variant === 'sun' && (
      <>
        <rect x="9.5" y="15.2" width="7.2" height="4.8" rx="1.5" fill="#0B080C" stroke="#FAF1D8" strokeWidth="1.1" />
        <rect x="19.3" y="15.2" width="7.2" height="4.8" rx="1.5" fill="#0B080C" stroke="#FAF1D8" strokeWidth="1.1" />
        <path d="M16.7 17 H19.3" stroke="#FAF1D8" strokeWidth="1.2" />
        <path d="M15.5 23.2 Q18 25 20.5 23.2" stroke="#FAF1D8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </>
    )}
  </g>
);

/**
 * Object-Prominent Neko Icon Renderer:
 * Objects, gear, tools, vehicles & clothing fill ~80% of the 36x36 viewBox
 * while keeping unmistakable MicioMiao neko silhouette accents.
 */
export const CatEmoticonIcon: React.FC<CatEmoticonIconProps> = ({
  emoticonId,
  text = '',
  blockHint,
  sizeClass = 'h-[22px] w-[22px]',
  title,
  variant = 'fullFace',
}) => {
  const resolvedId = resolveCatEmoticonId(emoticonId, text, blockHint);
  const meta = CAT_EMOTICON_MAP[resolvedId];
  const showBackdrop = variant === 'medallion';

  const renderObjectArtwork = () => {
    switch (resolvedId) {
      case 'cat_fuel':
        return (
          <g>
            {/* Large prominent gas pump with neko ears badge */}
            <rect x="6" y="7" width="17" height="24" rx="3" fill="#FB923C" stroke="#1E1B24" strokeWidth="1.5" />
            <rect x="9" y="10" width="11" height="7" rx="1.5" fill="#FEF3C7" stroke="#1E1B24" strokeWidth="1.1" />
            <path d="M23 13 L28 11 V25 C28 27 25.5 27.5 24 26 L23 23" stroke="#1E1B24" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <rect x="26" y="8.5" width="4" height="5" rx="1" fill="#1E1B24" />
            <rect x="4.5" y="30" width="20" height="3" rx="1" fill="#1E1B24" />
            <MiniPeekingNeko x={8.5} y={18.5} scale={0.9} />
          </g>
        );
      case 'cat_barber':
        return (
          <g>
            {/* Giant scissors + comb with neko ears badge */}
            <path d="M8 7 L25 24" stroke="#E2E8F0" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M8 7 L25 24" stroke="#1E1B24" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M25 7 L8 24" stroke="#CBD5E1" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M25 7 L8 24" stroke="#1E1B24" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="9" cy="27.5" r="4.5" fill="none" stroke="#EC4899" strokeWidth="2.5" />
            <circle cx="24" cy="27.5" r="4.5" fill="none" stroke="#EC4899" strokeWidth="2.5" />
            <circle cx="16.5" cy="15.5" r="1.5" fill="#1E1B24" />
            <MiniPeekingNeko x={23} y={2} scale={0.75} />
          </g>
        );
      case 'cat_car':
        return (
          <g>
            {/* Large car filling frame with cat ears on roof */}
            <NekoEarTop cx={18} y={11} w={6.5} h={4} />
            <path d="M7 18 L11 10.5 H25 L29 18 Z" fill="#93C5FD" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <rect x="3.5" y="17.5" width="29" height="10" rx="3.5" fill="#3B82F6" stroke="#1E1B24" strokeWidth="1.5" />
            <circle cx="9" cy="22.5" r="2.2" fill="#FEF08A" />
            <circle cx="27" cy="22.5" r="2.2" fill="#FEF08A" />
            <circle cx="10" cy="28" r="4" fill="#1E1B24" />
            <circle cx="10" cy="28" r="1.7" fill="#E2E8F0" />
            <circle cx="26" cy="28" r="4" fill="#1E1B24" />
            <circle cx="26" cy="28" r="1.7" fill="#E2E8F0" />
          </g>
        );
      case 'cat_train':
        return (
          <g>
            {/* Prominent front train carriage */}
            <NekoEarTop cx={18} y={6.5} w={5.5} h={3.5} />
            <rect x="7" y="6.5" width="22" height="22" rx="4.5" fill="#0EA5E9" stroke="#1E1B24" strokeWidth="1.5" />
            <rect x="10" y="10" width="16" height="8.5" rx="2" fill="#E0F2FE" stroke="#1E1B24" strokeWidth="1.1" />
            <circle cx="12" cy="23.5" r="2" fill="#FEF08A" />
            <circle cx="24" cy="23.5" r="2" fill="#FEF08A" />
            <path d="M11 29 L7 33.5 M25 29 L29 33.5 M9 31.8 H27" stroke="#1E1B24" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 'cat_plane':
        return (
          <g>
            {/* Bold airplane + neko tail silhouette */}
            <path
              d="M32 6 C30 4.5 26 6 22 10 L9 8 L6.5 10.5 L16 15.5 L11.5 20 L6.5 19.5 L4.5 21.5 L10.5 24 L13 30 L15 28 L14.5 23 L19 18.5 L24 28 L26.5 25.5 L24.5 12.5 C28.5 8.5 33 7.5 32 6 Z"
              fill="#38BDF8"
              stroke="#1E1B24"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <MiniPeekingNeko x={22} y={22} scale={0.75} />
          </g>
        );
      case 'cat_shower':
        return (
          <g>
            {/* Large showerhead & water streams */}
            <path d="M7 29 V11 C7 7 11 5.5 16 5.5 H22 V9" stroke="#64748B" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M16 9.5 H29 L31 15 H14 Z" fill="#CBD5E1" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M16 18.5 L14.5 22.5 M20.5 18.5 L19.5 23.5 M25 18.5 L24.5 22.5 M29 18.5 L29 22.5" stroke="#0EA5E9" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M15 26 L14 29 M21 26.5 L20.5 30 M27 26 L27 29" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <MiniPeekingNeko x={3} y={23} scale={0.78} />
          </g>
        );
      case 'cat_clean':
        return (
          <g>
            {/* Prominent broom + sparkles */}
            <path d="M25.5 4.5 L15 20" stroke="#A16207" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M10 18 L21.5 25 L16 32.5 L4.5 25.5 Z" fill="#2DD4BF" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7.5 27.5 L10 24 M11.5 30 L14 26.5" stroke="#0F766E" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M27 16 L28 19 L31 20 L28 21 L27 24 L26 21 L23 20 L26 19 Z" fill="#FACC15" />
            <MiniPeekingNeko x={22} y={23} scale={0.8} />
          </g>
        );
      case 'cat_laundry':
        return (
          <g>
            {/* Large washing machine with neko ears on top */}
            <NekoEarTop cx={18} y={6.5} w={6} h={3.5} />
            <rect x="6" y="6.5" width="24" height="25" rx="3" fill="#E2E8F0" stroke="#1E1B24" strokeWidth="1.5" />
            <line x1="6" y1="12.5" x2="30" y2="12.5" stroke="#1E1B24" strokeWidth="1.3" />
            <circle cx="10.5" cy="9.5" r="1.4" fill="#22D3EE" />
            <circle cx="24" cy="9.5" r="1.4" fill="#1E1B24" />
            <circle cx="18" cy="22" r="7" fill="#38BDF8" stroke="#1E1B24" strokeWidth="1.4" />
            <path d="M12.5 22 Q15.5 19.5 18 22 T23.5 22" stroke="#FFFFFF" strokeWidth="1.7" fill="none" />
          </g>
        );
      case 'cat_trash':
        return (
          <g>
            {/* Large recycling / trash bin */}
            <rect x="13" y="4.5" width="10" height="3.2" rx="1.2" fill="#16A34A" stroke="#1E1B24" strokeWidth="1.2" />
            <rect x="6.5" y="7.5" width="23" height="4" rx="1.4" fill="#22C55E" stroke="#1E1B24" strokeWidth="1.4" />
            <path d="M9 11.5 H27 L25 31.5 H11 Z" fill="#4ADE80" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="14" y1="15.5" x2="14.5" y2="27.5" stroke="#14532D" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="18" y1="15.5" x2="18" y2="27.5" stroke="#14532D" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="22" y1="15.5" x2="21.5" y2="27.5" stroke="#14532D" strokeWidth="1.8" strokeLinecap="round" />
            <MiniPeekingNeko x={23} y={22} scale={0.75} />
          </g>
        );
      case 'cat_home':
        return (
          <g>
            {/* Big house silhouette with neko roof ears */}
            <path d="M4 17.5 L18 5.5 L32 17.5" fill="none" stroke="#0F766E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="8" y="16" width="20" height="15" rx="2" fill="#5EEAD4" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="14.5" y="21.5" width="7" height="9.5" rx="1" fill="#0F766E" />
            <MiniPeekingNeko x={12} y={8.5} scale={0.8} />
          </g>
        );
      case 'cat_repair':
        return (
          <g>
            {/* Large wrench + hammer */}
            <path d="M9 28 L23 14 C22 10 24.5 6.5 28.5 6 L26 9.5 L28.5 12 L32 9.5 C31.5 13.5 28 16 24.5 15 L11.5 28.5 Z" fill="#94A3B8" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7 9 L12 5 L15.5 8.5 L10.5 12.5 Z" fill="#F59E0B" stroke="#1E1B24" strokeWidth="1.3" />
            <path d="M12.5 10.5 L27 25.5" stroke="#B45309" strokeWidth="3.2" strokeLinecap="round" />
            <MiniPeekingNeko x={22} y={23} scale={0.78} />
          </g>
        );
      case 'cat_garden':
        return (
          <g>
            {/* Big terracotta pot with thriving leaves & flower */}
            <path d="M18 21 V11" stroke="#15803D" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="12" cy="14" rx="5.5" ry="3.2" transform="rotate(-25 12 14)" fill="#22C55E" stroke="#1E1B24" strokeWidth="1.2" />
            <ellipse cx="24" cy="14" rx="5.5" ry="3.2" transform="rotate(25 24 14)" fill="#4ADE80" stroke="#1E1B24" strokeWidth="1.2" />
            <circle cx="18" cy="8.5" r="4" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.2" />
            <circle cx="18" cy="8.5" r="1.5" fill="#FDE047" />
            <path d="M10 21 H26 L23.5 32 H12.5 Z" fill="#EA580C" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <rect x="8.5" y="19.5" width="19" height="3.2" rx="1" fill="#FB923C" stroke="#1E1B24" strokeWidth="1.3" />
          </g>
        );
      case 'cat_package':
        return (
          <g>
            {/* Big cardboard parcel box + neko paw tape */}
            <path d="M6 12 L18 6 L30 12 V26 L18 32 L6 26 Z" fill="#FBBF24" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M6 12 L18 18 L30 12 M18 18 V32" stroke="#1E1B24" strokeWidth="1.4" fill="none" />
            <path d="M12.5 8.8 L24.5 14.8" stroke="#D97706" strokeWidth="2.8" />
            <MiniPeekingNeko x={21} y={2} scale={0.78} />
          </g>
        );
      case 'cat_bills':
        return (
          <g>
            {/* Large invoice / receipt document + coin */}
            <path d="M8 5 H25 V31 L22 29 L19 31 L16.5 29 L14 31 L11 29 L8 31 Z" fill="#FEF3C7" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <line x1="11.5" y1="10.5" x2="21.5" y2="10.5" stroke="#1E1B24" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="11.5" y1="15.5" x2="19.5" y2="15.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11.5" y1="20.5" x2="17" y2="20.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="25.5" cy="24.5" r="6" fill="#FBBF24" stroke="#1E1B24" strokeWidth="1.4" />
            <text x="25.5" y="27.5" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#1E1B24">€</text>
          </g>
        );
      case 'cat_bank':
        return (
          <g>
            {/* Large bank card + money notes */}
            <rect x="4.5" y="9" width="27" height="19" rx="3.5" fill="#10B981" stroke="#1E1B24" strokeWidth="1.5" />
            <rect x="4.5" y="14" width="27" height="4" fill="#1E1B24" />
            <rect x="8" y="20.5" width="7" height="4.5" rx="1" fill="#FDE047" stroke="#1E1B24" strokeWidth="0.9" />
            <MiniPeekingNeko x={21} y={19} scale={0.78} />
          </g>
        );
      case 'cat_pet':
        return (
          <g>
            {/* Big paw print + neko head */}
            <ellipse cx="18" cy="23.5" rx="7.5" ry="6" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.4" />
            <circle cx="8.5" cy="14" r="3" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.3" />
            <circle cx="14.5" cy="9" r="3" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.3" />
            <circle cx="21.5" cy="9" r="3" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.3" />
            <circle cx="27.5" cy="14" r="3" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.3" />
            <MiniPeekingNeko x={12} y={17} scale={0.95} />
          </g>
        );
      case 'cat_health':
        return (
          <g>
            {/* Big stethoscope & medical bag */}
            <rect x="6" y="11" width="24" height="19" rx="3.5" fill="#4ADE80" stroke="#1E1B24" strokeWidth="1.5" />
            <path d="M13 11 V8 C13 6.5 14 6 15.5 6 H20.5 C22 6 23 6.5 23 8 V11" fill="none" stroke="#1E1B24" strokeWidth="2.2" />
            <path d="M18 15.5 V25.5 M13 20.5 H23" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            <MiniPeekingNeko x={23} y={22} scale={0.75} />
          </g>
        );
      case 'cat_pharmacy':
        return (
          <g>
            {/* Giant two-tone capsule pill */}
            <g transform="rotate(-38 18 18)">
              <rect x="7" y="11" width="22" height="14" rx="7" fill="#FFFFFF" stroke="#1E1B24" strokeWidth="1.6" />
              <path d="M18 11 H22 C25.9 11 29 14.1 29 18 C29 21.9 25.9 25 22 25 H18 Z" fill="#EF4444" stroke="#1E1B24" strokeWidth="1.4" />
            </g>
            <MiniPeekingNeko x={22} y={23} scale={0.78} />
          </g>
        );
      case 'cat_dentist':
        return (
          <g>
            {/* Big gleaming tooth */}
            <path
              d="M11 8 C7.5 8 6.5 12 7.5 16.5 L10 29 C10.5 31 12.5 31 13.8 29 L16.2 22.5 C17 20.5 19 20.5 19.8 22.5 L22.2 29 C23.5 31 25.5 31 26 29 L28.5 16.5 C29.5 12 28.5 8 25 8 C22.5 8 20.5 9.5 18 9.5 C15.5 9.5 13.5 8 11 8 Z"
              fill="#ECFEFF"
              stroke="#1E1B24"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M27 6 L28 8.5 L30.5 9.5 L28 10.5 L27 13 L26 10.5 L23.5 9.5 L26 8.5 Z" fill="#22D3EE" />
            <MiniPeekingNeko x={2} y={22} scale={0.75} />
          </g>
        );
      case 'cat_shop':
        return (
          <g>
            {/* Large shopping cart */}
            <path d="M4 8 H8.5 L12.5 23.5 H27.5 L31 12.5 H10" fill="#93C5FD" stroke="#1E1B24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="14" cy="28.5" r="2.7" fill="#1E1B24" />
            <circle cx="26" cy="28.5" r="2.7" fill="#1E1B24" />
            <MiniPeekingNeko x={15} y={8} scale={0.85} />
          </g>
        );
      case 'cat_food':
        return (
          <g>
            {/* Big plate with fork & spoon + chef neko */}
            <circle cx="18" cy="19.5" r="10.5" fill="#F8FAFC" stroke="#1E1B24" strokeWidth="1.5" />
            <circle cx="18" cy="19.5" r="6.8" fill="#FDBA74" stroke="#EA580C" strokeWidth="1" />
            <path d="M5.5 8 V17.5 M3.8 8 V13 C3.8 14.5 7.2 14.5 7.2 13 V8 M5.5 17.5 V30" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M30.5 8 C32.5 8 32.5 14 30.5 14 C28.5 14 28.5 8 30.5 8 Z M30.5 14 V30" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" fill="#CBD5E1" />
            <MiniPeekingNeko x={12} y={13} scale={0.95} />
          </g>
        );
      case 'cat_pizza':
        return (
          <g>
            {/* Big pepperoni pizza slice */}
            <path d="M6 11 C13 6 23 6 30 11 L18 32 Z" fill="#FBBF24" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M6 11 C13 6 23 6 30 11" stroke="#EA580C" strokeWidth="4.2" strokeLinecap="round" fill="none" />
            <circle cx="15" cy="15" r="2.3" fill="#EF4444" />
            <circle cx="21.5" cy="16.5" r="2" fill="#EF4444" />
            <circle cx="18" cy="23" r="2.1" fill="#EF4444" />
            <MiniPeekingNeko x={22} y={22} scale={0.75} />
          </g>
        );
      case 'cat_coffee':
        return (
          <g>
            {/* Large steaming coffee mug with cat-ear rim */}
            <NekoEarTop cx={16} y={12} w={6.5} h={3.5} />
            <path d="M12.5 5.5 Q14 7.5 12.5 9.5 M18 4.5 Q19.5 6.8 18 9" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M7.5 12.5 H24.5 V23.5 C24.5 28 21 31 16 31 C11 31 7.5 28 7.5 23.5 Z" fill="#92400E" stroke="#1E1B24" strokeWidth="1.5" />
            <path d="M24.5 15 H27.5 C29.8 15 30.8 16.5 30.8 19 C30.8 21.5 29.5 23 27.5 23 H24.5" stroke="#1E1B24" strokeWidth="2.2" fill="none" />
            <ellipse cx="16" cy="14" rx="7" ry="1.8" fill="#F59E0B" />
          </g>
        );
      case 'cat_drink':
        return (
          <g>
            {/* Big cocktail / spritz glass */}
            <path d="M7 8 H29 L18 21 Z" fill="#FB7185" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="18" y1="21" x2="18" y2="30.5" stroke="#1E1B24" strokeWidth="2.2" />
            <line x1="12" y1="30.5" x2="24" y2="30.5" stroke="#1E1B24" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M22 14 L27.5 5.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10.5" cy="9" r="3" fill="#F97316" stroke="#1E1B24" strokeWidth="1.1" />
            <MiniPeekingNeko x={22} y={22} scale={0.75} />
          </g>
        );
      case 'cat_call':
        return (
          <g>
            {/* Big smartphone with ringing call */}
            <rect x="9.5" y="4.5" width="17" height="27" rx="3.5" fill="#1E293B" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="11.5" y="7.5" width="13" height="20" rx="1.5" fill="#38BDF8" />
            <circle cx="18" cy="29.5" r="1.1" fill="#E2E8F0" />
            <MiniPeekingNeko x={12} y={11} scale={0.95} />
          </g>
        );
      case 'cat_email':
        return (
          <g>
            {/* Large envelope with cat-ear flap */}
            <rect x="4.5" y="8.5" width="27" height="19" rx="3" fill="#E0E7FF" stroke="#1E1B24" strokeWidth="1.5" />
            <path d="M5 9.5 L18 19.5 L31 9.5" stroke="#4F46E5" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <circle cx="27" cy="24" r="5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.2" />
            <path d="M25.3 24 H28.7 M27 22.3 V25.7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 'cat_work':
        return (
          <g>
            {/* Big leather briefcase with neko clasp */}
            <path d="M13 10 V7.5 C13 6.2 14 5.5 15.5 5.5 H20.5 C22 5.5 23 6.2 23 7.5 V10" stroke="#1E1B24" strokeWidth="2.2" fill="none" />
            <rect x="4.5" y="10" width="27" height="20" rx="3.5" fill="#6366F1" stroke="#1E1B24" strokeWidth="1.5" />
            <path d="M4.5 17 H31.5" stroke="#1E1B24" strokeWidth="1.6" />
            <rect x="15.5" y="15" width="5" height="4.5" rx="1" fill="#FDE047" stroke="#1E1B24" strokeWidth="1.1" />
            <MiniPeekingNeko x={22} y={20} scale={0.78} />
          </g>
        );
      case 'cat_computer':
        return (
          <g>
            {/* Big laptop with neko ears on screen bezel */}
            <NekoEarTop cx={18} y={8} w={7} h={3.5} />
            <rect x="6.5" y="8" width="23" height="15.5" rx="2" fill="#1E293B" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="8.8" y="10.2" width="18.4" height="11" rx="1" fill="#60A5FA" />
            <path d="M3 24.5 H33 L30.5 29 H5.5 Z" fill="#94A3B8" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <MiniPeekingNeko x={12} y={10.5} scale={0.9} />
          </g>
        );
      case 'cat_book':
        return (
          <g>
            {/* Large open book */}
            <path d="M4.5 8 C11 7 15.5 9 18 11.5 C20.5 9 25 7 31.5 8 V27.5 C25 26.5 20.5 28 18 30.5 C15.5 28 11 26.5 4.5 27.5 Z" fill="#EDE9FE" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="18" y1="11.5" x2="18" y2="30" stroke="#7C3AED" strokeWidth="1.6" />
            <line x1="7.5" y1="13" x2="15" y2="14" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="7.5" y1="17.5" x2="15" y2="18.5" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="21" y1="14" x2="28.5" y2="13" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
            <MiniPeekingNeko x={20.5} y={16.5} scale={0.8} />
          </g>
        );
      case 'cat_sport':
        return (
          <g>
            {/* Prominent gym dumbbell */}
            <rect x="4" y="12.5" width="4" height="11" rx="1.5" fill="#10B981" stroke="#1E1B24" strokeWidth="1.3" />
            <rect x="8" y="9.5" width="4.5" height="17" rx="1.5" fill="#34D399" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="12.5" y="15.5" width="11" height="5" fill="#64748B" stroke="#1E1B24" strokeWidth="1.3" />
            <rect x="23.5" y="9.5" width="4.5" height="17" rx="1.5" fill="#34D399" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="28" y="12.5" width="4" height="11" rx="1.5" fill="#10B981" stroke="#1E1B24" strokeWidth="1.3" />
            <MiniPeekingNeko x={12} y={4} scale={0.85} />
          </g>
        );
      case 'cat_bike':
        return (
          <g>
            {/* Large bicycle */}
            <circle cx="9.5" cy="24.5" r="6" fill="none" stroke="#1E1B24" strokeWidth="2.1" />
            <circle cx="26.5" cy="24.5" r="6" fill="none" stroke="#1E1B24" strokeWidth="2.1" />
            <path d="M9.5 24.5 L16 14.5 H24 L26.5 24.5 M16 14.5 L18 24.5 L24 14.5 M21.5 11.5 H26.5" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <MiniPeekingNeko x={11} y={4.5} scale={0.8} />
          </g>
        );
      case 'cat_music':
        return (
          <g>
            {/* Large over-ear headphones with cat ears on headband */}
            <NekoEarTop cx={18} y={7.5} w={7.5} h={4.5} />
            <path d="M7.5 20 V17 C7.5 10.5 12 6.5 18 6.5 C24 6.5 28.5 10.5 28.5 17 V20" stroke="#7C3AED" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <rect x="5" y="18" width="6" height="11" rx="3" fill="#C084FC" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="25" y="18" width="6" height="11" rx="3" fill="#C084FC" stroke="#1E1B24" strokeWidth="1.4" />
            <path d="M16 25 V16 L21 14.5 V23.5" stroke="#1E1B24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <circle cx="14.8" cy="25.5" r="1.8" fill="#1E1B24" />
            <circle cx="19.8" cy="24" r="1.8" fill="#1E1B24" />
          </g>
        );
      case 'cat_movie':
        return (
          <g>
            {/* Large cinema clapperboard */}
            <rect x="5.5" y="13.5" width="25" height="16.5" rx="2" fill="#1E1B24" stroke="#1E1B24" strokeWidth="1.3" />
            <path d="M5.5 13.5 L30.5 9.5 L29.5 5.5 L4.5 9.5 Z" fill="#F472B6" stroke="#1E1B24" strokeWidth="1.3" />
            <line x1="11" y1="8.5" x2="13.5" y2="12" stroke="#FFFFFF" strokeWidth="2.2" />
            <line x1="18.5" y1="7.3" x2="21" y2="10.8" stroke="#FFFFFF" strokeWidth="2.2" />
            <path d="M15 18 L23 22 L15 26 Z" fill="#FDE047" />
            <MiniPeekingNeko x={23} y={20} scale={0.75} />
          </g>
        );
      case 'cat_game':
        return (
          <g>
            {/* Large game controller */}
            <path d="M8 12.5 H28 C31.5 12.5 33 17 31.5 23 C30.5 27 27.5 28 25.5 25.5 L22.5 22.5 H13.5 L10.5 25.5 C8.5 28 5.5 27 4.5 23 C3 17 4.5 12.5 8 12.5 Z" fill="#6366F1" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10.5 15.5 V20.5 M8 18 H13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="16.2" r="1.4" fill="#F472B6" />
            <circle cx="26.8" cy="18.5" r="1.4" fill="#4ADE80" />
            <MiniPeekingNeko x={12} y={4.5} scale={0.78} />
          </g>
        );
      case 'cat_camera':
        return (
          <g>
            {/* Large camera with neko flash ears */}
            <NekoEarTop cx={18} y={10} w={7} h={3.5} />
            <rect x="4.5" y="10" width="27" height="19.5" rx="3.5" fill="#8B5CF6" stroke="#1E1B24" strokeWidth="1.5" />
            <circle cx="18" cy="20" r="6.5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1.6" />
            <circle cx="18" cy="20" r="3.2" fill="#38BDF8" />
            <circle cx="26.5" cy="14" r="1.5" fill="#FEF08A" />
          </g>
        );
      case 'cat_gift':
        return (
          <g>
            {/* Big wrapped gift box + bow */}
            <rect x="6.5" y="14" width="23" height="17" rx="2" fill="#FB7185" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="5" y="10.5" width="26" height="5" rx="1.5" fill="#F43F5E" stroke="#1E1B24" strokeWidth="1.4" />
            <rect x="15.8" y="10.5" width="4.4" height="20.5" fill="#FDE047" stroke="#1E1B24" strokeWidth="1.1" />
            <path d="M18 10.5 C13.5 5 8.5 7 12.5 10.5 M18 10.5 C22.5 5 27.5 7 23.5 10.5" fill="#FDE047" stroke="#1E1B24" strokeWidth="1.3" />
            <MiniPeekingNeko x={23} y={22} scale={0.72} />
          </g>
        );
      case 'cat_clothes':
        return (
          <g>
            {/* Large T-shirt / hoodie with neko print */}
            <path d="M11 7 L6 12 L9.5 16 L11.5 14 V29.5 H24.5 V14 L26.5 16 L30 12 L25 7 C23 9.5 13 9.5 11 7 Z" fill="#E879F9" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <MiniPeekingNeko x={12} y={14.5} scale={0.95} />
          </g>
        );
      case 'cat_sun':
        return (
          <g>
            {/* Large sun + sunglasses */}
            <circle cx="18" cy="18" r="8.5" fill="#FACC15" stroke="#1E1B24" strokeWidth="1.4" />
            <path d="M18 4 V7 M18 29 V32 M4 18 H7 M29 18 H32 M8 8 L10.2 10.2 M25.8 25.8 L28 28 M28 8 L25.8 10.2 M10.2 25.8 L8 28" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="11" y="15.5" width="5.8" height="3.8" rx="1" fill="#0B080C" />
            <rect x="19.2" y="15.5" width="5.8" height="3.8" rx="1" fill="#0B080C" />
            <line x1="16.8" y1="17" x2="19.2" y2="17" stroke="#0B080C" strokeWidth="1.4" />
          </g>
        );
      case 'cat_mountain':
        return (
          <g>
            {/* Big twin mountain peaks + snow caps */}
            <path d="M3.5 29.5 L14 9.5 L24.5 29.5 Z" fill="#16A34A" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M16 29.5 L24.5 13.5 L32.5 29.5 Z" fill="#22C55E" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M11 15.2 L14 9.5 L17 15.2 L15 14 L14 15.5 L13 14 Z" fill="#FFFFFF" />
            <MiniPeekingNeko x={23} y={5} scale={0.75} />
          </g>
        );
      case 'cat_baby':
        return (
          <g>
            {/* Big stroller / family heart */}
            <path d="M8 17 H28 C28 23.5 23 27 18 27 C12 27 8 23.5 8 17 Z" fill="#FB7185" stroke="#1E1B24" strokeWidth="1.5" />
            <path d="M8 17 C8 10.5 13 7 18 7 V17 Z" fill="#FDA4AF" stroke="#1E1B24" strokeWidth="1.4" />
            <path d="M28 17 L31.5 10 H33.5" stroke="#1E1B24" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            <circle cx="12" cy="30" r="2.7" fill="#1E1B24" />
            <circle cx="24" cy="30" r="2.7" fill="#1E1B24" />
            <MiniPeekingNeko x={16} y={7.5} scale={0.78} />
          </g>
        );
      case 'cat_keys':
        return (
          <g>
            {/* Giant brass key with neko bow */}
            <circle cx="11.5" cy="14" r="6.5" fill="#FACC15" stroke="#1E1B24" strokeWidth="1.5" />
            <circle cx="11.5" cy="14" r="2.2" fill="#FFFFFF" stroke="#1E1B24" strokeWidth="1" />
            <path d="M16.5 18.5 L29.5 31 M24.5 26 L28 22.5 M27 28.5 L30.5 25" stroke="#CA8A04" strokeWidth="3.2" strokeLinecap="round" />
            <MiniPeekingNeko x={5.5} y={3} scale={0.72} />
          </g>
        );
      case 'cat_idea':
        return (
          <g>
            {/* Big glowing lightbulb */}
            <path d="M18 5.5 C12.5 5.5 8.5 9.5 8.5 14.5 C8.5 18 10.8 20.5 12.5 22.8 L13 26 H23 L23.5 22.8 C25.2 20.5 27.5 18 27.5 14.5 C27.5 9.5 23.5 5.5 18 5.5 Z" fill="#FDE047" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="13.5" y="26.5" width="9" height="4.5" rx="1.5" fill="#94A3B8" stroke="#1E1B24" strokeWidth="1.3" />
            <MiniPeekingNeko x={12} y={10.5} scale={0.95} />
          </g>
        );
      case 'cat_fire':
        return (
          <g>
            {/* Big urgent flame */}
            <path d="M18 4 C22 10 28 14 27.5 21.5 C27 27.5 23 31.5 18 31.5 C12.5 31.5 8.5 27.5 8.5 21.5 C8.5 16.5 12 13 13 10.5 C14.5 13 15.5 14.5 15.5 14.5 C15.5 10.5 16.5 7 18 4 Z" fill="#F97316" stroke="#1E1B24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M18 16 C20.5 19.5 22 22 21.5 25.5 C21 28 19.5 29.5 18 29.5 C15.5 29.5 14 27 14.5 24 C15 21 17 18.5 18 16 Z" fill="#FDE047" />
            <MiniPeekingNeko x={22} y={3} scale={0.72} />
          </g>
        );
      case 'cat_sleep':
        return (
          <g>
            {/* Big crescent moon + sleeping pillow/bed */}
            <path d="M23 7 C17.5 7.5 13.5 12 13.5 17.5 C13.5 23.5 18.2 28.5 24.5 28.5 C26.8 28.5 29 27.8 30.8 26.5 C28.2 29.8 24 31.5 19.5 31.5 C12 31.5 6.5 25.8 6.5 18.5 C6.5 11.2 12.2 5.5 19.5 5.5 C21 5.5 22 6 23 7 Z" fill="#818CF8" stroke="#1E1B24" strokeWidth="1.4" strokeLinejoin="round" />
            <MiniPeekingNeko x={18} y={13} scale={0.9} />
          </g>
        );
      case 'cat_think':
        return (
          <g>
            {/* Giant magnifying glass */}
            <circle cx="15.5" cy="15.5" r="9.5" fill="#E0E7FF" stroke="#1E1B24" strokeWidth="2.2" />
            <line x1="22.5" y1="22.5" x2="31" y2="31" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
            <MiniPeekingNeko x={9.5} y={10.5} scale={0.95} />
          </g>
        );
      case 'cat_sad':
        return <MiniNekoHeadFull variant="sad" />;
      case 'cat_love':
        return (
          <g>
            {/* Big bright heart + neko ears */}
            <NekoEarTop cx={18} y={10} w={7.5} h={4} />
            <path
              d="M18 30.5 C18 30.5 5.5 22 5.5 13.5 C5.5 9.2 9 6.5 12.8 6.5 C15.2 6.5 17 7.8 18 9.8 C19 7.8 20.8 6.5 23.2 6.5 C27 6.5 30.5 9.2 30.5 13.5 C30.5 22 18 30.5 18 30.5 Z"
              fill="#F43F5E"
              stroke="#1E1B24"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <MiniPeekingNeko x={12} y={13} scale={0.9} />
          </g>
        );
      case 'cat_happy':
        return (
          <g>
            {/* Giant golden star + happy neko */}
            <path
              d="M18 4.5 L21.8 12.5 L30.5 13.8 L24.2 20 L25.7 28.8 L18 24.6 L10.3 28.8 L11.8 20 L5.5 13.8 L14.2 12.5 Z"
              fill="#FACC15"
              stroke="#1E1B24"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <MiniPeekingNeko x={12} y={14} scale={0.85} />
          </g>
        );
      case 'cat_note':
      default:
        return (
          <g>
            {/* Big notepad with pencil & neko corner */}
            <rect x="7" y="5.5" width="21" height="25.5" rx="3" fill="#DDD6FE" stroke="#1E1B24" strokeWidth="1.5" />
            <line x1="11" y1="12" x2="24" y2="12" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="11" y1="17" x2="21" y2="17" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="11" y1="22" x2="18" y2="22" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M22 25 L30.5 16.5 L33 19 L24.5 27.5 L20.5 28.5 Z" fill="#FBBF24" stroke="#1E1B24" strokeWidth="1.2" />
            <MiniPeekingNeko x={5} y={1} scale={0.75} />
          </g>
        );
    }
  };

  return (
    <span
      title={title || meta.label}
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClass}`}
    >
      <svg
        viewBox="0 0 36 36"
        className="h-full w-full block overflow-visible"
        aria-hidden="true"
      >
        {showBackdrop && (
          <circle
            cx="18"
            cy="18"
            r="17"
            fill="#F5F3FF"
            stroke={meta.accentColor}
            strokeWidth="1.4"
          />
        )}
        {renderObjectArtwork()}
      </svg>
    </span>
  );
};

interface CatEmoticonPickerProps {
  value: CatEmoticonId;
  onSelect: (id: CatEmoticonId) => void;
  onResetAuto?: () => void;
  isAuto?: boolean;
  variant?: CatEmoticonVariant;
}

export const CatEmoticonPicker: React.FC<CatEmoticonPickerProps> = ({
  value,
  onSelect,
  onResetAuto,
  isAuto = false,
  variant = 'fullFace',
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CAT_EMOTICON_LIBRARY;
    return CAT_EMOTICON_LIBRARY.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="rounded-2xl border border-[var(--todo-card-border)] bg-[var(--todo-surface)] p-2.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[var(--todo-text)]">
          Scegli icona ({CAT_EMOTICON_LIBRARY.length})
        </span>
        {onResetAuto && (
          <button
            type="button"
            onClick={onResetAuto}
            className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              isAuto
                ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-dark)] text-white'
                : 'border-[var(--todo-chip-border)] bg-[var(--todo-card)] text-[var(--todo-text-muted)] hover:bg-[var(--todo-accent-soft)]'
            }`}
          >
            Auto dal testo
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca icona (es. benzina, pacco, pizza...)"
        className="w-full min-h-[28px] rounded-lg border border-[var(--todo-chip-border)] bg-[var(--todo-card)] px-2 py-0.5 text-[11px] text-[var(--todo-text)] placeholder:text-[var(--todo-text-muted)]/65 focus:border-[var(--todo-accent)] focus:outline-none"
      />

      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
        {filtered.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-1 transition-all ${
                active
                  ? 'border-[var(--todo-accent-dark)] bg-[var(--todo-accent-soft)] ring-1 ring-[var(--todo-accent)]'
                  : 'border-[var(--todo-note-border)] bg-[var(--todo-card)] hover:border-[var(--todo-accent)] hover:bg-[var(--todo-accent-soft)]/50'
              }`}
            >
              <CatEmoticonIcon
                emoticonId={item.id}
                variant={variant}
                sizeClass="h-7 w-7"
              />
              <span className="text-[8.5px] leading-tight text-[var(--todo-text-muted)] truncate max-w-full">
                {item.label.split('/')[0].split('&')[0].trim()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
