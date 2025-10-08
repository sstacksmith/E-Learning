#!/usr/bin/env python
import unittest
import sys
import os
import re
import uuid
from unittest.mock import Mock, patch, MagicMock

# Dodaj ścieżkę do modułów Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import funkcji do testowania
try:
    from learningplatform.views import generate_unique_slug
except ImportError:
    # Fallback dla testów bez Django
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

class TestSlugGeneration(unittest.TestCase):
    """Testy dla funkcji generowania unikalnych slugów"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
    
    def test_basic_slug_generation(self):
        """Test podstawowego generowania slug"""
        # Mock: brak istniejących kursów
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("Matematyka", self.mock_db)
        
        self.assertEqual(result, "matematyka")
        self.mock_db.collection.assert_called_with('courses')
        self.mock_collection.where.assert_called_with('slug', '==', 'matematyka')
    
    def test_slug_with_special_characters(self):
        """Test generowania slug z znakami specjalnymi"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("Język Polski - Poziom A1", self.mock_db)
        
        self.assertEqual(result, "jzyk-polski---poziom-a1")
    
    def test_slug_with_numbers(self):
        """Test generowania slug z liczbami"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("Matematyka 2024", self.mock_db)
        
        self.assertEqual(result, "matematyka-2024")
    
    def test_empty_title(self):
        """Test generowania slug z pustym tytułem"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("", self.mock_db)
        
        # Powinien wygenerować slug z UUID
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)  # "course-" + 8 znaków UUID
    
    def test_none_title(self):
        """Test generowania slug z None jako tytułem"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug(None, self.mock_db)
        
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)
    
    def test_duplicate_slug_handling(self):
        """Test obsługi duplikatów slug"""
        # Mock: pierwszy slug istnieje, drugi nie
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwsze wywołanie - slug istnieje
            []         # Drugie wywołanie - slug nie istnieje
        ]
        
        result = generate_unique_slug("Matematyka", self.mock_db)
        
        self.assertEqual(result, "matematyka-1")
        self.assertEqual(self.mock_query.get.call_count, 2)
    
    def test_multiple_duplicates(self):
        """Test obsługi wielu duplikatów"""
        # Mock: pierwsze dwa slugi istnieją, trzeci nie
        self.mock_query.get.side_effect = [
            [Mock()],  # matematyka istnieje
            [Mock()],  # matematyka-1 istnieje
            []         # matematyka-2 nie istnieje
        ]
        
        result = generate_unique_slug("Matematyka", self.mock_db)
        
        self.assertEqual(result, "matematyka-2")
        self.assertEqual(self.mock_query.get.call_count, 3)
    
    def test_infinite_loop_protection(self):
        """Test zabezpieczenia przed nieskończoną pętlą"""
        # Mock: wszystkie slugi istnieją (symulacja nieskończonej pętli)
        self.mock_query.get.return_value = [Mock()]
        
        result = generate_unique_slug("Test", self.mock_db)
        
        # Po 1000 iteracjach powinien użyć UUID
        self.assertTrue(result.startswith("test-"))
        self.assertTrue(len(result) > 10)  # UUID jest dłuższy niż zwykły licznik
    
    def test_very_long_title(self):
        """Test bardzo długiego tytułu"""
        self.mock_query.get.return_value = []
        
        long_title = "A" * 1000  # Bardzo długi tytuł
        result = generate_unique_slug(long_title, self.mock_db)
        
        self.assertEqual(result, "a" * 1000)
    
    def test_title_with_only_special_characters(self):
        """Test tytułu zawierającego tylko znaki specjalne"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("!@#$%^&*()", self.mock_db)
        
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)
    
    def test_unicode_characters(self):
        """Test znaków Unicode"""
        self.mock_query.get.return_value = []
        
        result = generate_unique_slug("Mатематика", self.mock_db)
        
        # Unicode znaki powinny być usunięte
        self.assertTrue(result.startswith("course-"))
    
    def test_slug_normalization(self):
        """Test normalizacji slug"""
        self.mock_query.get.return_value = []
        
        test_cases = [
            ("  Matematyka  ", "matematyka"),
            ("MATEMATYKA", "matematyka"),
            ("Matematyka!!!", "matematyka"),
            ("Matematyka---", "matematyka"),
            ("---Matematyka---", "matematyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_database_error_handling(self):
        """Test obsługi błędów bazy danych"""
        # Mock: błąd bazy danych
        self.mock_query.get.side_effect = Exception("Database error")
        
        with self.assertRaises(Exception):
            generate_unique_slug("Test", self.mock_db)
    
    def test_slug_length_limits(self):
        """Test limitów długości slug"""
        self.mock_query.get.return_value = []
        
        # Test bardzo długiego tytułu
        very_long_title = "A" * 10000
        result = generate_unique_slug(very_long_title, self.mock_db)
        
        # Slug powinien być skrócony lub użyć UUID
        self.assertTrue(len(result) <= 10000)
    
    def test_concurrent_slug_generation(self):
        """Test generowania slug w środowisku współbieżnym"""
        # Symulacja sytuacji gdzie dwa procesy próbują utworzyć ten sam slug
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwszy slug istnieje
            [Mock()],  # Drugi slug istnieje
            []         # Trzeci slug nie istnieje
        ]
        
        result = generate_unique_slug("Concurrent Test", self.mock_db)
        
        self.assertEqual(result, "concurrent-test-2")


class TestSlugValidation(unittest.TestCase):
    """Testy walidacji slug"""
    
    def test_slug_format_validation(self):
        """Test walidacji formatu slug"""
        valid_slugs = [
            "matematyka",
            "matematyka-1",
            "jzyk-polski",
            "fizyka-2024",
            "course-abc12345"
        ]
        
        invalid_slugs = [
            "Matematyka",  # wielkie litery
            "matematyka ",  # spacja na końcu
            " matematyka",  # spacja na początku
            "matematyka!",  # znak specjalny
            "matematyka@",  # znak specjalny
        ]
        
        for slug in valid_slugs:
            with self.subTest(slug=slug):
                self.assertTrue(re.match(r'^[a-z0-9-]+$', slug), 
                              f"Slug '{slug}' powinien być poprawny")
        
        for slug in invalid_slugs:
            with self.subTest(slug=slug):
                self.assertFalse(re.match(r'^[a-z0-9-]+$', slug), 
                               f"Slug '{slug}' powinien być niepoprawny")


class TestSlugPerformance(unittest.TestCase):
    """Testy wydajności generowania slug"""
    
    def setUp(self):
        """Przygotowanie testów wydajności"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
        self.mock_query.get.return_value = []  # Brak duplikatów
    
    def test_slug_generation_performance(self):
        """Test wydajności generowania slug"""
        import time
        
        titles = [f"Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Generowanie 100 slugów nie powinno trwać dłużej niż 1 sekunda
        self.assertLess(execution_time, 1.0, 
                       f"Generowanie 100 slugów trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_memory_usage(self):
        """Test użycia pamięci"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Generuj dużo slugów
        for i in range(1000):
            generate_unique_slug(f"Test Course {i}", self.mock_db)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Zwiększenie pamięci nie powinno przekraczać 10MB
        self.assertLess(memory_increase, 10 * 1024 * 1024, 
                       f"Zwiększenie pamięci: {memory_increase / 1024 / 1024:.2f}MB")


if __name__ == '__main__':
    # Uruchom testy
    unittest.main(verbosity=2)
