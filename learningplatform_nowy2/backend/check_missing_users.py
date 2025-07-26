import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

import firebase_admin
from firebase_admin import credentials, auth
from api.models import User

# Initialize Firebase
cred = credentials.Certificate('firebase-credentials.json')
try:
    firebase_admin.initialize_app(cred)
except ValueError:
    # App already initialized
    pass

def check_missing_users():
    """Sprawdź brakujących użytkowników"""
    print("=== SPRAWDZANIE BRAKUJĄCYCH UŻYTKOWNIKÓW ===")
    
    # Pobierz wszystkich użytkowników z Firebase
    firebase_users = []
    for user_record in auth.list_users().iterate_all():
        if user_record.email:
            firebase_users.append({
                'uid': user_record.uid,
                'email': user_record.email
            })
    
    print(f"Użytkownicy w Firebase: {len(firebase_users)}")
    
    # Sprawdź każdy Firebase user
    for firebase_user in firebase_users:
        try:
            django_user = User.objects.get(email=firebase_user['email'])
            if not django_user.firebase_uid:
                print(f"✗ {firebase_user['email']} -> BRAK firebase_uid w Django")
                print(f"  Firebase UID: {firebase_user['uid']}")
            else:
                print(f"✓ {firebase_user['email']} -> OK")
        except User.DoesNotExist:
            print(f"✗ {firebase_user['email']} -> BRAK w Django")
            print(f"  Firebase UID: {firebase_user['uid']}")

if __name__ == "__main__":
    check_missing_users() 