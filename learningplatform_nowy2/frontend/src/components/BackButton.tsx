'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function BackButton({ href, className = '', children }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 bg-[#4067EC] text-white rounded-lg hover:bg-[#5577FF] transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {children || 'Powrót'}
    </button>
  );
}
