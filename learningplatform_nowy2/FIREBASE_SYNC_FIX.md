# Naprawa synchronizacji Firebase i kursów

## Problemy które zostały naprawione:

### 1. Problem z zapisywaniem kursów w Firebase
- **Problem**: Kursy nie były prawidłowo synchronizowane z Firestore
- **Rozwiązanie**: 
  - Dodano funkcję `sync_course_to_firestore()` w `views.py`
  - Poprawiono strukturę danych zapisywanych w Firestore
  - Dodano lepsze logowanie błędów

### 2. Problem z widocznością uczniów
- **Problem**: Niektórzy uczniowie nie byli widoczni w kursach
- **Rozwiązanie**:
  - Naprawiono funkcję `teacher_course_detail()` aby pobierała dane z Django API
  - Poprawiono funkcję `assign_course()` aby lepiej obsługiwała synchronizację
  - Dodano szczegółowe informacje o przypisanych użytkownikach

### 3. Problem z wyglądem kursów
- **Problem**: Kursy nie wyglądały jak kurs Algebra
- **Rozwiązanie**:
  - Przeprojektowano stronę kursów nauczyciela z nowoczesnym designem
  - Dodano lepsze karty kursów z informacjami o PDF i linkach
  - Poprawiono formularz tworzenia kursów

## Instrukcje naprawy:

### 1. Synchronizacja istniejących kursów z Firebase

```bash
cd learningplatform_nowy2/backend
python manage.py sync_courses_to_firestore
```

Aby zsynchronizować konkretny kurs:
```bash
python manage.py sync_courses_to_firestore --course-id 1
```

### 2. Naprawa przypisań kursów

```bash
cd learningplatform_nowy2/backend
python manage.py fix_course_assignments --fix-firestore
```

Aby naprawić konkretny kurs:
```bash
python manage.py fix_course_assignments --course-id 1 --fix-firestore
```

### 3. Sprawdzenie statusu synchronizacji

```bash
cd learningplatform_nowy2/backend
python manage.py shell
```

```python
from learningplatform.models import Course
from learningplatform.views import sync_course_to_firestore
import firebase_admin
from firebase_admin import firestore

# Sprawdź kursy w Django
courses = Course.objects.all()
print(f"Liczba kursów w Django: {courses.count()}")

# Sprawdź kursy w Firestore
if not firebase_admin._apps:
    firebase_admin.initialize_app()
db = firestore.client()
firestore_courses = db.collection('courses').get()
print(f"Liczba kursów w Firestore: {len(firestore_courses)}")

# Sprawdź konkretny kurs
course = Course.objects.get(id=1)
print(f"Kurs: {course.title}")
print(f"Przypisani uczniowie: {course.courseassignment_set.filter(is_active=True).count()}")
```

## Nowe funkcjonalności:

### 1. Lepsze logowanie
- Dodano szczegółowe logi w `views.py`
- Lepsze komunikaty błędów
- Informacje o statusie synchronizacji

### 2. Poprawiona struktura danych w Firestore
```json
{
  "id": 1,
  "title": "Nazwa kursu",
  "description": "Opis kursu",
  "year_of_study": 1,
  "subject": "Matematyka",
  "is_active": true,
  "created_by": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "pdfUrls": ["url1", "url2"],
  "links": ["link1", "link2"],
  "slug": "nazwa-kursu",
  "assignedUsers": ["user1@email.com", "user2@email.com"],
  "sections": [],
  "total_students": 2
}
```

### 3. Nowy design kursów nauczyciela
- Karty kursów z informacjami o statusie
- Licznik PDF i linków
- Przyciski "Zarządzaj" i "Podgląd"
- Lepszy formularz tworzenia kursów

## Rozwiązywanie problemów:

### Jeśli kursy nadal się nie zapisują:
1. Sprawdź logi Django:
```bash
python manage.py runserver --verbosity=2
```

2. Sprawdź połączenie z Firebase:
```python
import firebase_admin
from firebase_admin import firestore

if not firebase_admin._apps:
    firebase_admin.initialize_app()
db = firestore.client()
print("Firebase połączenie OK")
```

### Jeśli uczniowie nie są widoczni:
1. Sprawdź przypisania w Django:
```python
from learningplatform.models import CourseAssignment
assignments = CourseAssignment.objects.filter(is_active=True)
for a in assignments:
    print(f"Kurs: {a.course.title}, Uczeń: {a.student.email}")
```

2. Sprawdź dane w Firestore:
```python
course_doc = db.collection('courses').document('1').get()
if course_doc.exists:
    data = course_doc.to_dict()
    print(f"Przypisani użytkownicy: {data.get('assignedUsers', [])}")
```

### Jeśli frontend nie ładuje kursów:
1. Sprawdź token Firebase w localStorage
2. Sprawdź odpowiedzi API w Network tab przeglądarki
3. Sprawdź logi w konsoli przeglądarki

## Komendy pomocnicze:

### Wyświetl wszystkie kursy:
```bash
python manage.py shell
```
```python
from learningplatform.models import Course
for c in Course.objects.all():
    print(f"ID: {c.id}, Tytuł: {c.title}, Aktywny: {c.is_active}")
```

### Wyświetl przypisania:
```bash
python manage.py shell
```
```python
from learningplatform.models import CourseAssignment
for a in CourseAssignment.objects.filter(is_active=True):
    print(f"Kurs: {a.course.title}, Uczeń: {a.student.email}")
```

### Sprawdź użytkowników:
```bash
python manage.py shell
```
```python
from api.models import User
for u in User.objects.filter(is_student=True):
    print(f"ID: {u.id}, Email: {u.email}, Nauczyciel: {u.is_teacher}")
``` 