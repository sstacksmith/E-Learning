'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Lista dozwolonych ścieżek dla rodzica (nieużywana, ale zachowana dla dokumentacji)
// const ALLOWED_PARENT_PATHS = [
//   '/homelogin',
//   '/homelogin/student/courses',
//   '/homelogin/student/grades',
//   '/homelogin/student/tutors'
// ];

// Lista zabronionych ścieżek dla rodzica (wszystkie inne podstrony w /homelogin)
const FORBIDDEN_PARENT_PATHS = [
  '/homelogin/group-chats',
  '/homelogin/repository',
  '/homelogin/conditions',
  '/homelogin/digiteka',
  '/homelogin/support',
  '/homelogin/schedule',
  // Dodaj tutaj inne ścieżki, które mają być zabronione
];

export default function ParentAccess({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';

  useEffect(() => {
    if (!loading && user?.role === 'parent' && pathname) {
      // Jeśli ścieżka jest zabroniona dla rodzica, przekieruj do strony głównej
      if (FORBIDDEN_PARENT_PATHS.some(path => pathname.startsWith(path))) {
        router.push('/homelogin');
      }
    }
  }, [loading, user, pathname, router]);

  if (loading) return null;

  // Jeśli użytkownik jest rodzicem i próbuje dostać się do zabronionej ścieżki
  if (user?.role === 'parent' && FORBIDDEN_PARENT_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }

  return <>{children}</>;
} 