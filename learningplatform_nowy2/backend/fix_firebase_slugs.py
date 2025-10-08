#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

import firebase_admin
from firebase_admin import credentials, firestore
import uuid
import re

def fix_firebase_duplicate_slugs():
    """Naprawia duplikaty slug w Firebase Firestore"""
    print("Naprawianie duplikatów slug w Firebase...")
    
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
            
            if not course_data.get('slug'):
                courses_without_slug.append((course_id, course_data))
            else:
                slug = course_data['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course_id, course_data))
        
        print(f"Znaleziono {len(courses_without_slug)} kursów bez slug")
        print(f"Znaleziono {len([s for s in slug_groups.values() if len(s) > 1])} grup z duplikatami slug")
        
        # Napraw kursy bez slug
        for course_id, course_data in courses_without_slug:
            title = course_data.get('title', '')
            base_slug = generate_slug(title)
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while slug_exists_in_firebase(db, unique_slug):
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            # Zaktualizuj kurs
            course_ref = db.collection('courses').document(course_id)
            course_ref.update({'slug': unique_slug})
            print(f"Naprawiono slug dla kursu '{title}': {unique_slug}")
        
        # Napraw duplikaty
        for slug, course_list in slug_groups.items():
            if len(course_list) > 1:
                print(f"Naprawianie duplikatu slug '{slug}' dla {len(course_list)} kursów")
                
                # Pierwszy kurs zachowuje oryginalny slug
                first_course_id, first_course_data = course_list[0]
                print(f"Kurs '{first_course_data.get('title', '')}' zachowuje slug: {slug}")
                
                # Pozostałe kursy dostają unikalne slug
                for i, (course_id, course_data) in enumerate(course_list[1:], 1):
                    title = course_data.get('title', '')
                    base_slug = generate_slug(title)
                    if not base_slug:
                        base_slug = f"course-{course_id[:8]}"
                    
                    # Dodaj unikalny identyfikator
                    unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
                    while slug_exists_in_firebase(db, unique_slug):
                        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
                    
                    # Zaktualizuj kurs
                    course_ref = db.collection('courses').document(course_id)
                    course_ref.update({'slug': unique_slug})
                    print(f"Naprawiono duplikat slug dla kursu '{title}': {unique_slug}")
        
        print("Naprawianie slug w Firebase zakończone!")
        
    except Exception as e:
        print(f"Błąd podczas naprawiania slug w Firebase: {e}")
        return False
    
    return True

def generate_slug(title):
    """Generuje slug z tytułu"""
    if not title:
        return ""
    
    # Usuń znaki specjalne i zamień spacje na myślniki
    slug = re.sub(r'[^a-z0-9\s-]', '', title.lower())
    slug = re.sub(r'\s+', '-', slug)
    slug = slug.strip('-')
    
    return slug

def slug_exists_in_firebase(db, slug):
    """Sprawdza czy slug już istnieje w Firebase"""
    try:
        courses_ref = db.collection('courses')
        query = courses_ref.where('slug', '==', slug)
        results = query.get()
        return len(results) > 0
    except Exception as e:
        print(f"Błąd podczas sprawdzania slug '{slug}': {e}")
        return False

if __name__ == '__main__':
    fix_firebase_duplicate_slugs()
