import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from firebase_admin import auth
from firebase_utils import set_user_role

def set_teacher_claims():
    """Set custom claims for teacher users"""
    try:
        # List all users and find teacher users
        for user_record in auth.list_users().iterate_all():
            email = user_record.email
            if not email:
                continue
                
            print(f"Checking user: {email}")
            print(f"Custom claims: {user_record.custom_claims}")
            
            # Check if this is a teacher user (you can modify this condition)
            if email == 'nauczyciel@nauczyciel.pl' or email == 'testowy@testowy.pl':
                print(f"Setting teacher role for: {email}")
                success = set_user_role(user_record.uid, 'teacher')
                if success:
                    print(f"Successfully set teacher role for {email}")
                else:
                    print(f"Failed to set teacher role for {email}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    set_teacher_claims()
