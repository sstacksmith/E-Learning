# Konfiguracja Firebase na Hostingu - Rozwiązanie błędu JWT Signature

## Problem
Błąd: `invalid_grant: Invalid JWT Signature` podczas tworzenia wydarzeń w kalendarzu lub ustawiania ról użytkowników.

## Przyczyna
Klucz prywatny Firebase (`FIREBASE_PRIVATE_KEY`) jest nieprawidłowo sformatowany w zmiennych środowiskowych hostingu.

## Rozwiązanie

### 1. Pobierz klucz prywatny z Firebase Console
1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Wybierz projekt `cogito-8443e`
3. Przejdź do **Settings** → **Service accounts**
4. Kliknij **Generate new private key**
5. Pobierz plik JSON

### 2. Skonfiguruj zmienne środowiskowe na hostingu

#### Opcja A: Render.com
1. Przejdź do swojego projektu na Render
2. Settings → Environment Variables
3. Dodaj/edytuj zmienne:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**WAŻNE:** 
- Użyj podwójnych cudzysłowów `"`
- Użyj `\n` dla znaków nowej linii (nie rzeczywistych enterów)
- Cały klucz w jednej linii

#### Opcja B: Vercel
1. Przejdź do projektu na Vercel
2. Settings → Environment Variables
3. Dodaj zmienne (format taki sam jak Render)

#### Opcja C: Railway
1. Przejdź do projektu na Railway
2. Variables → Add Variable
3. Format taki sam jak Render

### 3. Format klucza prywatnego

Klucz powinien wyglądać tak:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(może być w jednej linii lub z \n)
-----END PRIVATE KEY-----
```

### 4. Weryfikacja

Po ustawieniu zmiennych:
1. Zrestartuj aplikację na hostingu
2. Sprawdź logi - powinno być: `✅ Firebase Admin SDK initialized successfully`
3. Jeśli nadal jest błąd, sprawdź logi dla szczegółów

### 5. Alternatywne rozwiązanie (jeśli nadal nie działa)

Jeśli problem nadal występuje, możesz:
1. Wygenerować nowy klucz prywatny w Firebase Console
2. Usunąć stary klucz
3. Ustawić nowy klucz w zmiennych środowiskowych

## Uwagi

- **NIE** commituj klucza prywatnego do Git!
- Klucz prywatny jest wrażliwy - trzymaj go w tajemnicy
- Jeśli klucz wycieknie, wygeneruj nowy w Firebase Console

## Testowanie lokalnie

Dla testów lokalnych, użyj pliku `.env`:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_CLIENT_ID="..."
FIREBASE_CLIENT_CERT_URL="..."
```

