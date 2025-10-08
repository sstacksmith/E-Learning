#!/usr/bin/env python
import unittest
import sys
import os
import time
import threading
from unittest.mock import Mock, patch
from concurrent.futures import ThreadPoolExecutor, as_completed

# Opcjonalny import psutil
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

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

class TestPerformance(unittest.TestCase):
    """Testy wydajności dla generowania slug"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
        self.mock_query.get.return_value = []  # Brak duplikatów
    
    def test_slug_generation_performance_small_batch(self):
        """Test wydajności generowania małej liczby slug"""
        titles = [f"Kurs {i}" for i in range(10)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Generowanie 10 slugów nie powinno trwać dłużej niż 0.1 sekundy
        self.assertLess(execution_time, 0.1, 
                       f"Generowanie 10 slugów trwało {execution_time:.3f}s, "
                       f"co jest za długo")
    
    def test_slug_generation_performance_medium_batch(self):
        """Test wydajności generowania średniej liczby slug"""
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
    
    def test_slug_generation_performance_large_batch(self):
        """Test wydajności generowania dużej liczby slug"""
        titles = [f"Kurs {i}" for i in range(1000)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Generowanie 1000 slugów nie powinno trwać dłużej niż 5 sekund
        self.assertLess(execution_time, 5.0, 
                       f"Generowanie 1000 slugów trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_slug_generation_performance_very_large_batch(self):
        """Test wydajności generowania bardzo dużej liczby slug"""
        titles = [f"Kurs {i}" for i in range(10000)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Generowanie 10000 slugów nie powinno trwać dłużej niż 30 sekund
        self.assertLess(execution_time, 30.0, 
                       f"Generowanie 10000 slugów trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_memory_usage_small_batch(self):
        """Test użycia pamięci dla małej liczby slug"""
        if not PSUTIL_AVAILABLE:
            self.skipTest("psutil nie jest dostępny")
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        titles = [f"Kurs {i}" for i in range(100)]
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Zwiększenie pamięci nie powinno przekraczać 1MB
        self.assertLess(memory_increase, 1 * 1024 * 1024, 
                       f"Zwiększenie pamięci: {memory_increase / 1024:.2f}KB")
    
    def test_memory_usage_large_batch(self):
        """Test użycia pamięci dla dużej liczby slug"""
        if not PSUTIL_AVAILABLE:
            self.skipTest("psutil nie jest dostępny")
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        titles = [f"Kurs {i}" for i in range(1000)]
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Zwiększenie pamięci nie powinno przekraczać 10MB
        self.assertLess(memory_increase, 10 * 1024 * 1024, 
                       f"Zwiększenie pamięci: {memory_increase / 1024 / 1024:.2f}MB")
    
    def test_memory_usage_very_large_batch(self):
        """Test użycia pamięci dla bardzo dużej liczby slug"""
        if not PSUTIL_AVAILABLE:
            self.skipTest("psutil nie jest dostępny")
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        titles = [f"Kurs {i}" for i in range(10000)]
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Zwiększenie pamięci nie powinno przekraczać 50MB
        self.assertLess(memory_increase, 50 * 1024 * 1024, 
                       f"Zwiększenie pamięci: {memory_increase / 1024 / 1024:.2f}MB")
    
    def test_concurrent_slug_generation(self):
        """Test generowania slug w środowisku współbieżnym"""
        def generate_slug_worker(title):
            return generate_unique_slug(title, self.mock_db)
        
        titles = [f"Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(generate_slug_worker, title) for title in titles]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wyniki
        self.assertEqual(len(results), 100)
        
        # Sprawdź unikalność
        unique_results = set(results)
        self.assertEqual(len(unique_results), 100)
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 2.0, 
                       f"Współbieżne generowanie 100 slugów trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_concurrent_slug_generation_with_duplicates(self):
        """Test generowania slug w środowisku współbieżnym z duplikatami"""
        # Mock: pierwszy slug istnieje, drugi nie
        self.mock_query.get.side_effect = [
            [Mock()],  # Pierwsze wywołanie - slug istnieje
            []         # Drugie wywołanie - slug nie istnieje
        ]
        
        def generate_slug_worker(title):
            return generate_unique_slug(title, self.mock_db)
        
        titles = ["Matematyka"] * 50  # Wszystkie tytuły są takie same
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(generate_slug_worker, title) for title in titles]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wyniki
        self.assertEqual(len(results), 50)
        
        # Sprawdź unikalność
        unique_results = set(results)
        self.assertEqual(len(unique_results), 50)
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 5.0, 
                       f"Współbieżne generowanie 50 duplikatów trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_performance_with_database_calls(self):
        """Test wydajności z rzeczywistymi wywołaniami bazy danych"""
        # Mock: symulacja opóźnienia bazy danych
        def mock_get_with_delay(*args, **kwargs):
            time.sleep(0.001)  # 1ms opóźnienie
            return []
        
        self.mock_query.get.side_effect = mock_get_with_delay
        
        titles = [f"Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Z opóźnieniem bazy danych, 100 slugów nie powinno trwać dłużej niż 2 sekundy
        self.assertLess(execution_time, 2.0, 
                       f"Generowanie 100 slugów z opóźnieniem DB trwało {execution_time:.2f}s, "
                       f"co jest za długo")
    
    def test_performance_with_high_duplicate_rate(self):
        """Test wydajności z wysokim wskaźnikiem duplikatów"""
        # Mock: symulacja wysokiego wskaźnika duplikatów
        call_count = 0
        def mock_get_with_duplicates(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 50:  # Pierwsze 50 wywołań zwraca duplikaty
                return [Mock()]
            else:
                return []
        
        self.mock_query.get.side_effect = mock_get_with_duplicates
        
        titles = ["Matematyka"] * 100  # Wszystkie tytuły są takie same
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 10.0, 
                       f"Generowanie 100 slugów z wysokim wskaźnikiem duplikatów "
                       f"trwało {execution_time:.2f}s, co jest za długo")
    
    def test_performance_with_very_long_titles(self):
        """Test wydajności z bardzo długimi tytułami"""
        titles = ["A" * 1000 for _ in range(100)]  # Bardzo długie tytuły
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 2.0, 
                       f"Generowanie 100 slugów z bardzo długimi tytułami "
                       f"trwało {execution_time:.2f}s, co jest za długo")
    
    def test_performance_with_special_characters(self):
        """Test wydajności z znakami specjalnymi"""
        titles = ["!@#$%^&*()" + f" Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 2.0, 
                       f"Generowanie 100 slugów ze znakami specjalnymi "
                       f"trwało {execution_time:.2f}s, co jest za długo")
    
    def test_performance_with_unicode_characters(self):
        """Test wydajności z znakami Unicode"""
        titles = [f"Mатематика {i}" for i in range(100)]  # Unicode znaki
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź wydajność
        self.assertLess(execution_time, 2.0, 
                       f"Generowanie 100 slugów z znakami Unicode "
                       f"trwało {execution_time:.2f}s, co jest za długo")
    
    def test_performance_scalability(self):
        """Test skalowalności wydajności"""
        batch_sizes = [10, 100, 1000, 10000]
        execution_times = []
        
        for batch_size in batch_sizes:
            titles = [f"Kurs {i}" for i in range(batch_size)]
            
            start_time = time.time()
            
            for title in titles:
                generate_unique_slug(title, self.mock_db)
            
            end_time = time.time()
            execution_time = end_time - start_time
            execution_times.append(execution_time)
        
        # Sprawdź czy wydajność skaluje się liniowo
        for i in range(1, len(batch_sizes)):
            ratio = batch_sizes[i] / batch_sizes[i-1]
            time_ratio = execution_times[i] / execution_times[i-1]
            
            # Czas wykonania nie powinien rosnąć szybciej niż liniowo
            self.assertLess(time_ratio, ratio * 2, 
                           f"Wydajność nie skaluje się liniowo: "
                           f"batch {batch_sizes[i-1]} -> {batch_sizes[i]}, "
                           f"czas {execution_times[i-1]:.3f}s -> {execution_times[i]:.3f}s")
    
    def test_performance_under_load(self):
        """Test wydajności pod obciążeniem"""
        def generate_slug_under_load():
            titles = [f"Kurs {i}" for i in range(100)]
            start_time = time.time()
            
            for title in titles:
                generate_unique_slug(title, self.mock_db)
            
            end_time = time.time()
            return end_time - start_time
        
        # Uruchom 10 równoległych testów
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(generate_slug_under_load) for _ in range(10)]
            execution_times = [future.result() for future in as_completed(futures)]
        
        # Sprawdź czy wydajność nie spada znacząco pod obciążeniem
        avg_time = sum(execution_times) / len(execution_times)
        max_time = max(execution_times)
        
        # Średni czas nie powinien przekraczać 2 sekund
        self.assertLess(avg_time, 2.0, 
                       f"Średni czas wykonania pod obciążeniem: {avg_time:.2f}s")
        
        # Maksymalny czas nie powinien przekraczać 5 sekund
        self.assertLess(max_time, 5.0, 
                       f"Maksymalny czas wykonania pod obciążeniem: {max_time:.2f}s")


class TestPerformanceRegression(unittest.TestCase):
    """Testy regresji wydajności"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_query = Mock()
        self.mock_db.collection.return_value = self.mock_collection
        self.mock_collection.where.return_value = self.mock_query
        self.mock_query.get.return_value = []
    
    def test_performance_regression_baseline(self):
        """Test bazowej wydajności dla porównania"""
        titles = [f"Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Zapisz czas wykonania dla porównania
        self.baseline_time = execution_time
        
        # Sprawdź czy czas wykonania jest rozsądny
        self.assertLess(execution_time, 1.0, 
                       f"Bazowy czas wykonania: {execution_time:.3f}s")
    
    def test_performance_regression_comparison(self):
        """Test porównania wydajności"""
        # Uruchom test bazowy
        self.test_performance_regression_baseline()
        baseline_time = self.baseline_time
        
        # Uruchom test ponownie
        titles = [f"Kurs {i}" for i in range(100)]
        
        start_time = time.time()
        
        for title in titles:
            generate_unique_slug(title, self.mock_db)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Sprawdź czy wydajność nie spadła znacząco
        performance_ratio = execution_time / baseline_time
        self.assertLess(performance_ratio, 2.0, 
                       f"Wydajność spadła o {performance_ratio:.2f}x: "
                       f"bazowy {baseline_time:.3f}s -> aktualny {execution_time:.3f}s")


if __name__ == '__main__':
    # Uruchom testy
    unittest.main(verbosity=2)
