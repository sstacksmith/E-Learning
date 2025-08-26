import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type ErrorType = 'not_found' | 'course_not_found' | 'quiz_not_found' | 'instructor_not_found' | 'permission_denied' | 'server_error' | 'network_error';

interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  showSearch?: boolean;
  showSuggestions?: boolean;
  primaryAction?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const router = useRouter();

  const handleError = useCallback((errorType: ErrorType, customMessage?: string) => {
    const errorMap: Record<ErrorType, ErrorInfo> = {
      not_found: {
        type: 'not_found',
        title: 'Ups! Nie znaleziono',
        message: customMessage || 'Strona której szukasz nie istnieje lub została przeniesiona.',
        showSearch: true,
        showSuggestions: true,
        primaryAction: {
          label: 'Strona główna',
          href: '/homelogin'
        }
      },
      course_not_found: {
        type: 'course_not_found',
        title: 'Kurs nie istnieje',
        message: customMessage || 'Kurs którego szukasz został usunięty, przeniesiony lub nigdy nie istniał.',
        showSearch: true,
        showSuggestions: true,
        primaryAction: {
          label: 'Przeglądaj kursy',
          href: '/courses'
        }
      },
      quiz_not_found: {
        type: 'quiz_not_found',
        title: 'Quiz nie istnieje',
        message: customMessage || 'Quiz którego szukasz został usunięty, przeniesiony lub nigdy nie istniał.',
        showSearch: true,
        showSuggestions: true,
        primaryAction: {
          label: 'Przeglądaj quizy',
          href: '/homelogin/student/quizzes'
        }
      },
      instructor_not_found: {
        type: 'instructor_not_found',
        title: 'Instruktor nie istnieje',
        message: customMessage || 'Instruktor którego szukasz nie istnieje lub został usunięty z platformy.',
        showSearch: true,
        showSuggestions: true,
        primaryAction: {
          label: 'Znajdź instruktora',
          href: '/homelogin/instructors'
        }
      },
      permission_denied: {
        type: 'permission_denied',
        title: 'Brak uprawnień',
        message: customMessage || 'Nie masz uprawnień do wyświetlenia tej strony. Skontaktuj się z administratorem.',
        showSearch: false,
        showSuggestions: true,
        primaryAction: {
          label: 'Strona główna',
          href: '/homelogin'
        }
      },
      server_error: {
        type: 'server_error',
        title: 'Błąd serwera',
        message: customMessage || 'Wystąpił błąd po stronie serwera. Spróbuj ponownie za chwilę.',
        showSearch: false,
        showSuggestions: true,
        primaryAction: {
          label: 'Odśwież stronę',
          href: window.location.pathname
        }
      },
      network_error: {
        type: 'network_error',
        title: 'Błąd połączenia',
        message: customMessage || 'Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.',
        showSearch: false,
        showSuggestions: true,
        primaryAction: {
          label: 'Spróbuj ponownie',
          href: window.location.pathname
        }
      }
    };

    setError(errorMap[errorType]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const goHome = useCallback(() => {
    router.push('/homelogin');
  }, [router]);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    error,
    handleError,
    clearError,
    goBack,
    goHome,
    retry
  };
};

export default useErrorHandler;

