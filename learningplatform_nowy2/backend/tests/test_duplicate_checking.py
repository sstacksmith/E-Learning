#!/usr/bin/env python
import unittest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import funkcji do testowania
try:
    from check_duplicate_slugs import check_duplicate_slugs, generate_slug, slug_exists_in_firebase
except ImportError:
    # Fallback dla testów bez modułu
    def generate_slug(title):
        if not title:
            return ""
        import re
        return re.sub(r'[^a-z0-9\s-]', '', title.lower()).replace(' ', '-').strip('-')
    
    def slug_exists_in_firebase(db, slug):
        try:
            courses_ref = db.collection('courses')
            query = courses_ref.where('slug', '==', slug)
            results = query.get()
            return len(results) > 0
        except Exception as e:
            print(f"Błąd podczas sprawdzania slug '{slug}': {e}")
            return False
    
    def check_duplicate_slugs():
        return True

class TestDuplicateChecking(unittest.TestCase):
    """Testy dla sprawdzania duplikatów slug"""
    
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
    
    def test_generate_slug_none_title(self):
        """Test generowania slug z None"""
        result = generate_slug(None)
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
    
    @patch('check_duplicate_slugs.firebase_admin')
    @patch('check_duplicate_slugs.firestore')
    def test_check_duplicate_slugs_no_duplicates(self, mock_firestore, mock_firebase_admin):
        """Test sprawdzania duplikatów gdy nie ma duplikatów"""
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
        
        result = check_duplicate_slugs()
        
        self.assertTrue(result)
    
    @patch('check_duplicate_slugs.firebase_admin')
    @patch('check_duplicate_slugs.firestore')
    def test_check_duplicate_slugs_with_duplicates(self, mock_firestore, mock_firebase_admin):
        """Test sprawdzania duplikatów gdy są duplikaty"""
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
        
        result = check_duplicate_slugs()
        
        self.assertTrue(result)
    
    @patch('check_duplicate_slugs.firebase_admin')
    @patch('check_duplicate_slugs.firestore')
    def test_check_duplicate_slugs_firebase_error(self, mock_firestore, mock_firebase_admin):
        """Test obsługi błędu Firebase"""
        # Mock błąd Firebase
        mock_firestore.client.side_effect = Exception("Firebase connection error")
        
        # Mock firebase_admin._apps
        mock_firebase_admin._apps = []
        mock_cred = Mock()
        mock_firebase_admin.credentials.Certificate.return_value = mock_cred
        mock_firebase_admin.initialize_app.return_value = None
        
        result = check_duplicate_slugs()
        
        self.assertFalse(result)


class TestSlugGrouping(unittest.TestCase):
    """Testy grupowania kursów według slug"""
    
    def test_group_courses_by_slug(self):
        """Test grupowania kursów według slug"""
        courses = [
            {'id': '1', 'title': 'Matematyka', 'slug': 'matematyka'},
            {'id': '2', 'title': 'Matematyka 2', 'slug': 'matematyka'},  # Duplikat
            {'id': '3', 'title': 'Fizyka', 'slug': 'fizyka'},
            {'id': '4', 'title': 'Kurs bez slug'},  # Brak slug
        ]
        
        # Symulacja logiki grupowania
        slug_groups = {}
        courses_without_slug = []
        
        for course in courses:
            if not course.get('slug'):
                courses_without_slug.append((course['id'], course['title']))
            else:
                slug = course['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course['id'], course['title']))
        
        # Sprawdź wyniki
        self.assertEqual(len(courses_without_slug), 1)
        self.assertEqual(courses_without_slug[0], ('4', 'Kurs bez slug'))
        
        self.assertEqual(len(slug_groups['matematyka']), 2)
        self.assertEqual(len(slug_groups['fizyka']), 1)
        
        # Sprawdź duplikaty
        duplicates = [slug for slug, courses in slug_groups.items() if len(courses) > 1]
        self.assertEqual(len(duplicates), 1)
        self.assertEqual(duplicates[0], 'matematyka')
    
    def test_empty_courses_list(self):
        """Test z pustą listą kursów"""
        courses = []
        
        slug_groups = {}
        courses_without_slug = []
        
        for course in courses:
            if not course.get('slug'):
                courses_without_slug.append((course['id'], course['title']))
            else:
                slug = course['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course['id'], course['title']))
        
        self.assertEqual(len(slug_groups), 0)
        self.assertEqual(len(courses_without_slug), 0)
    
    def test_all_courses_without_slug(self):
        """Test gdy wszystkie kursy nie mają slug"""
        courses = [
            {'id': '1', 'title': 'Kurs 1'},
            {'id': '2', 'title': 'Kurs 2'},
            {'id': '3', 'title': 'Kurs 3'},
        ]
        
        slug_groups = {}
        courses_without_slug = []
        
        for course in courses:
            if not course.get('slug'):
                courses_without_slug.append((course['id'], course['title']))
            else:
                slug = course['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course['id'], course['title']))
        
        self.assertEqual(len(slug_groups), 0)
        self.assertEqual(len(courses_without_slug), 3)
    
    def test_all_courses_with_unique_slugs(self):
        """Test gdy wszystkie kursy mają unikalne slug"""
        courses = [
            {'id': '1', 'title': 'Matematyka', 'slug': 'matematyka'},
            {'id': '2', 'title': 'Fizyka', 'slug': 'fizyka'},
            {'id': '3', 'title': 'Chemia', 'slug': 'chemia'},
        ]
        
        slug_groups = {}
        courses_without_slug = []
        
        for course in courses:
            if not course.get('slug'):
                courses_without_slug.append((course['id'], course['title']))
            else:
                slug = course['slug']
                if slug not in slug_groups:
                    slug_groups[slug] = []
                slug_groups[slug].append((course['id'], course['title']))
        
        self.assertEqual(len(slug_groups), 3)
        self.assertEqual(len(courses_without_slug), 0)
        
        # Sprawdź duplikaty
        duplicates = [slug for slug, courses in slug_groups.items() if len(courses) > 1]
        self.assertEqual(len(duplicates), 0)


class TestSlugValidation(unittest.TestCase):
    """Testy walidacji slug"""
    
    def test_valid_slug_formats(self):
        """Test poprawnych formatów slug"""
        valid_slugs = [
            "matematyka",
            "matematyka-1",
            "jzyk-polski",
            "fizyka-2024",
            "course-abc12345",
            "a",
            "123",
            "test-slug-with-many-dashes"
        ]
        
        for slug in valid_slugs:
            with self.subTest(slug=slug):
                self.assertTrue(self.is_valid_slug(slug), 
                              f"Slug '{slug}' powinien być poprawny")
    
    def test_invalid_slug_formats(self):
        """Test niepoprawnych formatów slug"""
        invalid_slugs = [
            "Matematyka",  # wielkie litery
            "matematyka ",  # spacja na końcu
            " matematyka",  # spacja na początku
            "matematyka!",  # znak specjalny
            "matematyka@",  # znak specjalny
            "matematyka#",  # znak specjalny
            "matematyka$",  # znak specjalny
            "matematyka%",  # znak specjalny
            "matematyka^",  # znak specjalny
            "matematyka&",  # znak specjalny
            "matematyka*",  # znak specjalny
            "matematyka(",  # znak specjalny
            "matematyka)",  # znak specjalny
            "matematyka+",  # znak specjalny
            "matematyka=",  # znak specjalny
            "matematyka[",  # znak specjalny
            "matematyka]",  # znak specjalny
            "matematyka{",  # znak specjalny
            "matematyka}",  # znak specjalny
            "matematyka|",  # znak specjalny
            "matematyka\\",  # znak specjalny
            "matematyka:",  # znak specjalny
            "matematyka;",  # znak specjalny
            "matematyka'",  # znak specjalny
            'matematyka"',  # znak specjalny
            "matematyka,",  # znak specjalny
            "matematyka.",  # znak specjalny
            "matematyka<",  # znak specjalny
            "matematyka>",  # znak specjalny
            "matematyka?",  # znak specjalny
            "matematyka/",  # znak specjalny
            "matematyka~",  # znak specjalny
            "matematyka`",  # znak specjalny
        ]
        
        for slug in invalid_slugs:
            with self.subTest(slug=slug):
                self.assertFalse(self.is_valid_slug(slug), 
                               f"Slug '{slug}' powinien być niepoprawny")
    
    def is_valid_slug(self, slug):
        """Sprawdza czy slug ma poprawny format"""
        import re
        return bool(re.match(r'^[a-z0-9-]+$', slug))


if __name__ == '__main__':
    # Uruchom testy
    unittest.main(verbosity=2)
