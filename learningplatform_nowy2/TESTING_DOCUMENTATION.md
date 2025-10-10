# Dokumentacja testów dla systemu generowania unikalnych slugów

## Przegląd

Ten dokument opisuje kompleksowy system testów dla funkcji generowania unikalnych slugów kursów. Testy obejmują testy jednostkowe, integracyjne, przypadków brzegowych i wydajności.

## Struktura testów

### 📁 Katalog testów
```
backend/tests/
├── __init__.py
├── test_slug_generation.py      # Testy podstawowej funkcji generowania slug
├── test_duplicate_checking.py   # Testy sprawdzania duplikatów
├── test_slug_fixing.py          # Testy skryptu naprawy duplikatów
├── test_edge_cases.py           # Testy przypadków brzegowych
└── test_performance.py          # Testy wydajności
```

### 🚀 Skrypt uruchamiający
```
backend/run_all_tests.py         # Główny skrypt do uruchamiania wszystkich testów
```

## Kategorie testów

### 1. Testy generowania slug (`test_slug_generation.py`)

**Cel:** Testowanie podstawowej funkcji `generate_unique_slug()`

**Testowane funkcjonalności:**
- ✅ Podstawowe generowanie slug z tytułu
- ✅ Obsługa znaków specjalnych
- ✅ Obsługa liczb w tytule
- ✅ Obsługa pustych tytułów
- ✅ Obsługa duplikatów slug
- ✅ Zabezpieczenie przed nieskończoną pętlą
- ✅ Obsługa bardzo długich tytułów
- ✅ Obsługa błędów bazy danych
- ✅ Generowanie w środowisku współbieżnym

**Przykłady testów:**
```python
def test_basic_slug_generation(self):
    result = generate_unique_slug("Matematyka", self.mock_db)
    self.assertEqual(result, "matematyka")

def test_duplicate_slug_handling(self):
    # Mock: pierwszy slug istnieje, drugi nie
    self.mock_query.get.side_effect = [[Mock()], []]
    result = generate_unique_slug("Matematyka", self.mock_db)
    self.assertEqual(result, "matematyka-1")
```

### 2. Testy sprawdzania duplikatów (`test_duplicate_checking.py`)

**Cel:** Testowanie funkcji sprawdzania duplikatów w Firebase

**Testowane funkcjonalności:**
- ✅ Sprawdzanie istnienia slug w Firebase
- ✅ Obsługa błędów bazy danych
- ✅ Grupowanie kursów według slug
- ✅ Identyfikacja duplikatów
- ✅ Walidacja formatu slug

**Przykłady testów:**
```python
def test_slug_exists_in_firebase_true(self):
    mock_doc = Mock()
    self.mock_query.get.return_value = [mock_doc]
    result = slug_exists_in_firebase(self.mock_db, "matematyka")
    self.assertTrue(result)
```

### 3. Testy naprawy duplikatów (`test_slug_fixing.py`)

**Cel:** Testowanie skryptu naprawy istniejących duplikatów

**Testowane funkcjonalności:**
- ✅ Naprawa kursów bez slug
- ✅ Naprawa duplikatów slug
- ✅ Obsługa pustych tytułów
- ✅ Obsługa znaków specjalnych
- ✅ Wydajność naprawy dużej liczby kursów

**Przykłady testów:**
```python
def test_fix_courses_without_slug(self):
    courses_without_slug = [("course1", "Matematyka")]
    # Symulacja logiki naprawy
    fixed_courses = fix_courses_logic(courses_without_slug)
    self.assertEqual(fixed_courses[0][2], "matematyka")
```

### 4. Testy przypadków brzegowych (`test_edge_cases.py`)

**Cel:** Testowanie nietypowych i ekstremalnych przypadków

**Testowane przypadki:**
- ✅ Puste stringi i None
- ✅ Tylko białe znaki
- ✅ Tylko znaki specjalne
- ✅ Znaki Unicode (cyrylica, chiński, arabski, hebrajski, japoński, koreański)
- ✅ Bardzo długie tytuły (10,000 znaków)
- ✅ Tylko liczby
- ✅ Mieszane wielkości liter
- ✅ Wielokrotne spacje i myślniki
- ✅ Znaki kontrolne
- ✅ Emoji
- ✅ Tagi HTML
- ✅ Próby SQL injection
- ✅ Próby XSS
- ✅ Próby path traversal

**Przykłady testów:**
```python
def test_title_with_unicode_characters(self):
    result = generate_unique_slug("Mатематика", self.mock_db)
    self.assertTrue(result.startswith("course-"))

def test_title_with_sql_injection_attempt(self):
    result = generate_unique_slug("'; DROP TABLE courses; --", self.mock_db)
    self.assertEqual(result, "drop-table-courses--")
```

### 5. Testy wydajności (`test_performance.py`)

**Cel:** Testowanie wydajności i skalowalności

**Testowane aspekty:**
- ✅ Wydajność dla różnych rozmiarów batch (10, 100, 1000, 10000)
- ✅ Użycie pamięci
- ✅ Generowanie współbieżne
- ✅ Wydajność z opóźnieniami bazy danych
- ✅ Wydajność z wysokim wskaźnikiem duplikatów
- ✅ Skalowalność liniowa
- ✅ Wydajność pod obciążeniem
- ✅ Testy regresji wydajności

**Przykłady testów:**
```python
def test_slug_generation_performance_large_batch(self):
    titles = [f"Kurs {i}" for i in range(1000)]
    start_time = time.time()
    for title in titles:
        generate_unique_slug(title, self.mock_db)
    end_time = time.time()
    execution_time = end_time - start_time
    self.assertLess(execution_time, 5.0)
```

## Uruchamianie testów

### 🚀 Uruchomienie wszystkich testów
```bash
cd E-Learning/learningplatform_nowy2/backend
python run_all_tests.py
```

### 🎯 Uruchomienie konkretnej kategorii
```bash
# Testy generowania slug
python run_all_tests.py generation

# Testy sprawdzania duplikatów
python run_all_tests.py duplicates

# Testy naprawy duplikatów
python run_all_tests.py fixing

# Testy przypadków brzegowych
python run_all_tests.py edge

# Testy wydajności
python run_all_tests.py performance
```

### 🔧 Uruchomienie pojedynczego pliku testowego
```bash
# Testy generowania slug
python -m unittest tests.test_slug_generation -v

# Testy sprawdzania duplikatów
python -m unittest tests.test_duplicate_checking -v

# Testy naprawy duplikatów
python -m unittest tests.test_slug_fixing -v

# Testy przypadków brzegowych
python -m unittest tests.test_edge_cases -v

# Testy wydajności
python -m unittest tests.test_performance -v
```

## Przykładowe wyniki

### ✅ Pomyślne uruchomienie
```
================================================================================
URUCHAMIANIE WSZYSTKICH TESTÓW DLA SYSTEMU GENEROWANIA SLUG
================================================================================

📦 Ładowanie modułu: tests.test_slug_generation
✅ Załadowano 15 testów

📦 Ładowanie modułu: tests.test_duplicate_checking
✅ Załadowano 12 testów

📦 Ładowanie modułu: tests.test_slug_fixing
✅ Załadowano 8 testów

📦 Ładowanie modułu: tests.test_edge_cases
✅ Załadowano 25 testów

📦 Ładowanie modułu: tests.test_performance
✅ Załadowano 10 testów

🚀 Uruchamianie 70 testów...
--------------------------------------------------------------------------------

test_basic_slug_generation (tests.test_slug_generation.TestSlugGeneration) ... ok
test_slug_with_special_characters (tests.test_slug_generation.TestSlugGeneration) ... ok
test_duplicate_slug_handling (tests.test_slug_generation.TestSlugGeneration) ... ok
...

================================================================================
PODSUMOWANIE WYNIKÓW
================================================================================
📊 Łączna liczba testów: 70
✅ Przeszło: 70
❌ Nie przeszło: 0
💥 Błędy: 0
⏭️  Pominięte: 0
⏱️  Czas wykonania: 2.34s
⚡ Wydajność: 29.9 testów/sekundę

================================================================================
🎉 WSZYSTKIE TESTY PRZESZŁY POMYŚLNIE!
✅ System generowania unikalnych slugów działa poprawnie
```

## Metryki wydajności

### 📊 Oczekiwane czasy wykonania
- **10 slugów:** < 0.1s
- **100 slugów:** < 1.0s
- **1000 slugów:** < 5.0s
- **10000 slugów:** < 30.0s

### 💾 Oczekiwane użycie pamięci
- **100 slugów:** < 1MB
- **1000 slugów:** < 10MB
- **10000 slugów:** < 50MB

### ⚡ Wydajność współbieżna
- **100 slugów (10 wątków):** < 2.0s
- **50 duplikatów (10 wątków):** < 5.0s

## Pokrycie testów

### ✅ Testowane funkcjonalności
- [x] Podstawowe generowanie slug
- [x] Obsługa duplikatów
- [x] Sprawdzanie w Firebase
- [x] Naprawa istniejących duplikatów
- [x] Przypadki brzegowe
- [x] Wydajność i skalowalność
- [x] Obsługa błędów
- [x] Generowanie współbieżne

### 🔧 Funkcjonalności do rozszerzenia
- [ ] Testy integracyjne z rzeczywistą bazą Firebase
- [ ] Testy obciążeniowe z bardzo dużą liczbą kursów (100,000+)
- [ ] Testy z różnymi konfiguracjami Firebase
- [ ] Testy z różnymi wersjami Python

## Debugowanie testów

### 🔍 Uruchomienie z debugowaniem
```bash
# Uruchomienie z maksymalną szczegółowością
python -m unittest tests.test_slug_generation -v -v

# Uruchomienie konkretnego testu
python -m unittest tests.test_slug_generation.TestSlugGeneration.test_basic_slug_generation -v
```

### 📝 Dodawanie nowych testów
1. Otwórz odpowiedni plik testowy
2. Dodaj nową metodę testową zaczynającą się od `test_`
3. Użyj `self.assert*` do sprawdzenia wyników
4. Uruchom testy aby sprawdzić czy działają

### 🐛 Rozwiązywanie problemów
- **ImportError:** Sprawdź czy wszystkie zależności są zainstalowane
- **Mock errors:** Sprawdź czy mocki są poprawnie skonfigurowane
- **Performance failures:** Sprawdź czy system ma wystarczające zasoby

## Zależności

### 📦 Wymagane pakiety
```bash
pip install unittest-mock psutil
```

### 🔧 Opcjonalne pakiety
```bash
pip install pytest pytest-cov  # Dla alternatywnego runnera testów
```

## Status

✅ **Kompletne i gotowe do użycia**
- Wszystkie kategorie testów zaimplementowane
- Dokumentacja kompletna
- Skrypty uruchamiające gotowe
- Przykłady i instrukcje dostępne

System testów jest gotowy do użycia i zapewnia kompleksowe pokrycie funkcjonalności generowania unikalnych slugów!
