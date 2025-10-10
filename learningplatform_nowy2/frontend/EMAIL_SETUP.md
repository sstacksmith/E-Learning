# Konfiguracja Email dla Zgłaszania Błędów

## Krok 1: Utwórz plik .env.local

W folderze `frontend/` utwórz plik `.env.local` z następującą zawartością:

```env
# Email configuration for bug reports
EMAIL_USER=twoj-gmail@gmail.com
EMAIL_PASS=twoje-haslo-aplikacji
```

## Krok 2: Skonfiguruj Gmail

### 2.1 Włącz 2FA na koncie Gmail
1. Idź do [Google Account Security](https://myaccount.google.com/security)
2. Włącz "2-Step Verification"

### 2.2 Wygeneruj hasło aplikacji
1. Idź do [App Passwords](https://myaccount.google.com/apppasswords)
2. Wybierz "Mail" i "Other (Custom name)"
3. Wpisz nazwę: "E-Learning Platform"
4. Skopiuj wygenerowane hasło (16 znaków)
5. Użyj tego hasła w `EMAIL_PASS`

## Krok 3: Przykład konfiguracji

```env
EMAIL_USER=mojemail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

## Krok 4: Restart serwera

Po dodaniu zmiennych środowiskowych, zrestartuj serwer deweloperski:

```bash
npm run dev
```

## Testowanie

1. Idź do `/homelogin/report-bug`
2. Wypełnij formularz
3. Kliknij "Wyślij zgłoszenie"
4. Sprawdź czy email dotarł do `SosSojowy@outlook.com`

## Rozwiązywanie problemów

### Błąd: "Missing credentials for PLAIN"
- Sprawdź czy `EMAIL_USER` i `EMAIL_PASS` są ustawione
- Upewnij się, że hasło aplikacji jest poprawne
- Sprawdź czy 2FA jest włączone

### Błąd: "Invalid login"
- Sprawdź czy email jest poprawny
- Upewnij się, że używasz hasła aplikacji, a nie zwykłego hasła
- Sprawdź czy konto Gmail nie jest zablokowane

### Email nie dociera
- Sprawdź folder spam
- Sprawdź czy adres `SosSojowy@outlook.com` jest poprawny
- Sprawdź logi serwera w konsoli

## Bez konfiguracji email

Jeśli nie skonfigurujesz email, zgłoszenia będą zapisywane w konsoli serwera. Sprawdź terminal gdzie uruchamiasz `npm run dev` - tam będą widoczne wszystkie zgłoszenia błędów.
