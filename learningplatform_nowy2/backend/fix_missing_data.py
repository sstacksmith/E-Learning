import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from api.models import User

def fix_missing_data():
    """Napraw brakujące dane użytkowników"""
    print("=== NAPRAWIANIE BRAKUJĄCYCH DANYCH ===")
    
    # Lista użytkowników z brakującymi danymi
    users_to_fix = [
        {
            'email': 'admin@example.com',
            'firebase_uid': None,  # Ten użytkownik może nie istnieć w Firebase
            'first_name': 'Admin',
            'last_name': 'Example'
        },
        {
            'email': 'stefanski.business@gmail.com',
            'firebase_uid': None,  # Ten użytkownik może nie istnieć w Firebase
            'first_name': 'Stefanski',
            'last_name': 'Business'
        },
        {
            'email': 'student@test.pl',
            'firebase_uid': None,  # Ten użytkownik może nie istnieć w Firebase
            'first_name': 'Student',
            'last_name': 'Test'
        },
        {
            'email': 'uczen@uczen.pl',
            'firebase_uid': 'xGRd5b1s0Cfwx7qFr7zQVl8KV0v2',  # Ten już ma firebase_uid
            'first_name': 'Uczeń',
            'last_name': 'Testowy'
        }
    ]
    
    for user_data in users_to_fix:
        try:
            user = User.objects.get(email=user_data['email'])
            
            # Dodaj brakujące dane
            if not user.first_name and user_data['first_name']:
                user.first_name = user_data['first_name']
                print(f"✓ Dodano first_name dla {user.email}")
            
            if not user.last_name and user_data['last_name']:
                user.last_name = user_data['last_name']
                print(f"✓ Dodano last_name dla {user.email}")
            
            # Zapisz zmiany
            user.save()
            
        except User.DoesNotExist:
            print(f"✗ Użytkownik {user_data['email']} nie istnieje")
    
    print("\n=== PODSUMOWANIE ===")
    users = User.objects.all()
    for user in users:
        print(f"Email: {user.email}")
        print(f"  Firebase UID: {user.firebase_uid or 'BRAK'}")
        print(f"  Imię: {user.first_name or 'BRAK'}")
        print(f"  Nazwisko: {user.last_name or 'BRAK'}")
        print(f"  Nauczyciel: {user.is_teacher}")
        print("-" * 30)

if __name__ == "__main__":
    fix_missing_data() 