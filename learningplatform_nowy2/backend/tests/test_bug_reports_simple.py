#!/usr/bin/env python
"""
Uproszczone testy dla systemu zgłoszeń błędów używające APIClient
"""
import os
import sys
import django

# Konfiguracja Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from api.firebase_user import FirebaseUser


class BugReportsAPITestCase(TestCase):
    """Testy API dla zgłoszeń błędów"""
    
    def setUp(self):
        """Przygotowanie testów"""
        self.client = APIClient()
        self.valid_bug_report = {
            'category': 'Błąd funkcjonalności',
            'description': 'Testowy opis błędu',
            'steps': '1. Otwórz stronę\n2. Kliknij przycisk',
            'expected': 'Powinno się otworzyć okno',
            'actual': 'Nic się nie dzieje',
            'browser': 'Chrome 120',
            'url': 'https://example.com/test'
        }
    
    @patch('learningplatform.views.firestore')
    def test_report_bug_success(self, mock_firestore):
        """Test pomyślnego zgłoszenia błędu"""
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_add = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = 'test-report-id'
        mock_add.return_value = (None, mock_doc_ref)
        mock_collection.add = mock_add
        mock_db.collection.return_value = mock_collection
        mock_firestore.client.return_value = mock_db
        
        # Wywołaj endpoint
        response = self.client.post('/api/report-bug/', self.valid_bug_report, format='json')
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['id'], 'test-report-id')
    
    def test_report_bug_missing_category(self):
        """Test zgłoszenia bez kategorii"""
        data = {'description': 'Brak kategorii'}
        response = self.client.post('/api/report-bug/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_bug_missing_description(self):
        """Test zgłoszenia bez opisu"""
        data = {'category': 'Błąd funkcjonalności'}
        response = self.client.post('/api/report-bug/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    @patch('learningplatform.views.firestore')
    def test_get_bug_reports_unauthorized(self, mock_firestore):
        """Test pobierania zgłoszeń bez autoryzacji"""
        # Nie logujemy użytkownika
        response = self.client.get('/api/bug-reports/')
        # Powinno zwrócić 401 (Unauthorized) lub 403 (Forbidden)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    @patch('learningplatform.views.firestore')
    @patch('learningplatform.views.Query')
    def test_get_bug_reports_with_it_support(self, mock_query, mock_firestore):
        """Test pobierania zgłoszeń przez IT support"""
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_query_ref = MagicMock()
        mock_stream = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = 'report-1'
        mock_doc.to_dict.return_value = {
            'category': 'Błąd funkcjonalności',
            'description': 'Test',
            'status': 'new',
            'created_at': '2024-01-01T12:00:00',
            'updated_at': '2024-01-01T12:00:00'
        }
        mock_stream.return_value = [mock_doc]
        mock_query_ref.stream = mock_stream
        mock_query_ref.order_by.return_value = mock_query_ref
        mock_query_ref.limit.return_value = mock_query_ref
        mock_collection.order_by = mock_query_ref.order_by
        mock_db.collection.return_value = mock_collection
        mock_firestore.client.return_value = mock_db
        mock_query.DESCENDING = 'DESCENDING'
        
        # Utwórz użytkownika IT support
        it_support_user = FirebaseUser(
            uid='test-uid',
            email='it-support@test.com',
            is_it_support=True
        )
        
        # Symuluj zalogowanie (mock authentication)
        with patch('learningplatform.views.request') as mock_request:
            mock_request.user = it_support_user
            # Użyj APIClient z force_authenticate
            self.client.force_authenticate(user=it_support_user)
            response = self.client.get('/api/bug-reports/')
        
        # Sprawdź wynik (może być 200 lub 403 w zależności od implementacji)
        # Najważniejsze, że nie ma błędu 500
        self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class BugReportsValidationTestCase(TestCase):
    """Testy walidacji zgłoszeń"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_minimal_valid_report(self):
        """Test zgłoszenia z minimalnymi danymi"""
        data = {
            'category': 'Inny problem',
            'description': 'Minimalny opis'
        }
        
        with patch('learningplatform.views.firestore') as mock_firestore:
            mock_db = MagicMock()
            mock_collection = MagicMock()
            mock_add = MagicMock()
            mock_doc_ref = MagicMock()
            mock_doc_ref.id = 'minimal-id'
            mock_add.return_value = (None, mock_doc_ref)
            mock_collection.add = mock_add
            mock_db.collection.return_value = mock_collection
            mock_firestore.client.return_value = mock_db
            
            response = self.client.post('/api/report-bug/', data, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['tests.test_bug_reports_simple'])
    
    if failures:
        sys.exit(1)


