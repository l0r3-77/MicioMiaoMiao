import React, { useState } from 'react';

interface CatIllustrationProps {
  src: string;
  alt: string;
  className?: string;
}

export const CatIllustration: React.FC<CatIllustrationProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-[#FAF5E8] text-stone-900 ${className}`}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-10 w-10"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="24" fill="#D4B5F7" />
          <path
            d="M17 26 L15 11 L26 19 C29 18 35 18 38 19 L49 11 L47 26 C50 30 51 35 50 40 C48 47 41 51 32 51 C23 51 16 47 14 40 C13 35 14 30 17 26 Z"
            fill="#1C1917"
            stroke="#1C1917"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M23 32 C24.5 29.5 27 29.5 28.5 32" stroke="#FAF5E8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M35.5 32 C37 29.5 39.5 29.5 41 32" stroke="#FAF5E8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30.5 36.5 L32 38 L33.5 36.5 Z" fill="#F9A8D4" />
          <path d="M28 40 C29.5 44 34.5 44 36 40 Z" fill="#FB7185" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
