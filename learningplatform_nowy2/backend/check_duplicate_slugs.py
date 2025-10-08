#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

import firebase_admin
from firebase_admin import credentials, firestore

def check_duplicate_slugs():
    """Sprawdza duplikaty slug w Firebase Firestore"""
    print("Sprawdzanie duplikatów slug w Firebase...")
    
    # Inicjalizuj Firebase
    try:
        # Sprawdź czy Firebase jest już zainicjalizowane
        if not firebase_admin._apps:
            cred = credentials.Certificate('firebase-credentials.json')
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        # Pobierz wszystkie kursy
        courses_ref = db.collection('courses')
        courses = courses_ref.get()
        
        print(f"Znaleziono {len(courses)} kursów w Firebase")
        
        # Grupuj kursy według slug
        slug_groups = {}
        courses_without_slug = []
        
        for course in courses:
            course_data = course.to_dict()
            course_id = course.id
            title = course_data.get('title', 'Brak tytułu')
            
            if not course_data.get('slug'):
                courses_without_slug.append((course_id, title))
            else:
                slug = course_data['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course_id, title))
        
        print(f"\n=== RAPORT DUPLIKATÓW SLUG ===")
        print(f"Kursy bez slug: {len(courses_without_slug)}")
        
        if courses_without_slug:
            print("\nKursy bez slug:")
            for course_id, title in courses_without_slug:
                print(f"  - ID: {course_id}, Tytuł: '{title}'")
        
        duplicates = [slug for slug, courses in slug_groups.items() if len(courses) > 1]
        print(f"\nDuplikaty slug: {len(duplicates)}")
        
        if duplicates:
            print("\nDuplikaty slug:")
            for slug in duplicates:
                courses_list = slug_groups[slug]
                print(f"  Slug '{slug}' używany przez {len(courses_list)} kursów:")
                for course_id, title in courses_list:
                    print(f"    - ID: {course_id}, Tytuł: '{title}'")
        
        unique_slugs = len([slug for slug, courses in slug_groups.items() if len(courses) == 1])
        print(f"\nUnikalne slug: {unique_slugs}")
        print(f"Wszystkie slug: {len(slug_groups)}")
        
        if len(duplicates) == 0 and len(courses_without_slug) == 0:
            print("\n✅ Brak problemów z duplikatami slug!")
        else:
            print(f"\n❌ Znaleziono problemy:")
            print(f"   - {len(courses_without_slug)} kursów bez slug")
            print(f"   - {len(duplicates)} duplikatów slug")
            print("\nUruchom 'python fix_firebase_slugs.py' aby naprawić problemy.")
        
    except Exception as e:
        print(f"Błąd podczas sprawdzania slug w Firebase: {e}")
        return False
    
    return True

if __name__ == '__main__':
    check_duplicate_slugs()
