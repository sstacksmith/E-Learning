# Rozwiązanie problemu konfliktów slug kursów

## Problem
Firebase miał problemy z kursami o tej samej nazwie, ponieważ funkcja generowania slugów nie sprawdzała duplikatów. To mogło prowadzić do:
- Konfliktów w identyfikacji kursów
- Błędów w routingu
- Problemów z wyświetlaniem kursów

## Rozwiązanie

### 1. Naprawiona funkcja generowania slugów w `views.py`

**Plik:** `E-Learning/learningplatform_nowy2/backend/learningplatform/views.py`

**Zmiany:**
- Zastąpiono prostą funkcję `generate_slug()` funkcją `generate_unique_slug()`
- Dodano sprawdzanie duplikatów w Firebase Firestore
- Dodano zabezpieczenie przed nieskończoną pętlą
- Dodano fallback z UUID jeśli licznik przekroczy 1000

**Nowa funkcja:**
```python
def generate_unique_slug(title, db):
    import re
    import uuid
    
    # Generuj bazowy slug
    base_slug = re.sub(r'[^a-z0-9\s-]', '', title.lower()).replace(' ', '-').strip('-')
    if not base_slug:
        base_slug = f"course-{uuid.uuid4().hex[:8]}"
    
    # Sprawdź czy slug już istnieje w Firebase
    unique_slug = base_slug
    counter = 1
    
    while True:
        # Sprawdź w Firebase czy slug już istnieje
        existing_courses = db.collection('courses').where('slug', '==', unique_slug).get()
        if not existing_courses:
            break
        
        # Jeśli istnieje, dodaj licznik
        unique_slug = f"{base_slug}-{counter}"
        counter += 1
        
        # Zabezpieczenie przed nieskończoną pętlą
        if counter > 1000:
            unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
            break
    
    return unique_slug
```

### 2. Skrypty do naprawy istniejących duplikatów

**Plik:** `E-Learning/learningplatform_nowy2/backend/check_duplicate_slugs.py`
- Sprawdza duplikaty slug w Firebase
- Generuje raport z problemami
- Pokazuje kursy bez slug i duplikaty

**Plik:** `E-Learning/learningplatform_nowy2/backend/fix_firebase_slugs.py`
- Naprawia duplikaty slug w Firebase
- Dodaje unikalne slugi do kursów bez slug
- Rozwiązuje konflikty duplikatów

### 3. Test funkcji generowania slugów

**Plik:** `E-Learning/learningplatform_nowy2/backend/test_slug_generation.py`
- Testuje funkcję generowania unikalnych slugów
- Sprawdza poprawność formatu
- Weryfikuje unikalność

## Jak używać

### Sprawdzenie duplikatów:
```bash
cd E-Learning/learningplatform_nowy2/backend
python check_duplicate_slugs.py
```

### Naprawa duplikatów:
```bash
cd E-Learning/learningplatform_nowy2/backend
python fix_firebase_slugs.py
```

### Test funkcji:
```bash
cd E-Learning/learningplatform_nowy2/backend
python test_slug_generation.py
```

## Przykłady generowanych slugów

| Tytuł kursu | Wygenerowany slug |
|-------------|-------------------|
| "Matematyka" | `matematyka` |
| "Matematyka" (duplikat) | `matematyka-1` |
| "Matematyka" (kolejny duplikat) | `matematyka-2` |
| "Język Polski" | `jzyk-polski` |
| "Fizyka" | `fizyka` |

## Korzyści

1. **Unikalność:** Każdy kurs ma unikalny slug
2. **Kompatybilność:** Zachowana kompatybilność z istniejącymi kursami
3. **Bezpieczeństwo:** Zabezpieczenie przed nieskończoną pętlą
4. **Czytelność:** Slug nadal czytelny i zrozumiały
5. **Automatyzacja:** Automatyczne rozwiązywanie konfliktów

## Uwagi techniczne

- Funkcja sprawdza duplikaty w czasie rzeczywistym w Firebase
- Używa licznika dla kolejnych duplikatów (matematyka-1, matematyka-2, itd.)
- Fallback z UUID dla ekstremalnych przypadków
- Zachowana kompatybilność z istniejącymi kursami
- Wszystkie slugi używają małych liter i myślników

## Status

✅ **Zaimplementowane i przetestowane**
- Funkcja generowania unikalnych slugów
- Skrypty do naprawy duplikatów
- Testy funkcjonalności
- Dokumentacja

Problem z konfliktami slug kursów został rozwiązany!
