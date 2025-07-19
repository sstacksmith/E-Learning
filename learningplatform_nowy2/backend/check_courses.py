#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta

# Dodaj ścieżkę do Django settings
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from learningplatform.models import Course, User
from firebase_admin import firestore
import firebase_admin
from firebase_admin import credentials

def check_courses():
    print("=== SPRAWDZANIE KURSÓW W BAZIE DANYCH ===")
    
    # Sprawdź wszystkie kursy w Django
    all_courses = Course.objects.all().order_by('-created_at')
    print(f"Liczba wszystkich kursów w Django: {all_courses.count()}")
    
    for course in all_courses:
        print(f"\nKurs ID: {course.id}")
        print(f"  Tytuł: {course.title}")
        print(f"  Utworzony przez: {course.created_by.email}")
        print(f"  Data utworzenia: {course.created_at}")
        print(f"  Ostatnia aktualizacja: {course.updated_at}")
        print(f"  Aktywny: {course.is_active}")
        print(f"  Slug: {course.slug}")
        print(f"  Przedmiot: {course.subject}")
        print(f"  Rok nauki: {course.year_of_study}")
    
    # Sprawdź kursy z ostatnich 10 minut
    ten_minutes_ago = datetime.now() - timedelta(minutes=10)
    recent_courses = Course.objects.filter(created_at__gte=ten_minutes_ago)
    print(f"\n=== KURSY Z OSTATNICH 10 MINUT ===")
    print(f"Liczba kursów z ostatnich 10 minut: {recent_courses.count()}")
    
    for course in recent_courses:
        print(f"  - {course.title} (ID: {course.id}) - {course.created_at}")
    
    # Sprawdź Firestore
    print("\n=== SPRAWDZANIE FIRESTORE ===")
    try:
        db = firestore.client()
        firestore_courses = db.collection('courses').get()
        print(f"Liczba kursów w Firestore: {len(firestore_courses)}")
        
        for doc in firestore_courses:
            data = doc.to_dict()
            print(f"  Firestore ID: {doc.id}")
            print(f"    Tytuł: {data.get('title', 'Brak')}")
            print(f"    Data utworzenia: {data.get('created_at', 'Brak')}")
            print(f"    Aktywny: {data.get('is_active', 'Brak')}")
    except Exception as e:
        print(f"Błąd podczas sprawdzania Firestore: {e}")
    
    # Sprawdź użytkowników nauczycieli
    print("\n=== SPRAWDZANIE NAUCZYCIELI ===")
    teachers = User.objects.filter(is_teacher=True)
    print(f"Liczba nauczycieli: {teachers.count()}")
    
    for teacher in teachers:
        teacher_courses = Course.objects.filter(created_by=teacher)
        print(f"  {teacher.email}: {teacher_courses.count()} kursów")
        for course in teacher_courses:
            print(f"    - {course.title} (ID: {course.id})")

if __name__ == "__main__":
    check_courses() 