import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

import firebase_admin
from firebase_admin import credentials, firestore
from api.models import User

# Initialize Firebase
cred = credentials.Certificate('firebase-credentials.json')
try:
    firebase_admin.initialize_app(cred)
except ValueError:
    # App already initialized
    pass

def check_existing_chats():
    """Sprawdź istniejące czaty w Firestore i ich uczestników"""
    db = firestore.client()
    
    # Pobierz wszystkie czaty
    chats_ref = db.collection('groupChats')
    chats = chats_ref.stream()
    
    print("=== ISTNIEJĄCE CZATY ===")
    for chat in chats:
        chat_data = chat.to_dict()
        print(f"\nChat ID: {chat.id}")
        print(f"Nazwa: {chat_data.get('name', 'Brak nazwy')}")
        print(f"Uczestnicy (Firebase UIDs): {chat_data.get('participants', [])}")
        
        # Sprawdź czy uczestnicy mają odpowiadające im rekordy w Django
        participants = chat_data.get('participants', [])
        for participant_uid in participants:
            try:
                user = User.objects.get(firebase_uid=participant_uid)
                print(f"  ✓ {participant_uid} -> {user.email} ({user.first_name} {user.last_name})")
            except User.DoesNotExist:
                print(f"  ✗ {participant_uid} -> BRAK W DJANGO")
        
        print("-" * 50)

if __name__ == "__main__":
    check_existing_chats() 