# 📋 Lista funkcjonalności do sprawdzenia manualnie

## ⚠️ WAŻNE: Co zostało zmienione podczas naprawy

### 1. 🔴 **WIADOMOŚCI RODZICA** (`/homelogin/parent/messages`)
**Co zmieniono:**
- Zmieniono zapytanie Firestore dla klas ucznia (z `where('id', 'in', ...)` na pobieranie wszystkich i filtrowanie)
- Zmieniono zapytanie wiadomości (z `where('from', 'in', ...)` na dwa osobne zapytania)
- Zmieniono `forEach` na `for...of` dla operacji async

**Co sprawdzić:**
- ✅ **Pobieranie kontaktów:**
  - Czy wyświetlają się kontakty (wychowawca, sekretariat, specjaliści)?
  - Czy wychowawca jest poprawnie przypisany z klasy ucznia?
  - Czy nie ma duplikatów kontaktów?
  - Czy specjaliści (psycholog, pedagog) są widoczni?

- ✅ **Wyświetlanie wiadomości:**
  - Czy wiadomości są poprawnie wyświetlane?
  - Czy wiadomości są posortowane chronologicznie?
  - Czy nie ma duplikatów wiadomościach?
  - Czy wiadomości wysłane i odebrane są widoczne?

- ✅ **Wysyłanie wiadomości:**
  - Czy można wysłać wiadomość?
  - Czy wiadomość pojawia się natychmiast po wysłaniu?
  - Czy wiadomość jest zapisywana w bazie?

- ✅ **Wydajność:**
  - Czy strona ładuje się szybko?
  - Czy nie ma opóźnień przy pobieraniu kontaktów?

---

### 2. 🟡 **PLAN ZAJĘĆ RODZICA** (`/homelogin/parent`)
**Co zmieniono:**
- Tylko usunięto nieużywane importy (nie powinno wpłynąć)

**Co sprawdzić:**
- ✅ Czy plan zajęć wyświetla się poprawnie?
- ✅ Czy przełącznik "Tylko zajęcia fakultatywne" działa?
- ✅ Czy wydarzenia są filtrowane poprawnie?
- ✅ Czy kalendarz wyświetla wszystkie dni tygodnia?

---

### 3. 🟡 **KURSY DZIECKA** (`/homelogin/parent/courses`)
**Co zmieniono:**
- Tylko usunięto nieużywane importy (nie powinno wpłynąć)

**Co sprawdzić:**
- ✅ Czy kursy są wyświetlane w widoku kafelkowym?
- ✅ Czy wyszukiwanie kursów działa?
- ✅ Czy filtrowanie po przedmiocie działa?
- ✅ Czy można przejść do szczegółów kursu?

---

### 4. 🟡 **DZIENNIK OCEN** (`/homelogin/parent/grades`)
**Co zmieniono:**
- Tylko usunięto nieużywane importy (nie powinno wpłynąć)

**Co sprawdzić:**
- ✅ Czy oceny są wyświetlane poprawnie?
- ✅ Czy frekwencja jest wyświetlana per przedmiot?
- ✅ Czy globalna frekwencja jest widoczna?
- ✅ Czy średnie ocen są obliczane poprawnie?

---

## 🎯 PRIORYTETOWE TESTY

### **NAJWAŻNIEJSZE - WIADOMOŚCI:**
1. **Otwórz `/homelogin/parent/messages`**
2. **Sprawdź czy kontakty się ładują:**
   - Powinien być widoczny wychowawca (jeśli uczeń ma klasę)
   - Powinien być widoczny sekretariat (jeśli są admini w bazie)
   - Powinni być widoczni specjaliści (jeśli są w bazie)

3. **Wybierz kontakt i sprawdź:**
   - Czy wiadomości się ładują?
   - Czy można wysłać wiadomość?
   - Czy wiadomość pojawia się po wysłaniu?

4. **Sprawdź w konsoli przeglądarki (F12):**
   - Czy są błędy w konsoli?
   - Czy są błędy związane z Firestore?
   - Czy są warningi o zapytaniach?

---

## 🔍 CO MOŻE SIĘ ZEPSUĆ

### **Potencjalne problemy:**

1. **Brak kontaktów:**
   - Jeśli uczeń nie ma przypisanej klasy → wychowawca nie będzie widoczny
   - Jeśli nie ma adminów w bazie → sekretariat nie będzie widoczny
   - Jeśli nie ma specjalistów → specjaliści nie będą widoczni

2. **Wolne ładowanie:**
   - Nowe zapytanie pobiera WSZYSTKIE klasy, potem filtruje
   - Jeśli jest dużo klas w bazie, może być wolniej

3. **Brak wiadomości:**
   - Nowe zapytanie używa dwóch osobnych zapytań
   - Jeśli struktura danych się zmieniła, mogą nie działać

4. **Duplikaty:**
   - Dodałem sprawdzanie duplikatów w kontaktach i wiadomościach
   - Jeśli są duplikaty, powinny być usunięte

---

## 📝 INSTRUKCJA TESTOWANIA

### **Krok 1: Test podstawowy**
```
1. Zaloguj się jako rodzic
2. Przejdź do /homelogin/parent/messages
3. Sprawdź czy strona się ładuje bez błędów
4. Sprawdź czy widzisz listę kontaktów (lub komunikat "Brak dostępnych kontaktów")
```

### **Krok 2: Test kontaktu**
```
1. Kliknij na kontakt (jeśli są dostępne)
2. Sprawdź czy wiadomości się ładują
3. Sprawdź czy widzisz historię rozmowy
```

### **Krok 3: Test wysyłania**
```
1. Wpisz wiadomość testową
2. Wyślij wiadomość
3. Sprawdź czy pojawia się w oknie czatu
4. Odśwież stronę i sprawdź czy wiadomość została zapisana
```

### **Krok 4: Test konsoli**
```
1. Otwórz DevTools (F12)
2. Przejdź do zakładki Console
3. Sprawdź czy są błędy (czerwone)
4. Sprawdź czy są warningi (żółte)
```

---

## 🐛 CO ZROBIĆ W RAZIE PROBLEMU

### **Jeśli kontakty się nie ładują:**
1. Sprawdź w konsoli przeglądarki błędy
2. Sprawdź czy uczeń ma przypisaną klasę w bazie
3. Sprawdź czy są admini w bazie (kolekcja `users` z `role: 'admin'`)

### **Jeśli wiadomości się nie ładują:**
1. Sprawdź strukturę dokumentów w kolekcji `messages`
2. Sprawdź czy pola `from` i `to` są poprawnie zapisane
3. Sprawdź czy użytkownik ma poprawne `uid`

### **Jeśli jest wolno:**
1. Sprawdź ile jest klas w bazie (kolekcja `classes`)
2. Jeśli jest dużo klas, może być potrzebna optymalizacja
3. Rozważ dodanie indeksów w Firestore

---

## ✅ CHECKLIST KOŃCOWA

- [ ] Wiadomości - kontakty się ładują
- [ ] Wiadomości - można wybrać kontakt
- [ ] Wiadomości - wiadomości się wyświetlają
- [ ] Wiadomości - można wysłać wiadomość
- [ ] Wiadomości - wiadomość się zapisuje
- [ ] Plan zajęć - działa poprawnie
- [ ] Kursy - działają poprawnie
- [ ] Dziennik - działa poprawnie
- [ ] Brak błędów w konsoli
- [ ] Wszystko działa szybko

---

**Data utworzenia:** $(date)
**Ostatnia aktualizacja:** Po naprawie błędów kompilacji

