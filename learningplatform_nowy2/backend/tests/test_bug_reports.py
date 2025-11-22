#!/usr/bin/env python
"""
Testy dla systemu zgłoszeń błędów
"""
import unittest
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

# Dodaj ścieżkę do modułów Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from learningplatform.views import report_bug, get_bug_reports, update_bug_report_status
    from api.firebase_user import FirebaseUser
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback dla testów bez Django
    pass


class TestBugReports(unittest.TestCase):
    """Testy dla endpointów zgłoszeń błędów"""
    
    def setUp(self):
        """Przygotowanie danych testowych"""
        self.client = APIClient()
        
        # Przykładowe dane zgłoszenia
        self.valid_bug_report = {
            'category': 'Błąd funkcjonalności',
            'description': 'Testowy opis błędu',
            'steps': '1. Otwórz stronę\n2. Kliknij przycisk',
            'expected': 'Powinno się otworzyć okno',
            'actual': 'Nic się nie dzieje',
            'browser': 'Chrome 120',
            'url': 'https://example.com/test'
        }
        
        # Użytkownik IT support
        self.it_support_user = Mock()
        self.it_support_user.email = 'it-support@test.com'
        self.it_support_user.is_it_support = True
        self.it_support_user.is_authenticated = True
        
        # Zwykły użytkownik
        self.regular_user = Mock()
        self.regular_user.email = 'user@test.com'
        self.regular_user.is_it_support = False
        self.regular_user.is_authenticated = True
    
    @patch('learningplatform.views.firestore')
    @patch('learningplatform.views.timezone')
    def test_report_bug_success(self, mock_timezone, mock_firestore):
        """Test pomyślnego zgłoszenia błędu"""
        # Mock timezone
        mock_timezone.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
        
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
        
        # Utwórz request
        request = Mock()
        request.data = self.valid_bug_report
        
        # Wywołaj funkcję
        from rest_framework.response import Response
        with patch('learningplatform.views.logger'):
            response = report_bug(request)
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['id'], 'test-report-id')
        
        # Sprawdź czy dane zostały zapisane
        mock_add.assert_called_once()
        call_args = mock_add.call_args[0][0]
        self.assertEqual(call_args['category'], self.valid_bug_report['category'])
        self.assertEqual(call_args['description'], self.valid_bug_report['description'])
        self.assertEqual(call_args['status'], 'new')
    
    def test_report_bug_missing_required_fields(self):
        """Test zgłoszenia błędu bez wymaganych pól"""
        request = Mock()
        request.data = {
            'description': 'Brak kategorii'
            # Brak category
        }
        
        with patch('learningplatform.views.logger'):
            response = report_bug(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('category', response.data['error'])
    
    @patch('learningplatform.views.firestore')
    @patch('learningplatform.views.Query')
    def test_get_bug_reports_success(self, mock_query, mock_firestore):
        """Test pobierania zgłoszeń przez IT support"""
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_query_ref = MagicMock()
        mock_stream = MagicMock()
        
        # Mock danych zgłoszeń
        mock_doc1 = MagicMock()
        mock_doc1.id = 'report-1'
        mock_doc1.to_dict.return_value = {
            'category': 'Błąd funkcjonalności',
            'description': 'Test 1',
            'status': 'new',
            'created_at': datetime(2024, 1, 1, 12, 0, 0),
            'updated_at': datetime(2024, 1, 1, 12, 0, 0)
        }
        
        mock_doc2 = MagicMock()
        mock_doc2.id = 'report-2'
        mock_doc2.to_dict.return_value = {
            'category': 'Problem z logowaniem',
            'description': 'Test 2',
            'status': 'in_progress',
            'created_at': datetime(2024, 1, 2, 12, 0, 0),
            'updated_at': datetime(2024, 1, 2, 12, 0, 0)
        }
        
        mock_stream.return_value = [mock_doc1, mock_doc2]
        mock_query_ref.stream = mock_stream
        mock_query_ref.order_by.return_value = mock_query_ref
        mock_query_ref.limit.return_value = mock_query_ref
        mock_collection.order_by = mock_query_ref.order_by
        mock_db.collection.return_value = mock_collection
        
        mock_firestore.client.return_value = mock_db
        mock_query.DESCENDING = 'DESCENDING'
        
        # Utwórz request
        request = Mock()
        request.user = self.it_support_user
        request.query_params = {}
        
        with patch('learningplatform.views.logger'):
            response = get_bug_reports(request)
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['reports']), 2)
    
    def test_get_bug_reports_unauthorized(self):
        """Test pobierania zgłoszeń przez nieautoryzowanego użytkownika"""
        request = Mock()
        request.user = self.regular_user
        request.query_params = {}
        
        with patch('learningplatform.views.logger'):
            response = get_bug_reports(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('IT support', response.data['error'])
    
    @patch('learningplatform.views.firestore')
    @patch('learningplatform.views.timezone')
    def test_update_bug_report_status_success(self, mock_timezone, mock_firestore):
        """Test aktualizacji statusu zgłoszenia"""
        # Mock timezone
        mock_timezone.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
        
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc_ref.get.return_value = mock_doc
        mock_collection.document.return_value = mock_doc_ref
        mock_db.collection.return_value = mock_collection
        mock_firestore.client.return_value = mock_db
        
        # Utwórz request
        request = Mock()
        request.user = self.it_support_user
        request.data = {'status': 'in_progress'}
        
        with patch('learningplatform.views.logger'):
            response = update_bug_report_status(request, 'test-report-id')
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Sprawdź czy update został wywołany
        mock_doc_ref.update.assert_called_once()
        update_data = mock_doc_ref.update.call_args[0][0]
        self.assertEqual(update_data['status'], 'in_progress')
        self.assertEqual(update_data['updated_by'], 'it-support@test.com')
    
    def test_update_bug_report_status_invalid_status(self):
        """Test aktualizacji statusu z nieprawidłowym statusem"""
        request = Mock()
        request.user = self.it_support_user
        request.data = {'status': 'invalid_status'}
        
        with patch('learningplatform.views.firestore') as mock_firestore:
            mock_db = MagicMock()
            mock_collection = MagicMock()
            mock_doc_ref = MagicMock()
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc_ref.get.return_value = mock_doc
            mock_collection.document.return_value = mock_doc_ref
            mock_db.collection.return_value = mock_collection
            mock_firestore.client.return_value = mock_db
            
            with patch('learningplatform.views.logger'):
                response = update_bug_report_status(request, 'test-report-id')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_update_bug_report_status_unauthorized(self):
        """Test aktualizacji statusu przez nieautoryzowanego użytkownika"""
        request = Mock()
        request.user = self.regular_user
        request.data = {'status': 'resolved'}
        
        with patch('learningplatform.views.logger'):
            response = update_bug_report_status(request, 'test-report-id')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('IT support', response.data['error'])
    
    @patch('learningplatform.views.firestore')
    def test_get_bug_reports_with_filters(self, mock_firestore):
        """Test pobierania zgłoszeń z filtrami"""
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_where_ref = MagicMock()
        mock_query_ref = MagicMock()
        mock_stream = MagicMock()
        
        mock_doc = MagicMock()
        mock_doc.id = 'report-1'
        mock_doc.to_dict.return_value = {
            'category': 'Błąd funkcjonalności',
            'description': 'Test',
            'status': 'new',
            'created_at': datetime(2024, 1, 1, 12, 0, 0),
            'updated_at': datetime(2024, 1, 1, 12, 0, 0)
        }
        
        mock_stream.return_value = [mock_doc]
        mock_query_ref.stream = mock_stream
        mock_query_ref.order_by.return_value = mock_query_ref
        mock_query_ref.limit.return_value = mock_query_ref
        mock_where_ref.order_by = mock_query_ref.order_by
        mock_where_ref.where.return_value = mock_where_ref
        mock_collection.where = mock_where_ref.where
        
        mock_db.collection.return_value = mock_collection
        mock_firestore.client.return_value = mock_db
        
        # Utwórz request z filtrem
        request = Mock()
        request.user = self.it_support_user
        request.query_params = {'status': 'new', 'category': 'Błąd funkcjonalności'}
        
        with patch('learningplatform.views.Query') as mock_query, \
             patch('learningplatform.views.logger'):
            mock_query.DESCENDING = 'DESCENDING'
            response = get_bug_reports(request)
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    @patch('learningplatform.views.firestore')
    def test_report_bug_with_minimal_data(self, mock_firestore):
        """Test zgłoszenia błędu z minimalnymi danymi"""
        # Mock Firestore
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_add = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = 'minimal-report-id'
        mock_add.return_value = (None, mock_doc_ref)
        mock_collection.add = mock_add
        mock_db.collection.return_value = mock_collection
        mock_firestore.client.return_value = mock_db
        
        # Minimalne dane (tylko wymagane pola)
        request = Mock()
        request.data = {
            'category': 'Inny problem',
            'description': 'Minimalny opis'
        }
        
        with patch('learningplatform.views.timezone') as mock_timezone, \
             patch('learningplatform.views.logger'):
            mock_timezone.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
            response = report_bug(request)
        
        # Sprawdź wynik
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        
        # Sprawdź czy puste pola są zapisane jako puste stringi
        call_args = mock_add.call_args[0][0]
        self.assertEqual(call_args['steps'], '')
        self.assertEqual(call_args['expected'], '')
        self.assertEqual(call_args['actual'], '')
        self.assertEqual(call_args['browser'], '')
        self.assertEqual(call_args['url'], '')


class TestBugReportValidation(unittest.TestCase):
    """Testy walidacji danych zgłoszeń"""
    
    def test_category_required(self):
        """Test wymagalności pola category"""
        request = Mock()
        request.data = {
            'description': 'Test bez kategorii'
        }
        
        with patch('learningplatform.views.logger'):
            response = report_bug(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_description_required(self):
        """Test wymagalności pola description"""
        request = Mock()
        request.data = {
            'category': 'Błąd funkcjonalności'
        }
        
        with patch('learningplatform.views.logger'):
            response = report_bug(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_valid_status_values(self):
        """Test prawidłowych wartości statusu"""
        valid_statuses = ['new', 'in_progress', 'resolved', 'closed']
        
        for status_value in valid_statuses:
            request = Mock()
            request.user = Mock()
            request.user.email = 'it-support@test.com'
            request.user.is_it_support = True
            request.data = {'status': status_value}
            
            with patch('learningplatform.views.firestore') as mock_firestore:
                mock_db = MagicMock()
                mock_collection = MagicMock()
                mock_doc_ref = MagicMock()
                mock_doc = MagicMock()
                mock_doc.exists = True
                mock_doc_ref.get.return_value = mock_doc
                mock_collection.document.return_value = mock_doc_ref
                mock_db.collection.return_value = mock_collection
                mock_firestore.client.return_value = mock_db
                
                with patch('learningplatform.views.timezone') as mock_timezone, \
                     patch('learningplatform.views.logger'):
                    mock_timezone.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
                    response = update_bug_report_status(request, 'test-id')
                    
                    # Status powinien być zaakceptowany
                    self.assertIn(response.status_code, [
                        status.HTTP_200_OK,
                        status.HTTP_404_NOT_FOUND  # Jeśli dokument nie istnieje
                    ])


class TestBugReportPermissions(unittest.TestCase):
    """Testy uprawnień do zgłoszeń błędów"""
    
    def setUp(self):
        """Przygotowanie użytkowników"""
        self.it_support = Mock()
        self.it_support.email = 'it@test.com'
        self.it_support.is_it_support = True
        self.it_support.is_authenticated = True
        
        self.admin = Mock()
        self.admin.email = 'admin@test.com'
        self.admin.is_it_support = False
        self.admin.is_superuser = True
        self.admin.is_authenticated = True
        
        self.teacher = Mock()
        self.teacher.email = 'teacher@test.com'
        self.teacher.is_it_support = False
        self.teacher.is_teacher = True
        self.teacher.is_authenticated = True
        
        self.student = Mock()
        self.student.email = 'student@test.com'
        self.student.is_it_support = False
        self.student.is_student = True
        self.student.is_authenticated = True
    
    def test_it_support_can_access_reports(self):
        """Test czy IT support może pobrać zgłoszenia"""
        request = Mock()
        request.user = self.it_support
        request.query_params = {}
        
        with patch('learningplatform.views.firestore') as mock_firestore, \
             patch('learningplatform.views.Query') as mock_query, \
             patch('learningplatform.views.logger'):
            mock_db = MagicMock()
            mock_collection = MagicMock()
            mock_query_ref = MagicMock()
            mock_stream = MagicMock()
            mock_stream.return_value = []
            mock_query_ref.stream = mock_stream
            mock_query_ref.order_by.return_value = mock_query_ref
            mock_query_ref.limit.return_value = mock_query_ref
            mock_collection.order_by = mock_query_ref.order_by
            mock_db.collection.return_value = mock_collection
            mock_firestore.client.return_value = mock_db
            mock_query.DESCENDING = 'DESCENDING'
            
            response = get_bug_reports(request)
        
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_non_it_support_cannot_access_reports(self):
        """Test czy użytkownicy bez roli IT support nie mogą pobrać zgłoszeń"""
        for user in [self.admin, self.teacher, self.student]:
            request = Mock()
            request.user = user
            request.query_params = {}
            
            with patch('learningplatform.views.logger'):
                response = get_bug_reports(request)
            
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_anyone_can_report_bug(self):
        """Test czy każdy może zgłosić błąd (anonimowo)"""
        request = Mock()
        request.data = {
            'category': 'Błąd funkcjonalności',
            'description': 'Test'
        }
        
        with patch('learningplatform.views.firestore') as mock_firestore, \
             patch('learningplatform.views.timezone') as mock_timezone, \
             patch('learningplatform.views.logger'):
            mock_db = MagicMock()
            mock_collection = MagicMock()
            mock_add = MagicMock()
            mock_doc_ref = MagicMock()
            mock_doc_ref.id = 'test-id'
            mock_add.return_value = (None, mock_doc_ref)
            mock_collection.add = mock_add
            mock_db.collection.return_value = mock_collection
            mock_firestore.client.return_value = mock_db
            mock_timezone.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
            
            response = report_bug(request)
        
        # Powinno się udać (nie wymaga autoryzacji)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


if __name__ == '__main__':
    unittest.main()


