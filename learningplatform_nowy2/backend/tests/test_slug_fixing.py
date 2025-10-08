#!/usr/bin/env python
import unittest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import funkcji do testowania
from fix_firebase_slugs import fix_firebase_duplicate_slugs, generate_slug, slug_exists_in_firebase

class TestSlugFixing(unittest.TestCase):
    """Testy dla skryptu naprawy duplikatów slug"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
    
    def test_generate_slug_basic(self):
        """Test podstawowego generowania slug"""
        result = generate_slug("Matematyka")
        self.assertEqual(result, "matematyka")
    
    def test_generate_slug_with_special_chars(self):
        """Test generowania slug z znakami specjalnymi"""
        result = generate_slug("Język Polski - Poziom A1")
        self.assertEqual(result, "jzyk-polski---poziom-a1")
    
    def test_generate_slug_empty_title(self):
        """Test generowania slug z pustym tytułem"""
        result = generate_slug("")
        self.assertEqual(result, "")
    
    def test_slug_exists_in_firebase_true(self):
        """Test sprawdzania istniejącego slug w Firebase"""
        # Mock: slug istnieje
        mock_doc = Mock()
        self.mock_query.get.return_value = [mock_doc]
        
        result = slug_exists_in_firebase(self.mock_db, "matematyka")
        
        self.assertTrue(result)
        self.mock_db.collection.assert_called_with('courses')
        self.mock_collection.where.assert_called_with('slug', '==', 'matematyka')
    
    def test_slug_exists_in_firebase_false(self):
        """Test sprawdzania nieistniejącego slug w Firebase"""
        # Mock: slug nie istnieje
        self.mock_query.get.return_value = []
        
        result = slug_exists_in_firebase(self.mock_db, "nieistniejacy-slug")
        
        self.assertFalse(result)
    
    def test_slug_exists_in_firebase_error(self):
        """Test obsługi błędu podczas sprawdzania slug"""
        # Mock: błąd bazy danych
        self.mock_query.get.side_effect = Exception("Database error")
        
        result = slug_exists_in_firebase(self.mock_db, "test")
        
        self.assertFalse(result)
    
    @patch('fix_firebase_slugs.firebase_admin')
    @patch('fix_firebase_slugs.firestore')
    def test_fix_firebase_duplicate_slugs_no_duplicates(self, mock_firestore, mock_firebase_admin):
        """Test naprawy gdy nie ma duplikatów"""
        # Mock Firebase
        mock_db = Mock()
        mock_firestore.client.return_value = mock_db
        
        # Mock kursy bez duplikatów
        mock_course1 = Mock()
        mock_course1.id = "course1"
        mock_course1.to_dict.return_value = {
            'title': 'Matematyka',
            'slug': 'matematyka'
        }
        
        mock_course2 = Mock()
        mock_course2.id = "course2"
        mock_course2.to_dict.return_value = {
            'title': 'Fizyka',
            'slug': 'fizyka'
        }
        
        mock_collection = Mock()
        mock_collection.get.return_value = [mock_course1, mock_course2]
        mock_db.collection.return_value = mock_collection
        
        # Mock firebase_admin._apps
        mock_firebase_admin._apps = []
        mock_cred = Mock()
        mock_firebase_admin.credentials.Certificate.return_value = mock_cred
        mock_firebase_admin.initialize_app.return_value = None
        
        result = fix_firebase_duplicate_slugs()
        
        self.assertTrue(result)
    
    @patch('fix_firebase_slugs.firebase_admin')
    @patch('fix_firebase_slugs.firestore')
    def test_fix_firebase_duplicate_slugs_with_duplicates(self, mock_firestore, mock_firebase_admin):
        """Test naprawy gdy są duplikaty"""
        # Mock Firebase
        mock_db = Mock()
        mock_firestore.client.return_value = mock_db
        
        # Mock kursy z duplikatami
        mock_course1 = Mock()
        mock_course1.id = "course1"
        mock_course1.to_dict.return_value = {
            'title': 'Matematyka',
            'slug': 'matematyka'
        }
        
        mock_course2 = Mock()
        mock_course2.id = "course2"
        mock_course2.to_dict.return_value = {
            'title': 'Matematyka 2',
            'slug': 'matematyka'  # Duplikat!
        }
        
        mock_course3 = Mock()
        mock_course3.id = "course3"
        mock_course3.to_dict.return_value = {
            'title': 'Kurs bez slug'
            # Brak slug
        }
        
        mock_collection = Mock()
        mock_collection.get.return_value = [mock_course1, mock_course2, mock_course3]
        mock_db.collection.return_value = mock_collection
        
        # Mock firebase_admin._apps
        mock_firebase_admin._apps = []
        mock_cred = Mock()
        mock_firebase_admin.credentials.Certificate.return_value = mock_cred
        mock_firebase_admin.initialize_app.return_value = None
        
        result = fix_firebase_duplicate_slugs()
        
        self.assertTrue(result)
    
    @patch('fix_firebase_slugs.firebase_admin')
    @patch('fix_firebase_slugs.firestore')
    def test_fix_firebase_duplicate_slugs_firebase_error(self, mock_firestore, mock_firebase_admin):
        """Test obsługi błędu Firebase"""
        # Mock błąd Firebase
        mock_firestore.client.side_effect = Exception("Firebase connection error")
        
        # Mock firebase_admin._apps
        mock_firebase_admin._apps = []
        mock_cred = Mock()
        mock_firebase_admin.credentials.Certificate.return_value = mock_cred
        mock_firebase_admin.initialize_app.return_value = None
        
        result = fix_firebase_duplicate_slugs()
        
        self.assertFalse(result)


class TestSlugFixingLogic(unittest.TestCase):
    """Testy logiki naprawy slug"""
    
    def test_fix_courses_without_slug(self):
        """Test naprawy kursów bez slug"""
        courses_without_slug = [
            ("course1", "Matematyka"),
            ("course2", "Fizyka"),
            ("course3", "Chemia"),
        ]
        
        # Symulacja logiki naprawy
        fixed_courses = []
        existing_slugs = set()
        
        for course_id, title in courses_without_slug:
            base_slug = generate_slug(title)
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while unique_slug in existing_slugs:
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            existing_slugs.add(unique_slug)
            fixed_courses.append((course_id, title, unique_slug))
        
        # Sprawdź wyniki
        self.assertEqual(len(fixed_courses), 3)
        self.assertEqual(fixed_courses[0][2], "matematyka")
        self.assertEqual(fixed_courses[1][2], "fizyka")
        self.assertEqual(fixed_courses[2][2], "chemia")
        
        # Sprawdź unikalność
        slugs = [course[2] for course in fixed_courses]
        self.assertEqual(len(set(slugs)), len(slugs))
    
    def test_fix_duplicate_slugs(self):
        """Test naprawy duplikatów slug"""
        duplicate_groups = {
            'matematyka': [
                ("course1", "Matematyka"),
                ("course2", "Matematyka 2"),
                ("course3", "Matematyka 3"),
            ]
        }
        
        # Symulacja logiki naprawy duplikatów
        fixed_courses = []
        existing_slugs = set()
        
        for slug, course_list in duplicate_groups.items():
            # Pierwszy kurs zachowuje oryginalny slug
            first_course_id, first_course_title = course_list[0]
            existing_slugs.add(slug)
            fixed_courses.append((first_course_id, first_course_title, slug))
            
            # Pozostałe kursy dostają unikalne slug
            for course_id, course_title in course_list[1:]:
                base_slug = generate_slug(course_title)
                if not base_slug:
                    base_slug = f"course-{course_id[:8]}"
                
                # Dodaj unikalny identyfikator
                import uuid
                unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
                while unique_slug in existing_slugs:
                    unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
                
                existing_slugs.add(unique_slug)
                fixed_courses.append((course_id, course_title, unique_slug))
        
        # Sprawdź wyniki
        self.assertEqual(len(fixed_courses), 3)
        
        # Pierwszy kurs zachowuje oryginalny slug
        self.assertEqual(fixed_courses[0][2], "matematyka")
        
        # Pozostałe kursy mają unikalne slug
        self.assertNotEqual(fixed_courses[1][2], "matematyka")
        self.assertNotEqual(fixed_courses[2][2], "matematyka")
        
        # Sprawdź unikalność
        slugs = [course[2] for course in fixed_courses]
        self.assertEqual(len(set(slugs)), len(slugs))
    
    def test_fix_empty_title_courses(self):
        """Test naprawy kursów z pustymi tytułami"""
        courses_without_slug = [
            ("course1", ""),
            ("course2", None),
            ("course3", "   "),
        ]
        
        # Symulacja logiki naprawy
        fixed_courses = []
        existing_slugs = set()
        
        for course_id, title in courses_without_slug:
            base_slug = generate_slug(title or "")
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while unique_slug in existing_slugs:
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            existing_slugs.add(unique_slug)
            fixed_courses.append((course_id, title, unique_slug))
        
        # Sprawdź wyniki
        self.assertEqual(len(fixed_courses), 3)
        
        # Wszystkie slugi powinny zaczynać się od "course-"
        for course_id, title, slug in fixed_courses:
            self.assertTrue(slug.startswith("course-"))
        
        # Sprawdź unikalność
        slugs = [course[2] for course in fixed_courses]
        self.assertEqual(len(set(slugs)), len(slugs))
    
    def test_fix_special_characters_in_title(self):
        """Test naprawy kursów ze znakami specjalnymi w tytule"""
        courses_without_slug = [
            ("course1", "Matematyka!"),
            ("course2", "Fizyka@#$"),
            ("course3", "Chemia & Biologia"),
        ]
        
        # Symulacja logiki naprawy
        fixed_courses = []
        existing_slugs = set()
        
        for course_id, title in courses_without_slug:
            base_slug = generate_slug(title)
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while unique_slug in existing_slugs:
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            existing_slugs.add(unique_slug)
            fixed_courses.append((course_id, title, unique_slug))
        
        # Sprawdź wyniki
        self.assertEqual(len(fixed_courses), 3)
        
        # Sprawdź czy slugi nie zawierają znaków specjalnych
        for course_id, title, slug in fixed_courses:
            self.assertTrue(self.is_valid_slug(slug), f"Slug '{slug}' zawiera nieprawidłowe znaki")
        
        # Sprawdź unikalność
        slugs = [course[2] for course in fixed_courses]
        self.assertEqual(len(set(slugs)), len(slugs))
    
    def is_valid_slug(self, slug):
        """Sprawdza czy slug ma poprawny format"""
        import re
        return bool(re.match(r'^[a-z0-9-]+$', slug))


class TestSlugFixingPerformance(unittest.TestCase):
    """Testy wydajności naprawy slug"""
    
    def test_fix_large_number_of_courses(self):
        """Test naprawy dużej liczby kursów"""
        import time
        
        # Generuj dużo kursów
        courses = []
        for i in range(1000):
            courses.append((f"course{i}", f"Kurs {i}"))
        
        start_time = time.time()
        
        # Symulacja logiki naprawy
        fixed_courses = []
        existing_slugs = set()
        
        for course_id, title in courses:
            base_slug = generate_slug(title)
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while unique_slug in existing_slugs:
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            existing_slugs.add(unique_slug)
            fixed_courses.append((course_id, title, unique_slug))
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wyniki
        self.assertEqual(len(fixed_courses), 1000)
        
        # Sprawdź unikalność
        slugs = [course[2] for course in fixed_courses]
        self.assertEqual(len(set(slugs)), len(slugs))
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 5.0, 
                       f"Naprawa 1000 kursów trwała {execution_time:.2f}s, co jest za długo")
    
    def test_memory_usage_during_fixing(self):
        """Test użycia pamięci podczas naprawy"""
        try:
            import psutil
        except ImportError:
            self.skipTest("psutil nie jest dostępny")
        
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Generuj dużo kursów
        courses = []
        for i in range(1000):
            courses.append((f"course{i}", f"Kurs {i}"))
        
        # Symulacja logiki naprawy
        fixed_courses = []
        existing_slugs = set()
        
        for course_id, title in courses:
            base_slug = generate_slug(title)
            if not base_slug:
                base_slug = f"course-{course_id[:8]}"
            
            # Sprawdź czy slug już istnieje
            unique_slug = base_slug
            counter = 1
            while unique_slug in existing_slugs:
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            existing_slugs.add(unique_slug)
            fixed_courses.append((course_id, title, unique_slug))
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Zwiększenie pamięci nie powinno przekraczać 50MB
        self.assertLess(memory_increase, 50 * 1024 * 1024, 
                       f"Zwiększenie pamięci: {memory_increase / 1024 / 1024:.2f}MB")


if __name__ == '__main__':
    # Uruchom testy
    unittest.main(verbosity=2)
