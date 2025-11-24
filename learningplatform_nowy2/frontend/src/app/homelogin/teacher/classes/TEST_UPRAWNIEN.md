# Test Uprawnień do Tworzenia Klas

## Instrukcje testowania:

1. Otwórz konsolę przeglądarki (F12)
2. Spróbuj utworzyć klasę
3. Sprawdź logi w konsoli - powinny pokazać:
   - Token claims (czy rola jest ustawiona)
   - Błędy uprawnień (jeśli występują)
   - Szczegóły błędu

## Możliwe problemy i rozwiązania:

### Problem 1: "Missing or insufficient permissions"
**Przyczyna:** Reguły Firestore nie pozwalają na zapis

**Rozwiązanie:**
1. Sprawdź czy reguły Firestore są wdrożone:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. Sprawdź czy token ma ustawioną rolę:
   - W konsoli sprawdź log: `🎫 Token claims`
   - Jeśli `role` jest `undefined`, ustaw custom claims:
     - Przejdź do `/api/set-teacher-role-api`
     - Lub użyj Firebase Console > Authentication > Users > [User] > Custom Claims

### Problem 2: Token nie ma roli
**Przyczyna:** Custom claims nie są ustawione

**Rozwiązanie:**
1. Ustaw custom claims przez API:
   ```javascript
   fetch('/api/set-teacher-role-api', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ uid: 'YOUR_UID' })
   })
   ```
2. Odśwież token:
   ```javascript
   await auth.currentUser.getIdToken(true) // forceRefresh
   ```

### Problem 3: Reguły Firestore nie działają
**Przyczyna:** Reguły nie są wdrożone lub są niepoprawne

**Rozwiązanie:**
1. Sprawdź plik `firestore.rules`
2. Wdróż reguły:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Sprawdź w Firebase Console > Firestore > Rules czy reguły są aktywne

## Testy do wykonania:

1. ✅ Sprawdź czy użytkownik jest zalogowany
2. ✅ Sprawdź czy token ma ustawioną rolę 'teacher'
3. ✅ Sprawdź czy reguły Firestore są wdrożone
4. ✅ Sprawdź czy teacher_id w danych == request.auth.uid
5. ✅ Sprawdź czy kolekcja 'classes' istnieje

## Debugowanie:

Wszystkie logi są w konsoli przeglądarki. Szukaj:
- 🚀 ========== START CREATE CLASS ==========
- 🎫 Token claims
- ❌ ========== ERROR CREATING CLASS ==========

