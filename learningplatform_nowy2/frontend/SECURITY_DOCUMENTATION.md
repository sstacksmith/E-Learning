# 🔐 Dokumentacja Bezpieczeństwa - Cogito Learning Platform

## Przegląd

Ten dokument opisuje implementację zabezpieczeń sesji użytkownika w aplikacji Cogito Learning Platform, w tym mechanizmy zapobiegające nieautoryzowanemu dostępowi i przechwyceniu sesji.

---

## 🛡️ Zaimplementowane Zabezpieczenia

### 1. **SessionStorage zamiast LocalStorage**

**Problem:** LocalStorage przechowuje dane permanentnie, co oznacza, że użytkownik pozostaje zalogowany nawet po zamknięciu przeglądarki. To zwiększa ryzyko przechwycenia sesji przez osoby nieupoważnione.

**Rozwiązanie:** Wszystkie tokeny autoryzacyjne i dane użytkownika są teraz przechowywane w `sessionStorage`, który automatycznie czyści się po zamknięciu przeglądarki.

**Pliki zmodyfikowane:**
- `src/context/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useApi.ts`

**Przykład:**
```typescript
// Przed (NIEBEZPIECZNE):
localStorage.setItem('firebaseToken', token);

// Po (BEZPIECZNE):
sessionStorage.setItem('firebaseToken', token);
```

---

### 2. **Firebase Session Persistence**

**Konfiguracja:** Firebase Auth jest skonfigurowany z `browserSessionPersistence`, co oznacza, że sesja Firebase również wygasa po zamknięciu przeglądarki.

**Plik:** `src/config/firebase.ts`

```typescript
import { setPersistence, browserSessionPersistence } from 'firebase/auth';

if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}
```

---

### 3. **Automatyczne Wylogowanie po Nieaktywności**

**Problem:** Jeśli użytkownik pozostawi otwartą sesję bez nadzoru, może to stanowić zagrożenie bezpieczeństwa.

**Rozwiązanie:** Implementacja automatycznego wylogowania po 30 minutach nieaktywności.

**Plik:** `src/context/AuthContext.tsx`

**Jak to działa:**
1. Timer jest resetowany przy każdej aktywności użytkownika (kliknięcie, ruch myszy, scroll, dotknięcie)
2. Po 30 minutach bez aktywności użytkownik jest automatycznie wylogowywany
3. Timestamp ostatniej aktywności jest zapisywany w `sessionStorage`
4. Przy ponownym załadowaniu strony sprawdzana jest ostatnia aktywność

**Monitorowane zdarzenia:**
- `mousedown` - kliknięcie myszy
- `keydown` - naciśnięcie klawisza
- `scroll` - przewijanie strony
- `touchstart` - dotknięcie ekranu (mobile)
- `click` - kliknięcie

```typescript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minut

useEffect(() => {
  if (isAuthenticated) {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });
    
    // Automatyczne wylogowanie po timeout
    inactivityTimer = setTimeout(async () => {
      console.warn('⏰ Automatyczne wylogowanie z powodu nieaktywności');
      await logout();
    }, INACTIVITY_TIMEOUT);
  }
}, [isAuthenticated]);
```

---

### 4. **Automatyczne Odświeżanie Tokenów**

**Problem:** Tokeny JWT mają ograniczony czas ważności. Wygasły token może powodować błędy autoryzacji.

**Rozwiązanie:** Tokeny są automatycznie odświeżane 5 minut przed ich wygaśnięciem.

**Plik:** `src/hooks/useAuth.ts`

**Jak to działa:**
1. Token jest dekodowany, aby pobrać czas wygaśnięcia (`exp`)
2. Timer jest ustawiany na 5 minut przed wygaśnięciem
3. Token jest automatycznie odświeżany przed wygaśnięciem
4. Nowy token jest zapisywany w `sessionStorage`

```typescript
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minut

const scheduleTokenRefresh = useCallback((token: string): void => {
  const expiryTime = getTokenExpiry(token);
  const timeUntilRefresh = Math.max(0, expiryTime - Date.now() - TOKEN_EXPIRY_BUFFER);

  const timeout = setTimeout(async () => {
    if (user) {
      const newToken = await user.getIdToken(true);
      storeToken(newToken, getTokenExpiry(newToken));
      scheduleTokenRefresh(newToken);
    }
  }, timeUntilRefresh);
}, [user]);
```

---

### 5. **Sprawdzanie Ważności Tokenu przy Każdym Żądaniu**

**Problem:** Używanie wygasłego tokenu może prowadzić do błędów 401/403.

**Rozwiązanie:** Przed każdym żądaniem API sprawdzana jest ważność tokenu. Jeśli token wygasł, jest automatycznie odświeżany.

**Plik:** `src/hooks/useAuth.ts`

```typescript
const getAuthToken = useCallback(async (): Promise<string | null> => {
  if (!user) return null;

  // Sprawdź cache
  const cachedToken = getStoredToken();
  if (cachedToken) {
    return cachedToken; // Token jest ważny
  }

  // Token wygasł - pobierz nowy
  const token = await user.getIdToken();
  const expiryTime = getTokenExpiry(token);
  storeToken(token, expiryTime);
  scheduleTokenRefresh(token);
  return token;
}, [user]);
```

---

### 6. **Obsługa Błędów Autoryzacji**

**Plik:** `src/hooks/useApi.ts`

**Obsługiwane kody błędów:**
- **401 Unauthorized:** Sesja wygasła - automatyczne przekierowanie do `/login`
- **403 Forbidden:** Brak uprawnień do wykonania operacji
- **404 Not Found:** Zasób nie istnieje

```typescript
if (response.status === 401) {
  // Wyczyść wszystkie dane sesji
  sessionStorage.removeItem('firebaseToken');
  sessionStorage.removeItem('firebaseTokenExpiry');
  sessionStorage.removeItem('lastActivity');
  
  // Przekieruj do logowania
  window.location.href = '/login';
  throw new Error('Sesja wygasła. Zaloguj się ponownie.');
}
```

---

## 📊 Porównanie: Przed vs. Po

| Aspekt | Przed | Po |
|--------|-------|-----|
| **Przechowywanie tokenów** | localStorage (permanentne) | sessionStorage (tymczasowe) |
| **Sesja po zamknięciu przeglądarki** | ✅ Pozostaje zalogowany | ❌ Automatyczne wylogowanie |
| **Wylogowanie po nieaktywności** | ❌ Brak | ✅ 30 minut |
| **Odświeżanie tokenów** | ⚠️ Manualne | ✅ Automatyczne (5 min przed wygaśnięciem) |
| **Sprawdzanie ważności tokenu** | ⚠️ Przy błędzie | ✅ Przed każdym żądaniem |
| **Ryzyko przechwycenia sesji** | 🔴 Wysokie | 🟢 Niskie |

---

## 🔧 Konfiguracja

### Zmiana Czasu Nieaktywności

Domyślnie: **30 minut**

Aby zmienić, edytuj `src/context/AuthContext.tsx`:

```typescript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // Zmień na żądaną wartość (w milisekundach)
```

Przykłady:
- 15 minut: `15 * 60 * 1000`
- 1 godzina: `60 * 60 * 1000`
- 5 minut: `5 * 60 * 1000`

### Zmiana Bufora Odświeżania Tokenu

Domyślnie: **5 minut przed wygaśnięciem**

Aby zmienić, edytuj `src/hooks/useAuth.ts`:

```typescript
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // Zmień na żądaną wartość
```

---

## 🧪 Testowanie

### Test 1: Wylogowanie po Zamknięciu Przeglądarki

1. Zaloguj się do aplikacji
2. Zamknij przeglądarkę (wszystkie karty)
3. Otwórz przeglądarkę ponownie
4. Przejdź do aplikacji

**Oczekiwany wynik:** Użytkownik powinien zostać przekierowany do strony logowania.

### Test 2: Automatyczne Wylogowanie po Nieaktywności

1. Zaloguj się do aplikacji
2. Pozostaw aplikację otwartą bez żadnej aktywności przez 30 minut
3. Spróbuj wykonać jakąkolwiek akcję

**Oczekiwany wynik:** Użytkownik powinien zostać automatycznie wylogowany i przekierowany do strony logowania.

### Test 3: Odświeżanie Tokenu

1. Zaloguj się do aplikacji
2. Otwórz DevTools (F12) → Console
3. Obserwuj logi przez ~55 minut (tokeny Firebase wygasają po 1 godzinie)

**Oczekiwany wynik:** Token powinien zostać automatycznie odświeżony po ~55 minutach (5 minut przed wygaśnięciem).

---

## 🚨 Najlepsze Praktyki

### Dla Użytkowników:

1. **Zawsze wylogowuj się** po zakończeniu pracy, szczególnie na urządzeniach współdzielonych
2. **Nie udostępniaj** swoich danych logowania
3. **Używaj silnych haseł** (min. 8 znaków, wielkie/małe litery, cyfry, znaki specjalne)
4. **Nie pozostawiaj** otwartej sesji bez nadzoru

### Dla Deweloperów:

1. **Nigdy nie przechowuj** tokenów w localStorage dla danych wrażliwych
2. **Zawsze używaj HTTPS** w produkcji
3. **Regularnie aktualizuj** zależności (Firebase, Next.js, etc.)
4. **Monitoruj logi** pod kątem podejrzanej aktywności
5. **Implementuj rate limiting** dla endpointów API

---

## 📝 Changelog

### v2.0.0 (2024-11-22)

**Zmiany bezpieczeństwa:**
- ✅ Migracja z localStorage na sessionStorage
- ✅ Automatyczne wylogowanie po 30 minutach nieaktywności
- ✅ Automatyczne odświeżanie tokenów przed wygaśnięciem
- ✅ Sprawdzanie ważności tokenu przed każdym żądaniem API
- ✅ Ulepszona obsługa błędów autoryzacji

**Pliki zmodyfikowane:**
- `src/context/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useApi.ts`

---

## 🔗 Powiązane Dokumenty

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

## 📞 Kontakt

W razie pytań lub problemów z bezpieczeństwem, skontaktuj się z zespołem deweloperskim.

**Data ostatniej aktualizacji:** 22 listopada 2024


