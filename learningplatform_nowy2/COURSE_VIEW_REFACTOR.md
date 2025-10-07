# Refaktoryzacja Widoku Kursu - Dokumentacja

## Podsumowanie zmian

Zrefaktoryzowano widoki kursu dla ucznia i nauczyciela, tworząc ujednolicony interfejs z trzema zakładkami: **Przegląd**, **Egzaminy** i **Quizy**.

## Nowa struktura widoków

### 1. Komponenty

#### `CourseViewShared.tsx` - Wspólny komponent widoku
**Lokalizacja:** `frontend/src/components/CourseViewShared.tsx`

Wspólny komponent używany zarówno przez ucznia jak i nauczyciela (podgląd). Zawiera:
- 3 zakładki: Przegląd, Egzaminy, Quizy
- Automatycznie aktualizowane statystyki
- Struktura accordion dla rozdziałów > lekcje > materiały
- Obsługa wszystkich typów treści (tekst, video, pliki, quizy, matematyka)

**Props:**
```typescript
interface CourseViewProps {
  course: any;           // Dane kursu
  sections: any[];       // Rozdziały z lekcjami
  quizzes: any[];        // Lista quizów
  isTeacherPreview?: boolean;  // Czy to widok nauczyciela
}
```

### 2. Widoki

#### Widok ucznia
**Lokalizacja:** `frontend/src/app/homelogin/student/courses/[id]/page.tsx`

- Używa komponentu `CourseViewShared` z `isTeacherPreview={false}`
- Sprawdza czy uczeń ma dostęp do kursu
- Pobiera dane kursu i quizów z Firebase
- Może rozwiązywać quizy i otwierać egzaminy

#### Widok podglądu nauczyciela
**Lokalizacja:** `frontend/src/app/homelogin/teacher/courses/[id]/preview/page.tsx`

- Używa komponentu `CourseViewShared` z `isTeacherPreview={true}`
- Identyczny wygląd jak widok ucznia
- Tryb tylko do odczytu (bez możliwości rozwiązywania quizów)
- Sprawdza czy nauczyciel jest właścicielem kursu

#### Widok edycji nauczyciela (bez zmian)
**Lokalizacja:** `frontend/src/app/homelogin/teacher/courses/[id]/page.tsx`

- Pozostał bez zmian
- Dodano przycisk "👁️ Podgląd" w nagłówku
- Przycisk przenosi do `/homelogin/teacher/courses/[id]/preview`

## Struktura menu

### 1. Zakładka "Przegląd"

#### Statystyki (auto-update)
Wyświetlane na górze strony w 4 kartach:
- 📚 **Rozdziały** - liczba rozdziałów
- 📁 **Lekcje** - liczba lekcji (subsections)
- 🎓 **Egzaminy** - liczba rozdziałów typu `assignment`
- ❓ **Quizy** - liczba quizów przypisanych do kursu

```typescript
const stats = {
  sections: totalSections,      // Liczba rozdziałów
  lessons: totalLessons,         // Liczba lekcji
  exams: totalExams,             // Liczba egzaminów
  quizzes: quizzes.length        // Liczba quizów
};
```

#### Struktura treści
**Rozdziały > Lekcje > Materiały** (accordion/collapsible)

```
📖 Rozdział 1 (Materiał) - 5 lekcji
  └─ 📁 Lekcja 1 - 3 materiały
      ├─ 📄 Tekst: Wprowadzenie
      ├─ 🎥 Video: Wykład
      └─ 📎 Plik: Prezentacja.pdf
  └─ 📁 Lekcja 2 - 2 materiały
      └─ ...

🎓 Rozdział 2 (Egzamin) - Termin: 27.09.2025
  └─ 📁 Lekcja 1
      └─ ...
```

**Typy materiałów obsługiwane:**
- 📄 **Text** - tekst z formatowaniem
- 🧮 **Math** - wzory matematyczne (MathView)
- 🎥 **Video** - YouTube lub upload
- 📎 **File** - pliki do pobrania
- ❓ **Quiz** - quiz przypisany do lekcji

### 2. Zakładka "Egzaminy"

Lista wszystkich egzaminów (rozdziały typu `assignment`):
- Nazwa egzaminu
- Opis (jeśli jest)
- 📅 Termin oddania (wyróżniony na czerwono)
- Przycisk "Otwórz egzamin" (tylko dla ucznia)

**Integracja z kalendarzem:**
- Egzaminy są automatycznie dodawane do kalendarza ucznia
- Funkcja `createCalendarEvent()` w komponencie nauczyciela

### 3. Zakładka "Quizy"

Lista quizów przypisanych do kursu (niezależne od rozdziałów):
- Wyświetlane w siatce 2 kolumny
- Nazwa quizu
- Opis
- Liczba pytań
- Przycisk "Rozpocznij quiz" (tylko dla ucznia)

## Implementacja techniczna

### Obliczanie statystyk

```typescript
const stats = React.useMemo(() => {
  let totalSections = 0;
  let totalLessons = 0;
  let totalExams = 0;

  sections.forEach((section: any) => {
    totalSections++;
    if (section.type === 'assignment') {
      totalExams++;
    }
    if (section.subsections && section.subsections.length > 0) {
      totalLessons += section.subsections.length;
    }
  });

  return {
    sections: totalSections,
    lessons: totalLessons,
    exams: totalExams,
    quizzes: quizzes.length
  };
}, [sections, quizzes]);
```

### Filtrowanie egzaminów

```typescript
const exams = React.useMemo(() => {
  return sections
    .filter((section: any) => section.type === 'assignment')
    .map((section: any) => ({
      id: section.id,
      name: section.name,
      deadline: section.deadline,
      description: section.description
    }));
}, [sections]);
```

### Pobieranie quizów

```typescript
const quizzesQuery = query(
  collection(db, "quizzes"),
  where("courseId", "==", String(courseId))
);
const quizzesSnapshot = await getDocs(quizzesQuery);
const quizzesData = quizzesSnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

## Design i UX

### Kolory i stylizacja
- **Header:** Gradient blue-600 → indigo-600
- **Zakładki:** Podświetlenie niebieskie dla aktywnej
- **Statystyki:** Różne kolory dla każdego typu (niebieski, zielony, fioletowy, pomarańczowy)
- **Accordion:** Szare tło dla rozdziałów, niebieskie dla lekcji
- **Egzaminy:** Czerwony kolor dla terminów
- **Quizy:** Pomarańczowy kolor

### Responsywność
- **Mobile:** 1 kolumna dla statystyk i quizów
- **Desktop:** 4 kolumny dla statystyk, 2 dla quizów
- Sticky tabs podczas scrollowania
- Płynne animacje accordion

### Wskaźniki stanu
- **Loading:** Spinner z animacją
- **Error:** Karta z ikoną ⚠️ i przyciskiem powrotu
- **Empty state:** Ikony i komunikaty dla pustych list
- **Teacher preview:** Badge "👁️ Tryb podglądu"

## Różnice między widokami

| Funkcja | Uczeń | Nauczyciel (podgląd) |
|---------|-------|---------------------|
| Wyświetlanie treści | ✅ | ✅ |
| Statystyki | ✅ | ✅ |
| Przyciski akcji (quiz/egzamin) | ✅ | ❌ |
| Badge "Tryb podglądu" | ❌ | ✅ |
| Sprawdzanie dostępu | Tak (assignedUsers) | Tak (created_by) |

## Nawigacja

### Dla ucznia
```
/homelogin/student/courses/[id]
```

### Dla nauczyciela
```
/homelogin/teacher/courses/[id]           # Widok edycji (bez zmian)
/homelogin/teacher/courses/[id]/preview   # Widok podglądu (nowy)
```

### Przycisk podglądu
W widoku edycji nauczyciela dodano przycisk:
```tsx
<button
  onClick={() => window.location.href = `/homelogin/teacher/courses/${courseId}/preview`}
  className="...gradient..."
>
  👁️ Podgląd
</button>
```

## Pliki zmodyfikowane

1. ✅ `frontend/src/components/CourseViewShared.tsx` - Nowy komponent wspólny
2. ✅ `frontend/src/app/homelogin/student/courses/[id]/page.tsx` - Przepisany widok ucznia
3. ✅ `frontend/src/app/homelogin/teacher/courses/[id]/preview/page.tsx` - Nowy widok podglądu
4. ✅ `frontend/src/app/homelogin/teacher/courses/[id]/page.tsx` - Dodano przycisk podglądu

## TODO - Pozostałe do zrobienia

### Integracja z kalendarzem (pending)
- [ ] Dodać automatyczne dodawanie egzaminów do kalendarza ucznia
- [ ] Pokazywać nadchodzące terminy w widoku kursu
- [ ] Powiadomienia przed terminem egzaminu

### Funkcjonalność quizów (pending)
- [ ] Implementacja rozwiązywania quizów
- [ ] Zapisywanie wyników
- [ ] Wyświetlanie historii prób

### Funkcjonalność egzaminów (pending)
- [ ] Otwieranie egzaminów
- [ ] Przesyłanie odpowiedzi
- [ ] Wyświetlanie ocen

## Testowanie

### Co przetestować:

1. **Widok ucznia:**
   - [ ] Załadowanie kursu
   - [ ] Przełączanie zakładek
   - [ ] Rozwijanie/zwijanie rozdziałów i lekcji
   - [ ] Wyświetlanie różnych typów materiałów
   - [ ] Sprawdzenie dostępu (assigned vs non-assigned)

2. **Widok nauczyciela (podgląd):**
   - [ ] Przycisk "Podgląd" w widoku edycji
   - [ ] Załadowanie podglądu
   - [ ] Identyczny wygląd jak widok ucznia
   - [ ] Brak przycisków akcji
   - [ ] Badge "Tryb podglądu"

3. **Responsywność:**
   - [ ] Mobile (< 768px)
   - [ ] Tablet (768px - 1024px)
   - [ ] Desktop (> 1024px)

4. **Statystyki:**
   - [ ] Poprawne liczenie rozdziałów
   - [ ] Poprawne liczenie lekcji
   - [ ] Poprawne liczenie egzaminów
   - [ ] Poprawne liczenie quizów
   - [ ] Auto-update po dodaniu treści

## FAQ

**Q: Czy stary widok ucznia został usunięty?**  
A: Tak, został całkowicie przepisany. Nowy widok używa komponentu `CourseViewShared`.

**Q: Czy widok edycji nauczyciela został zmieniony?**  
A: Nie, pozostał bez zmian. Dodano tylko przycisk "Podgląd" w nagłówku.

**Q: Jak nauczyciel przechodzi do podglądu?**  
A: Klikając przycisk "👁️ Podgląd" w prawym górnym rogu widoku edycji.

**Q: Czy uczeń i nauczyciel widzą to samo?**  
A: Tak, wygląd jest identyczny. Różnica jest tylko w dostępności przycisków akcji.

**Q: Co się stanie jeśli kurs nie ma rozdziałów/lekcji?**  
A: Wyświetli się "empty state" z odpowiednią ikoną i komunikatem.

