import { useEffect } from 'react';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import app from '@/config/firebase';

export function useAppCheckDebug() {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof self !== 'undefined') {
      // Ustaw debug token przed inicjalizacją App Check
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = '63C59AC6-AF8A-483C-BF48-57FF5205B6EF';
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('khbjasd76892kbasbd89621-21'),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }, []);
} 