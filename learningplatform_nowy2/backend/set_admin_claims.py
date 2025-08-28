import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from firebase_admin import auth
from firebase_utils import set_user_role

def set_admin_claims():
    """Set custom claims for admin users"""
    try:
        # List all users and find admin users
        for user_record in auth.list_users().iterate_all():
            email = user_record.email
            if not email:
                continue
                
            print(f"Checking user: {email}")
            print(f"Custom claims: {user_record.custom_claims}")
            
            # Check if this is an admin user (you can modify this condition)
            if email == 'admin@admin.pl' or email == 'admin@example.com':
                print(f"Setting admin role for: {email}")
                success = set_user_role(user_record.uid, 'admin')
                if success:
                    print(f"Successfully set admin role for {email}")
                else:
                    print(f"Failed to set admin role for {email}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    set_admin_claims()
