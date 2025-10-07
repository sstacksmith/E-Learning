#!/usr/bin/env python3
"""
Skrypt migracji typów sekcji w kursach
Zamienia wszystkie typy sekcji na 'material' lub 'assignment'
Wszystko co nie jest 'assignment' zostaje zamienione na 'material'
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json

# Inicjalizacja Firebase
cred = credentials.Certificate('firebase-credentials.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

def migrate_section_types():
    """
    Migruje typy sekcji w wszystkich kursach:
    - 'assignment' pozostaje bez zmian
    - wszystkie inne typy ('form', etc.) -> 'material'
    - brak typu -> 'material' (domyślny)
    """
    courses_ref = db.collection('courses')
    courses = courses_ref.get()
    
    total_courses = 0
    updated_courses = 0
    total_sections_updated = 0
    
    print("Rozpoczynam migrację typów sekcji...")
    print("-" * 50)
    
    for course_doc in courses:
        total_courses += 1
        course_id = course_doc.id
        course_data = course_doc.to_dict()
        
        if 'sections' not in course_data or not course_data['sections']:
            continue
            
        sections = course_data['sections']
        sections_updated_in_course = 0
        
        for i, section in enumerate(sections):
            old_type = section.get('type', None)
            
            # Jeśli typ to 'assignment', pozostaw bez zmian
            if old_type == 'assignment':
                continue
            
            # Wszystko inne zamień na 'material'
            if old_type != 'material':
                sections[i]['type'] = 'material'
                sections_updated_in_course += 1
                print(f"  Kurs {course_id}, Sekcja '{section.get('name', 'Bez nazwy')}': {old_type or 'None'} -> material")
        
        # Jeśli były zmiany, zaktualizuj dokument
        if sections_updated_in_course > 0:
            courses_ref.document(course_id).update({
                'sections': sections
            })
            updated_courses += 1
            total_sections_updated += sections_updated_in_course
            print(f"✓ Zaktualizowano kurs {course_id} ({sections_updated_in_course} sekcji)")
            print("-" * 50)
    
    print("\nPodsumowanie migracji:")
    print(f"Przeskanowane kursy: {total_courses}")
    print(f"Zaktualizowane kursy: {updated_courses}")
    print(f"Zaktualizowane sekcje: {total_sections_updated}")
    print("\n✓ Migracja zakończona!")

if __name__ == "__main__":
    try:
        migrate_section_types()
    except Exception as e:
        print(f"\n✗ Błąd podczas migracji: {str(e)}")
        import traceback
        traceback.print_exc()

