# 🧪 Test Flow Rejestracji

## ✅ **AKTUALNY FLOW:**

### **1. Użytkownik wypełnia formularz:**
```
Imię: Jan
Nazwisko: Kowalski
Email: jan.kowalski@cogitowroclaw.pl
Hasło: ******
Powtórz hasło: ******
☑ Akceptuję regulamin
```

### **2. Kliknięcie "ZAREJESTRUJ SIĘ":**
```javascript
handleRegister() {
  // Walidacja
  if (!email.endsWith('@cogitowroclaw.pl')) {
    ❌ Błąd: "Tylko adresy email z domeny @cogitowroclaw.pl są dozwolone"
    return;
  }
  
  // Tworzenie konta
  await createUserWithEmailAndPassword(auth, email, password);
  
  // Zapis do Firestore
  await setDoc(doc(db, "users", uid), {
    email,
    firstName,
    lastName,
    approved: false,  // ⚠️ Wymaga zatwierdzenia przez admina
    role: "student"
  });
  
  // Wylogowanie
  await auth.signOut();
  
  // Notyfikacja
  showNotification('success', 'Rejestracja przebiegła pomyślnie!');
  
  // Przekierowanie po 2 sekundach
  setTimeout(() => {
    router.push('/login');  // ✅ PRZEKIEROWANIE
  }, 2000);
}
```

---

## 🎯 **OCZEKIWANY REZULTAT:**

### **Sukces:**
```
1. ✅ Formularz wypełniony poprawnie
2. ✅ Email z domeny @cogitowroclaw.pl
3. ✅ Konto utworzone w Firebase Auth
4. ✅ Dane zapisane w Firestore (approved: false)
5. ✅ Użytkownik wylogowany
6. ✅ Notyfikacja: "Rejestracja przebiegła pomyślnie! Poczekaj na zatwierdzenie przez administratora."
7. ✅ Po 2 sekundach → Przekierowanie do /login
```

### **Błąd - Nieprawidłowa domena:**
```
1. ❌ Email: jan@gmail.com
2. ❌ Błąd: "Tylko adresy email z domeny @cogitowroclaw.pl są dozwolone"
3. ❌ Pozostaje na stronie rejestracji
```

---

## 🧪 **SCENARIUSZE TESTOWE:**

### **Test 1: Prawidłowa rejestracja**
```
Input:
- Imię: Jan
- Nazwisko: Kowalski
- Email: jan.kowalski@cogitowroclaw.pl
- Hasło: test123
- Powtórz hasło: test123
- ☑ Regulamin

Expected:
✅ Notyfikacja sukcesu
✅ Po 2s → /login
```

### **Test 2: Nieprawidłowa domena**
```
Input:
- Email: jan@gmail.com

Expected:
❌ Błąd: "Tylko adresy email z domeny @cogitowroclaw.pl są dozwolone"
❌ Pozostaje na /register
```

### **Test 3: Hasła nie pasują**
```
Input:
- Hasło: test123
- Powtórz hasło: test456

Expected:
❌ Błąd: "Hasła nie są identyczne"
❌ Pozostaje na /register
```

### **Test 4: Brak akceptacji regulaminu**
```
Input:
- ☐ Regulamin (unchecked)

Expected:
❌ Błąd: "Musisz zaakceptować regulamin"
❌ Pozostaje na /register
```

### **Test 5: Social Login (Google)**
```
Action:
- Klik "Google"
- Wybór konta: user@cogitowroclaw.pl

Expected:
✅ Zalogowany
✅ Przekierowanie do /homelogin
```

---

## 🔍 **JAK PRZETESTOWAĆ RĘCZNIE:**

### **Krok 1: Otwórz stronę rejestracji**
```
http://192.168.88.41:3000/register
```

### **Krok 2: Wypełnij formularz**
```
Imię: Test
Nazwisko: User
Email: test@cogitowroclaw.pl
Hasło: test123
Powtórz hasło: test123
☑ Akceptuję regulamin
```

### **Krok 3: Kliknij "ZAREJESTRUJ SIĘ"**

### **Krok 4: Obserwuj:**
```
1. Przycisk zmienia się na "Rejestracja..."
2. Po chwili pojawia się zielona notyfikacja:
   "Rejestracja przebiegła pomyślnie! Poczekaj na zatwierdzenie przez administratora."
3. Po 2 sekundach → Automatyczne przekierowanie do /login
```

### **Krok 5: Sprawdź konsolę (F12):**
```
🔄 Rozpoczynam rejestrację...
✅ Rejestracja zakończona pomyślnie
```

---

## 🐛 **MOŻLIWE PROBLEMY:**

### **Problem 1: Nie przekierowuje**
```
Przyczyna: setTimeout nie działa
Rozwiązanie: Sprawdź czy router jest zaimportowany
```

### **Problem 2: Przekierowuje za szybko**
```
Przyczyna: Timeout za krótki
Rozwiązanie: Zwiększ z 2000ms na 3000ms
```

### **Problem 3: Błąd Firebase**
```
Przyczyna: Email już istnieje
Komunikat: "Firebase: Error (auth/email-already-in-use)"
Rozwiązanie: Użyj innego emaila
```

---

## ✅ **WERYFIKACJA KODU:**

### **Kod przekierowania (linia 96-98):**
```typescript
setTimeout(() => {
  router.push('/login');
}, 2000);
```

### **Walidacja domeny (linia 65-67):**
```typescript
if (!email.endsWith('@cogitowroclaw.pl')) {
  tempErrors.email = "Tylko adresy email z domeny @cogitowroclaw.pl są dozwolone";
}
```

### **Wylogowanie (linia 93):**
```typescript
await auth.signOut();
```

---

## 📊 **PODSUMOWANIE:**

| Funkcja | Status | Opis |
|---------|--------|------|
| Walidacja domeny | ✅ | @cogitowroclaw.pl only |
| Tworzenie konta | ✅ | Firebase Auth |
| Zapis do Firestore | ✅ | approved: false |
| Wylogowanie | ✅ | auth.signOut() |
| Notyfikacja | ✅ | Sukces po polsku |
| Przekierowanie | ✅ | /login po 2s |
| Social Login | ✅ | Google + Microsoft |

---

## 🚀 **GOTOWE DO TESTU!**

Kod jest **poprawny** i powinien działać zgodnie z oczekiwaniami:

1. ✅ Rejestracja
2. ✅ Notyfikacja sukcesu
3. ✅ **Przekierowanie do /login po 2 sekundach**

**Przetestuj teraz:** http://192.168.88.41:3000/register


