# Testy dla systemu zgłoszeń błędów

## Opis

Ten plik zawiera testy jednostkowe dla systemu zgłoszeń błędów (bug reports).

## Struktura testów

### TestBugReports
- `test_report_bug_success` - Test pomyślnego zgłoszenia błędu
- `test_report_bug_missing_required_fields` - Test walidacji wymaganych pól
- `test_get_bug_reports_success` - Test pobierania zgłoszeń przez IT support
- `test_get_bug_reports_unauthorized` - Test uprawnień (brak dostępu dla zwykłych użytkowników)
- `test_update_bug_report_status_success` - Test aktualizacji statusu
- `test_update_bug_report_status_invalid_status` - Test walidacji statusu
- `test_update_bug_report_status_unauthorized` - Test uprawnień do aktualizacji
- `test_get_bug_reports_with_filters` - Test filtrowania zgłoszeń
- `test_report_bug_with_minimal_data` - Test zgłoszenia z minimalnymi danymi

### TestBugReportValidation
- `test_category_required` - Test wymagalności kategorii
- `test_description_required` - Test wymagalności opisu
- `test_valid_status_values` - Test prawidłowych wartości statusu

### TestBugReportPermissions
- `test_it_support_can_access_reports` - Test dostępu IT support
- `test_non_it_support_cannot_access_reports` - Test braku dostępu dla innych ról
- `test_anyone_can_report_bug` - Test anonimowego zgłaszania błędów

## Uruchamianie testów

### Wszystkie testy zgłoszeń błędów:
```bash
cd E-Learning/learningplatform_nowy2/backend
python -m pytest tests/test_bug_reports.py -v
```

### Pojedynczy test:
```bash
python -m pytest tests/test_bug_reports.py::TestBugReports::test_report_bug_success -v
```

### Z pokryciem kodu:
```bash
python -m pytest tests/test_bug_reports.py --cov=learningplatform.views --cov-report=html
```

### Używając unittest:
```bash
python -m unittest tests.test_bug_reports -v
```

## Wymagania

- Python 3.8+
- Django 5.0+
- django-rest-framework
- firebase-admin
- unittest.mock (wbudowane)

## Uwagi

- Testy używają mocków dla Firestore, więc nie wymagają połączenia z bazą danych
- Testy sprawdzają zarówno pozytywne, jak i negatywne scenariusze
- Wszystkie testy są izolowane i nie wpływają na siebie nawzajem


