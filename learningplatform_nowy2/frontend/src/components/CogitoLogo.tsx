import React from 'react';
import Image from 'next/image';

interface CogitoLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export default function CogitoLogo({ className = '', size = 32, alt = 'Cogito Logo' }: CogitoLogoProps) {
  return (
    <Image
      src="/cogito-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`${className} object-contain`}
      priority={size > 48}
      style={{ width: 'auto', height: 'auto', maxWidth: `${size}px`, maxHeight: `${size}px` }}
    />
  );
}

