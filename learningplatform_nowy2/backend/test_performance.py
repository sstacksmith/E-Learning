#!/usr/bin/env python
import os
import sys
import django
import time
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from learningplatform.models import Course
from django.contrib.auth import get_user_model

User = get_user_model()

def test_database_performance():
    """Testuje wydajność zapytań do bazy danych"""
    print("=== TEST WYDAJNOŚCI BAZY DANYCH ===")
    
    # Test 1: Pobieranie wszystkich kursów
    start_time = time.time()
    all_courses = Course.objects.all()
    count = all_courses.count()
    db_time = time.time() - start_time
    print(f"1. Pobranie wszystkich kursów ({count}): {db_time:.3f}s")
    
    # Test 2: Pobieranie kursów nauczyciela
    teacher = User.objects.filter(is_teacher=True).first()
    if teacher:
        start_time = time.time()
        teacher_courses = Course.objects.filter(created_by=teacher)
        teacher_count = teacher_courses.count()
        teacher_time = time.time() - start_time
        print(f"2. Pobranie kursów nauczyciela ({teacher_count}): {teacher_time:.3f}s")
    
    # Test 3: Pobieranie z indeksami
    start_time = time.time()
    active_courses = Course.objects.filter(is_active=True).order_by('-created_at')
    active_count = active_courses.count()
    indexed_time = time.time() - start_time
    print(f"3. Pobranie aktywnych kursów z sortowaniem ({active_count}): {indexed_time:.3f}s")
    
    # Test 4: Pobieranie z paginacją
    start_time = time.time()
    paginated_courses = Course.objects.all().order_by('-created_at')[:20]
    paginated_list = list(paginated_courses)
    pagination_time = time.time() - start_time
    print(f"4. Pobranie z paginacją (20 kursów): {pagination_time:.3f}s")
    
    return {
        'all_courses_time': db_time,
        'teacher_courses_time': teacher_time if teacher else None,
        'indexed_time': indexed_time,
        'pagination_time': pagination_time
    }

def test_api_performance():
    """Testuje wydajność API"""
    print("\n=== TEST WYDAJNOŚCI API ===")
    
    # URL API
    api_url = "http://localhost:8000/api/courses/"
    
    try:
        # Test 1: GET request bez autoryzacji
        start_time = time.time()
        response = requests.get(api_url, timeout=10)
        api_time = time.time() - start_time
        print(f"1. GET /api/courses/ (bez auth): {api_time:.3f}s - Status: {response.status_code}")
        
        # Test 2: GET request z paginacją
        start_time = time.time()
        response = requests.get(f"{api_url}?page=1&page_size=20", timeout=10)
        pagination_api_time = time.time() - start_time
        print(f"2. GET /api/courses/?page=1&page_size=20: {pagination_api_time:.3f}s - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'results' in data:
                print(f"   - Pobrano {len(data['results'])} kursów z {data['count']} dostępnych")
                print(f"   - Rozmiar odpowiedzi: {len(json.dumps(data))} bajtów")
        
        return {
            'api_time': api_time,
            'pagination_api_time': pagination_api_time,
            'status_code': response.status_code
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Błąd API: {e}")
        return None

def generate_performance_report():
    """Generuje raport wydajności"""
    print("=== RAPORT WYDAJNOŚCI ===")
    
    # Test bazy danych
    db_results = test_database_performance()
    
    # Test API
    api_results = test_api_performance()
    
    # Podsumowanie
    print("\n=== PODSUMOWANIE ===")
    
    if db_results['all_courses_time'] > 1.0:
        print("⚠️  Wolne pobieranie wszystkich kursów - rozważ paginację")
    else:
        print("✅ Wydajność bazy danych OK")
    
    if api_results and api_results['api_time'] > 2.0:
        print("⚠️  Wolne API - sprawdź konfigurację serwera")
    elif api_results:
        print("✅ Wydajność API OK")
    
    # Rekomendacje
    print("\n=== REKOMENDACJE ===")
    if db_results['all_courses_time'] > 0.5:
        print("1. Zastosuj paginację w API")
        print("2. Sprawdź indeksy bazy danych")
        print("3. Rozważ cache'owanie")
    
    if api_results and api_results['api_time'] > 1.0:
        print("4. Sprawdź konfigurację CORS")
        print("5. Rozważ CDN dla statycznych plików")
        print("6. Sprawdź logi serwera")

if __name__ == '__main__':
    generate_performance_report() 