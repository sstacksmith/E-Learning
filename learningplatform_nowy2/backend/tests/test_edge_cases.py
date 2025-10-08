#!/usr/bin/env python
import unittest
import sys
import os
import re
import uuid
from unittest.mock import Mock, patch

# Dodaj ścieżkę do modułów
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

class TestEdgeCases(unittest.TestCase):
    """Testy przypadków brzegowych dla generowania slug"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
        self.mock_query.get.return_value = []  # Domyślnie brak duplikatów
    
    def test_empty_string_title(self):
        """Test pustego stringa jako tytułu"""
        result = generate_unique_slug("", self.mock_db)
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)  # "course-" + 8 znaków UUID
    
    def test_none_title(self):
        """Test None jako tytułu"""
        result = generate_unique_slug(None, self.mock_db)
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)
    
    def test_whitespace_only_title(self):
        """Test tytułu zawierającego tylko białe znaki"""
        test_cases = [
            "   ",
            "\t\t\t",
            "\n\n\n",
            "\r\r\r",
            " \t\n\r ",
        ]
        
        for title in test_cases:
            with self.subTest(title=repr(title)):
                result = generate_unique_slug(title, self.mock_db)
                self.assertTrue(result.startswith("course-"))
                self.assertEqual(len(result), 15)
    
    def test_title_with_only_special_characters(self):
        """Test tytułu zawierającego tylko znaki specjalne"""
        test_cases = [
            "!@#$%^&*()",
            "[]{}|\\:;\"'<>?,./",
            "~`",
            "!@#$%^&*()_+-=[]{}|\\:;\"'<>?,./~`",
        ]
        
        for title in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertTrue(result.startswith("course-"))
                self.assertEqual(len(result), 15)
    
    def test_title_with_mixed_characters(self):
        """Test tytułu z mieszanymi znakami"""
        test_cases = [
            ("Matematyka!", "matematyka"),
            ("Fizyka@#$", "fizyka"),
            ("Chemia & Biologia", "chemia---biologia"),
            ("Język Polski - Poziom A1", "jzyk-polski---poziom-a1"),
            ("Kurs 2024/2025", "kurs-20242025"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_very_long_title(self):
        """Test bardzo długiego tytułu"""
        # Tytuł o długości 10000 znaków
        long_title = "A" * 10000
        result = generate_unique_slug(long_title, self.mock_db)
        
        self.assertEqual(result, "a" * 10000)
        self.assertEqual(len(result), 10000)
    
    def test_title_with_unicode_characters(self):
        """Test tytułu z znakami Unicode"""
        test_cases = [
            ("Mатематика", "course-"),  # Cyrillic
            ("数学", "course-"),  # Chinese
            ("العربية", "course-"),  # Arabic
            ("עברית", "course-"),  # Hebrew
            ("日本語", "course-"),  # Japanese
            ("한국어", "course-"),  # Korean
        ]
        
        for title, expected_prefix in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertTrue(result.startswith(expected_prefix))
    
    def test_title_with_numbers_only(self):
        """Test tytułu zawierającego tylko liczby"""
        test_cases = [
            "123",
            "2024",
            "1234567890",
        ]
        
        for title in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, title)
    
    def test_title_with_mixed_case(self):
        """Test tytułu z mieszanymi wielkościami liter"""
        test_cases = [
            ("MATEMATYKA", "matematyka"),
            ("Matematyka", "matematyka"),
            ("mAtEmAtYkA", "matematyka"),
            ("MaTeMaTyKa", "matematyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_multiple_spaces(self):
        """Test tytułu z wieloma spacjami"""
        test_cases = [
            ("Matematyka   Fizyka", "matematyka---fizyka"),
            ("  Matematyka  Fizyka  ", "matematyka--fizyka"),
            ("Matematyka\t\tFizyka", "matematyka--fizyka"),
            ("Matematyka\n\nFizyka", "matematyka--fizyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_multiple_dashes(self):
        """Test tytułu z wieloma myślnikami"""
        test_cases = [
            ("Matematyka---Fizyka", "matematyka---fizyka"),
            ("---Matematyka---", "matematyka"),
            ("Matematyka-----Fizyka", "matematyka-----fizyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_leading_trailing_dashes(self):
        """Test tytułu z myślnikami na początku i końcu"""
        test_cases = [
            ("-Matematyka-", "matematyka"),
            ("--Matematyka--", "matematyka"),
            ("---Matematyka---", "matematyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_leading_trailing_spaces(self):
        """Test tytułu ze spacjami na początku i końcu"""
        test_cases = [
            (" Matematyka ", "matematyka"),
            ("  Matematyka  ", "matematyka"),
            ("   Matematyka   ", "matematyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_mixed_whitespace(self):
        """Test tytułu z mieszanymi białymi znakami"""
        test_cases = [
            ("Matematyka\tFizyka", "matematyka-fizyka"),
            ("Matematyka\nFizyka", "matematyka-fizyka"),
            ("Matematyka\rFizyka", "matematyka-fizyka"),
            ("Matematyka \t\n\r Fizyka", "matematyka----fizyka"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_special_unicode_spaces(self):
        """Test tytułu ze specjalnymi spacjami Unicode"""
        test_cases = [
            ("Matematyka\u00A0Fizyka", "matematyka-fizyka"),  # Non-breaking space
            ("Matematyka\u2000Fizyka", "matematyka-fizyka"),  # En quad
            ("Matematyka\u2001Fizyka", "matematyka-fizyka"),  # Em quad
            ("Matematyka\u2002Fizyka", "matematyka-fizyka"),  # En space
            ("Matematyka\u2003Fizyka", "matematyka-fizyka"),  # Em space
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_control_characters(self):
        """Test tytułu z znakami kontrolnymi"""
        test_cases = [
            ("Matematyka\x00Fizyka", "matematyka-fizyka"),  # Null character
            ("Matematyka\x01Fizyka", "matematyka-fizyka"),  # Start of heading
            ("Matematyka\x02Fizyka", "matematyka-fizyka"),  # Start of text
            ("Matematyka\x03Fizyka", "matematyka-fizyka"),  # End of text
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_emoji(self):
        """Test tytułu z emoji"""
        test_cases = [
            ("Matematyka 😊", "matematyka-"),
            ("Fizyka 🚀", "fizyka-"),
            ("Chemia 🧪", "chemia-"),
            ("Biologia 🌱", "biologia-"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_html_tags(self):
        """Test tytułu z tagami HTML"""
        test_cases = [
            ("<b>Matematyka</b>", "matematyka"),
            ("<i>Fizyka</i>", "fizyka"),
            ("<u>Chemia</u>", "chemia"),
            ("<script>alert('test')</script>", "scriptalerttestscript"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_sql_injection_attempt(self):
        """Test tytułu z próbą SQL injection"""
        test_cases = [
            ("'; DROP TABLE courses; --", "drop-table-courses--"),
            ("' OR '1'='1", "or-11"),
            ("UNION SELECT * FROM users", "union-select-from-users"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_xss_attempt(self):
        """Test tytułu z próbą XSS"""
        test_cases = [
            ("<script>alert('XSS')</script>", "scriptalertxssscript"),
            ("<img src=x onerror=alert('XSS')>", "img-srcx-onerroralertxss"),
            ("javascript:alert('XSS')", "javascriptalertxss"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_path_traversal_attempt(self):
        """Test tytułu z próbą path traversal"""
        test_cases = [
            ("../../../etc/passwd", "etcpasswd"),
            ("..\\..\\..\\windows\\system32", "windowssystem32"),
            ("/etc/passwd", "etcpasswd"),
            ("C:\\Windows\\System32", "cwindowssystem32"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_very_long_single_word(self):
        """Test tytułu z bardzo długim pojedynczym słowem"""
        long_word = "A" * 1000
        result = generate_unique_slug(long_word, self.mock_db)
        
        self.assertEqual(result, "a" * 1000)
        self.assertEqual(len(result), 1000)
    
    def test_title_with_mixed_scripts(self):
        """Test tytułu z mieszanymi skryptami"""
        test_cases = [
            ("Matematyka 数学", "matematyka-"),
            ("Fizyka العربية", "fizyka-"),
            ("Chemia עברית", "chemia-"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_currency_symbols(self):
        """Test tytułu z symbolami walut"""
        test_cases = [
            ("Kurs $100", "kurs-100"),
            ("Kurs €50", "kurs-50"),
            ("Kurs £25", "kurs-25"),
            ("Kurs ¥1000", "kurs-1000"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)
    
    def test_title_with_mathematical_symbols(self):
        """Test tytułu z symbolami matematycznymi"""
        test_cases = [
            ("Matematyka + Fizyka", "matematyka---fizyka"),
            ("Algebra × Geometria", "algebra---geometria"),
            ("Kalkulus ÷ Analiza", "kalkulus---analiza"),
            ("Statystyka ≠ Prawdopodobieństwo", "statystyka---prawdopodobiestwo"),
        ]
        
        for title, expected in test_cases:
            with self.subTest(title=title):
                result = generate_unique_slug(title, self.mock_db)
                self.assertEqual(result, expected)


class TestEdgeCasesWithDuplicates(unittest.TestCase):
    """Testy przypadków brzegowych z duplikatami"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
    
    def test_empty_title_with_duplicates(self):
        """Test pustego tytułu z duplikatami"""
        # Mock: wszystkie slugi istnieją
        self.mock_query.get.return_value = [Mock()]
        
        result = generate_unique_slug("", self.mock_db)
        
        # Po 1000 iteracjach powinien użyć UUID
        self.assertTrue(result.startswith("course-"))
        self.assertTrue(len(result) > 15)  # UUID jest dłuższy niż zwykły licznik
    
    def test_special_characters_with_duplicates(self):
        """Test znaków specjalnych z duplikatami"""
        # Mock: pierwszy slug istnieje, drugi nie
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwsze wywołanie - slug istnieje
            []         # Drugie wywołanie - slug nie istnieje
        ]
        
        result = generate_unique_slug("!@#$%^&*()", self.mock_db)
        
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)
    
    def test_unicode_with_duplicates(self):
        """Test Unicode z duplikatami"""
        # Mock: pierwszy slug istnieje, drugi nie
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwsze wywołanie - slug istnieje
            []         # Drugie wywołanie - slug nie istnieje
        ]
        
        result = generate_unique_slug("Mатематика", self.mock_db)
        
        self.assertTrue(result.startswith("course-"))
        self.assertEqual(len(result), 15)
    
    def test_very_long_title_with_duplicates(self):
        """Test bardzo długiego tytułu z duplikatami"""
        # Mock: pierwszy slug istnieje, drugi nie
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwsze wywołanie - slug istnieje
            []         # Drugie wywołanie - slug nie istnieje
        ]
        
        long_title = "A" * 1000
        result = generate_unique_slug(long_title, self.mock_db)
        
        self.assertEqual(result, "a" * 1000 + "-1")


if __name__ == '__main__':
    # Uruchom testy
    unittest.main(verbosity=2)
