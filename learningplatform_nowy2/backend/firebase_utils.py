import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

# Load environment variables from .env file
load_dotenv()

# Required environment variables
required_vars = [
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_CERT_URL'
]

# Check for missing environment variables
missing = [var for var in required_vars if not os.getenv(var)]
if missing:
    raise Exception(f"Brakuje wymaganych zmiennych środowiskowych: {', '.join(missing)}")

# Get Firebase credentials from environment variables
private_key_id = os.getenv('FIREBASE_PRIVATE_KEY_ID')
private_key = os.getenv('FIREBASE_PRIVATE_KEY')
client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
client_id = os.getenv('FIREBASE_CLIENT_ID')
client_cert_url = os.getenv('FIREBASE_CLIENT_CERT_URL')

# Debug private key format
if private_key:
    print("Private key format check:")
    print(f"Starts with BEGIN: {private_key.strip().startswith('-----BEGIN PRIVATE KEY-----')}")
    print(f"Ends with END: {private_key.strip().endswith('-----END PRIVATE KEY-----')}")
    contains_newlines = '\n' in private_key
    print(f"Contains newlines: {contains_newlines}")
    print(f"Length: {len(private_key)}")

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    try:
        # Process private key
        if private_key:
            # Remove any extra quotes if present
            private_key = private_key.strip('"\'')
            # Ensure proper line breaks
            if '\\n' in private_key:
                private_key = private_key.replace('\\n', '\n')
        
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": "cogito-8443e",
            "private_key_id": private_key_id,
            "private_key": private_key,
            "client_email": client_email,
            "client_id": client_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": client_cert_url
        })
        firebase_admin.initialize_app(cred)
    except Exception as e:
        raise Exception(f"Błąd inicjalizacji Firebase: {str(e)}")

def set_user_role(uid, role):
    """Set custom claims for a user to define their role."""
    try:
        auth.set_custom_user_claims(uid, {'role': role})
        print(f"Set role {role} for UID {uid}")
        return True
    except Exception as e:
        print(f"Error setting user role: {str(e)}")
        return False

def verify_token(token: str):
    """
    Verify Firebase ID token
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

def delete_user_from_firebase_auth(uid: str):
    """
    Delete user from Firebase Authentication
    """
    try:
        auth.delete_user(uid)
        print(f"Successfully deleted user {uid} from Firebase Auth")
        return True
    except Exception as e:
        print(f"Error deleting user from Firebase Auth: {str(e)}")
        return False 