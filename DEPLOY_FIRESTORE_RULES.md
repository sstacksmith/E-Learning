# Wdrożenie reguł Firestore

## Problem
Błędy "Missing or insufficient permissions" występują, ponieważ reguły Firestore nie są wdrożone w Firebase.

## Rozwiązanie

### Opcja 1: Wdrożenie przez Firebase CLI (zalecane)

1. **Zainstaluj Firebase CLI** (jeśli nie masz):
   ```bash
   npm install -g firebase-tools
   ```

2. **Zaloguj się do Firebase**:
   ```bash
   firebase login
   ```

3. **Przejdź do katalogu głównego projektu**:
   ```bash
   cd E-Learning
   ```

4. **Wdróż reguły Firestore**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Opcja 2: Wdrożenie przez Firebase Console

1. Otwórz [Firebase Console](https://console.firebase.google.com/)
2. Wybierz swój projekt
3. Przejdź do **Firestore Database** > **Rules**
4. Skopiuj zawartość pliku `E-Learning/firestore.rules`
5. Wklej do edytora reguł w konsoli
6. Kliknij **Publish**

## Sprawdzenie czy reguły są wdrożone

Po wdrożeniu reguł, sprawdź w konsoli przeglądarki czy błędy zniknęły. Jeśli nadal występują:

1. **Odśwież token autoryzacji**:
   - Wyloguj się i zaloguj ponownie
   - Lub w konsoli przeglądarki wykonaj:
     ```javascript
     await firebase.auth().currentUser.getIdToken(true)
     ```

2. **Sprawdź czy użytkownik ma przypisaną rolę**:
   - W Firebase Console > Authentication > Users
   - Sprawdź czy użytkownik ma ustawione custom claims (rola)

## Dodane reguły

Reguły zostały zaktualizowane o:

1. **userSessions** - użytkownicy mogą zarządzać tylko swoimi sesjami
2. **userLearningTime** - użytkownicy mogą zarządzać tylko swoim czasem nauki
3. **messages** - użytkownicy mogą czytać i pisać wiadomości, gdzie są nadawcą lub odbiorcą
4. **parent_students** - rodzice mogą czytać swoje relacje z uczniami

## Ważne

- Reguły muszą być wdrożone w Firebase, aby działały
- Zmiany w regułach mogą zająć kilka sekund, aby zostały zastosowane
- Po wdrożeniu reguł, odśwież stronę i spróbuj ponownie

