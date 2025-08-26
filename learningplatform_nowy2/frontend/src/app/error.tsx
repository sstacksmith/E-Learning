'use client';

import { ErrorDisplay } from '@/components/ErrorDisplay';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay 
      error={error.message || 'Wystąpił nieoczekiwany błąd'}
      variant="full" 
      onRetry={reset}
      showHomeButton={true}
      showBackButton={true}
    />
  );
} 