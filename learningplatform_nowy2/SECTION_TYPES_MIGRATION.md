# Migracja Typów Sekcji - Dokumentacja

## Podsumowanie zmian

### Problem
W systemie istniały różne typy sekcji (rozdziałów):
- `material` - materiały edukacyjne
- `assignment` - zadania/egzaminy
- `form` - formularze (nieużywane)
- Oraz sekcje bez zdefiniowanego typu

### Rozwiązanie
Uproszczono system do **tylko dwóch typów**:
1. **Materiał** (`material`) - dla wszystkich treści edukacyjnych
2. **Egzamin** (`assignment`) - tylko dla egzaminów z terminem oddania

## Zmiany w kodzie

### 1. Frontend - Interfejsy TypeScript

**Plik:** `frontend/src/app/homelogin/teacher/courses/[id]/page.tsx`

#### Przed:
```typescript
interface Section {
  type?: "material" | "assignment" | "form";
  formUrl?: string;
}
```

#### Po:
```typescript
interface Section {
  type?: "material" | "assignment";
  // Usunięto formUrl
}
```

### 2. Wyświetlanie typów

#### Przed:
```tsx
<span className="text-base font-normal ml-2">({section.type})</span>
```
Wyświetlało: `(material)`, `(assignment)`, `(form)`

#### Po:
```tsx
<span className="text-base font-normal ml-2">
  ({section.type === 'assignment' ? 'Egzamin' : 'Materiał'})
</span>
```
Wyświetla: `(Egzamin)` lub `(Materiał)`

### 3. Formularz dodawania sekcji

Usunięto typ "form", pozostawiono tylko:
- 📄 **Materiał** - dla treści edukacyjnych
- 📋 **Egzamin** - dla zadań z terminem oddania

### 4. Warunki kalendarzowe

#### Przed:
```typescript
if ((newSection.type === 'assignment' || newSection.type === 'form') && ...)
```

#### Po:
```typescript
if (newSection.type === 'assignment' && ...)
```

## Migracja danych

### Skrypt migracji

**Plik:** `backend/migrate_section_types.py`

Skrypt automatycznie:
1. Przegląda wszystkie kursy w Firebase
2. Dla każdej sekcji:
   - `assignment` → pozostaje bez zmian
   - `form`, `null`, `undefined`, inne → zmienia na `material`
3. Zapisuje zmiany w bazie danych

### Jak uruchomić migrację

```bash
cd E-Learning/learningplatform_nowy2/backend
python migrate_section_types.py
```

### Co robi skrypt

1. **Skanuje** wszystkie kursy w kolekcji `courses`
2. **Analizuje** każdą sekcję w kursie
3. **Zamienia** typy:
   - `assignment` → bez zmian
   - wszystko inne → `material`
4. **Wyświetla** raport z liczby zaktualizowanych sekcji

### Przykładowy output

```
Rozpoczynam migrację typów sekcji...
--------------------------------------------------
  Kurs abc123, Sekcja 'Wprowadzenie': form -> material
  Kurs abc123, Sekcja 'Teoria': None -> material
✓ Zaktualizowano kurs abc123 (2 sekcje)
--------------------------------------------------

Podsumowanie migracji:
Przeskanowane kursy: 15
Zaktualizowane kursy: 8
Zaktualizowane sekcje: 23

✓ Migracja zakończona!
```

## Bezpieczeństwo danych

### Zabezpieczenia przed błędami

Dodano zabezpieczenia przed `undefined`:

```typescript
// Przed (powodowało crash):
{subsection.materials.length} materiałów

// Po (bezpieczne):
{subsection.materials?.length || 0} materiałów
```

```typescript
// Przed (powodowało crash):
{subsection.materials.length === 0 ? ...

// Po (bezpieczne):
{(!subsection.materials || subsection.materials.length === 0) ? ...
```

## Testy

### Co należy przetestować po migracji

1. **Wyświetlanie sekcji**
   - Czy wszystkie sekcje wyświetlają poprawny typ
   - Czy egzaminy pokazują termin oddania

2. **Dodawanie nowych sekcji**
   - Czy można dodać Materiał
   - Czy można dodać Egzamin z terminem

3. **Edycja istniejących sekcji**
   - Czy można zmienić typ sekcji
   - Czy dropdown ma tylko dwie opcje

4. **Kompatybilność wsteczna**
   - Czy stare kursy ładują się poprawnie
   - Czy nie ma błędów konsoli

## Pliki zmodyfikowane

1. `frontend/src/app/homelogin/teacher/courses/[id]/page.tsx` - główny komponent
2. `backend/migrate_section_types.py` - nowy skrypt migracji
3. `SECTION_TYPES_MIGRATION.md` - ta dokumentacja

## Rollback (cofnięcie zmian)

Jeśli coś pójdzie nie tak, możesz cofnąć zmiany:

1. Frontend: przywróć stary typ w interfejsie
2. Backend: dane w Firebase nie są usuwane, tylko zmieniane

**UWAGA:** Przed migracją zaleca się zrobić backup bazy danych Firebase!

## FAQ

**Q: Co się stanie ze starymi sekcjami typu "form"?**  
A: Zostaną automatycznie zamienione na "material" przez skrypt migracji.

**Q: Czy muszę uruchomić skrypt migracji?**  
A: Tak, aby zaktualizować istniejące dane w bazie. Nowe sekcje będą tworzone z poprawnymi typami.

**Q: Co jeśli mam custom typy sekcji?**  
A: Wszystkie custom typy zostaną zamienione na "material". Tylko "assignment" pozostaje bez zmian.

**Q: Czy mogę cofnąć migrację?**  
A: Technicznie tak, ale lepiej zrobić backup przed migracją.

