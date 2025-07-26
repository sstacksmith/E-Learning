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

def fix_existing_chats():
    """Sprawdź i napraw istniejące czaty"""
    print("=== SPRAWDZANIE ISTNIEJĄCYCH CZATÓW ===")
    
    db = firestore.client()
    chats_ref = db.collection('groupChats')
    
    try:
        chats = list(chats_ref.stream())
        print(f"Znaleziono {len(chats)} czatów")
        
        for chat in chats:
            chat_data = chat.to_dict()
            chat_id = chat.id
            
            print(f"\n--- Chat ID: {chat_id} ---")
            print(f"Nazwa: {chat_data.get('name', 'Brak nazwy')}")
            
            participants = chat_data.get('participants', [])
            print(f"Uczestnicy (Firebase UIDs): {participants}")
            
            # Sprawdź każdy Firebase UID
            valid_participants = []
            for participant_uid in participants:
                try:
                    user = User.objects.get(firebase_uid=participant_uid)
                    print(f"  ✓ {participant_uid} -> {user.email} ({user.first_name} {user.last_name})")
                    valid_participants.append(participant_uid)
                except User.DoesNotExist:
                    print(f"  ✗ {participant_uid} -> BRAK W DJANGO")
                    # Możemy usunąć nieprawidłowych uczestników
                    # valid_participants.append(participant_uid)  # lub nie dodawać
            
            # Jeśli są nieprawidłowi uczestnicy, możemy zaktualizować czat
            if len(valid_participants) != len(participants):
                print(f"  ⚠ Czat ma {len(participants)} uczestników, ale tylko {len(valid_participants)} jest prawidłowych")
                
                # Opcjonalnie: zaktualizuj czat, aby usunąć nieprawidłowych uczestników
                # chats_ref.document(chat_id).update({
                #     'participants': valid_participants
                # })
                # print(f"  ✓ Zaktualizowano uczestników czatu")
            
            print("-" * 50)
            
    except Exception as e:
        print(f"Błąd podczas sprawdzania czatów: {e}")

def show_all_users_for_chat():
    """Pokaż wszystkich użytkowników dostępnych do czatów"""
    print("\n=== WSZYSCY UŻYTKOWNICY DOSTĘPNI DO CZATÓW ===")
    
    users_with_firebase = User.objects.filter(firebase_uid__isnull=False).exclude(firebase_uid='')
    
    for user in users_with_firebase:
        print(f"✓ {user.email} -> {user.firebase_uid}")
        print(f"  Imię: {user.first_name or 'BRAK'}")
        print(f"  Nazwisko: {user.last_name or 'BRAK'}")
        print(f"  Nauczyciel: {user.is_teacher}")
        print("-" * 30)

if __name__ == "__main__":
    fix_existing_chats()
    show_all_users_for_chat() 