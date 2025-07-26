import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from api.models import User

def check_users():
    """Sprawdź użytkowników w Django"""
    users = User.objects.all()
    
    print("=== UŻYTKOWNICY W DJANGO ===")
    for user in users:
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Firebase UID: {user.firebase_uid or 'BRAK'}")
        print(f"Imię: {user.first_name or 'BRAK'}")
        print(f"Nazwisko: {user.last_name or 'BRAK'}")
        print(f"Nauczyciel: {user.is_teacher}")
        print(f"Student: {user.is_student}")
        print("-" * 30)

if __name__ == "__main__":
    check_users() 