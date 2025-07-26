import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from api.models import User

def check_chat_participants():
    """Sprawdź uczestników czatów na podstawie danych w Django"""
    print("=== SPRAWDZANIE UCZESTNIKÓW CZATÓW ===")
    
    # Pobierz wszystkich użytkowników z firebase_uid
    users_with_firebase = User.objects.filter(firebase_uid__isnull=False).exclude(firebase_uid='')
    
    print(f"Użytkownicy z Firebase UID: {users_with_firebase.count()}")
    
    for user in users_with_firebase:
        print(f"✓ {user.email} -> {user.firebase_uid}")
        print(f"  Imię: {user.first_name or 'BRAK'}")
        print(f"  Nazwisko: {user.last_name or 'BRAK'}")
        print(f"  Nauczyciel: {user.is_teacher}")
        print("-" * 30)
    
    # Sprawdź użytkowników bez firebase_uid
    users_without_firebase = User.objects.filter(firebase_uid__isnull=True) | User.objects.filter(firebase_uid='')
    
    if users_without_firebase.exists():
        print(f"\nUżytkownicy BEZ Firebase UID: {users_without_firebase.count()}")
        for user in users_without_firebase:
            print(f"✗ {user.email} -> BRAK firebase_uid")
            print(f"  Imię: {user.first_name or 'BRAK'}")
            print(f"  Nazwisko: {user.last_name or 'BRAK'}")
            print(f"  Nauczyciel: {user.is_teacher}")
            print("-" * 30)

if __name__ == "__main__":
    check_chat_participants() 