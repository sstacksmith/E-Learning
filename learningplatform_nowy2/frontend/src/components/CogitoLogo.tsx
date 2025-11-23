import React from 'react';

interface CogitoLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export default function CogitoLogo({ className = '', size = 32, alt = 'Cogito Logo' }: CogitoLogoProps) {
  return (
    <img
      src="/cogito-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`${className} object-contain`}
      style={{ width: 'auto', height: 'auto', maxWidth: `${size}px`, maxHeight: `${size}px` }}
      onError={(e) => {
        // Fallback jeśli logo nie może być załadowane
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}

