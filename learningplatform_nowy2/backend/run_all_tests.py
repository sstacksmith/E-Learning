#!/usr/bin/env python
"""
Skrypt do uruchamiania wszystkich testów dla systemu generowania unikalnych slugów
"""
import unittest
import sys
import os
import time

# Dodaj ścieżkę do modułów
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_all_tests():
    """Uruchamia wszystkie testy"""
    print("=" * 80)
    print("URUCHAMIANIE WSZYSTKICH TESTÓW DLA SYSTEMU GENEROWANIA SLUG")
    print("=" * 80)
    
    # Lista wszystkich modułów testowych
    test_modules = [
        'tests.test_slug_generation',
        'tests.test_duplicate_checking', 
        'tests.test_slug_fixing',
        'tests.test_edge_cases',
        'tests.test_performance'
    ]
    
    # Ładowanie testów
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    for module_name in test_modules:
        try:
            print(f"\n[INFO] Ładowanie modułu: {module_name}")
            module = __import__(module_name, fromlist=[''])
            tests = loader.loadTestsFromModule(module)
            suite.addTests(tests)
            print(f"[OK] Załadowano {tests.countTestCases()} testów")
        except ImportError as e:
            print(f"[ERROR] Błąd ładowania modułu {module_name}: {e}")
        except Exception as e:
            print(f"[ERROR] Nieoczekiwany błąd w module {module_name}: {e}")
    
    # Uruchomienie testów
    print(f"\n[START] Uruchamianie {suite.countTestCases()} testów...")
    print("-" * 80)
    
    start_time = time.time()
    
    runner = unittest.TextTestRunner(
        verbosity=2,
        stream=sys.stdout,
        descriptions=True,
        failfast=False
    )
    
    result = runner.run(suite)
    
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Podsumowanie wyników
    print("\n" + "=" * 80)
    print("PODSUMOWANIE WYNIKÓW")
    print("=" * 80)
    
    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped) if hasattr(result, 'skipped') else 0
    passed = total_tests - failures - errors - skipped
    
    print(f"[STATS] Łączna liczba testów: {total_tests}")
    print(f"[PASS] Przeszło: {passed}")
    print(f"[FAIL] Nie przeszło: {failures}")
    print(f"[ERROR] Błędy: {errors}")
    print(f"[SKIP] Pominięte: {skipped}")
    print(f"[TIME] Czas wykonania: {execution_time:.2f}s")
    
    # Statystyki wydajności
    if total_tests > 0:
        tests_per_second = total_tests / execution_time
        print(f"[PERF] Wydajność: {tests_per_second:.1f} testów/sekundę")
    
    # Szczegóły błędów
    if failures > 0:
        print(f"\n[FAIL] SZCZEGÓŁY BŁĘDÓW ({failures}):")
        print("-" * 40)
        for i, (test, traceback) in enumerate(result.failures, 1):
            print(f"{i}. {test}")
            print(f"   {traceback.split('AssertionError:')[-1].strip()}")
    
    if errors > 0:
        print(f"\n[ERROR] SZCZEGÓŁY BŁĘDÓW KRYTYCZNYCH ({errors}):")
        print("-" * 40)
        for i, (test, traceback) in enumerate(result.errors, 1):
            print(f"{i}. {test}")
            print(f"   {traceback.split('Exception:')[-1].strip()}")
    
    # Status końcowy
    print("\n" + "=" * 80)
    if failures == 0 and errors == 0:
        print("[SUCCESS] WSZYSTKIE TESTY PRZESZŁY POMYŚLNIE!")
        print("[OK] System generowania unikalnych slugów działa poprawnie")
        return True
    else:
        print("[WARNING] NIEKTÓRE TESTY NIE PRZESZŁY")
        print("[FIX] Sprawdź szczegóły błędów powyżej")
        return False

def run_specific_test_category(category):
    """Uruchamia testy z określonej kategorii"""
    categories = {
        'generation': 'tests.test_slug_generation',
        'duplicates': 'tests.test_duplicate_checking',
        'fixing': 'tests.test_slug_fixing',
        'edge': 'tests.test_edge_cases',
        'performance': 'tests.test_performance'
    }
    
    if category not in categories:
        print(f"[ERROR] Nieznana kategoria: {category}")
        print(f"[INFO] Dostępne kategorie: {', '.join(categories.keys())}")
        return False
    
    module_name = categories[category]
    print(f"[TARGET] Uruchamianie testów kategorii: {category}")
    print(f"[MODULE] Moduł: {module_name}")
    print("-" * 50)
    
    try:
        loader = unittest.TestLoader()
        suite = loader.loadTestsFromName(module_name)
        
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        return result.wasSuccessful()
    except Exception as e:
        print(f"[ERROR] Błąd uruchamiania testów: {e}")
        return False

def main():
    """Główna funkcja"""
    if len(sys.argv) > 1:
        category = sys.argv[1].lower()
        success = run_specific_test_category(category)
    else:
        success = run_all_tests()
    
    # Kod wyjścia
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
