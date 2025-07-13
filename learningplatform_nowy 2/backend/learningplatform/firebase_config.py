import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings
import os

# Debug: print which credentials file is used and its project_id
print('BASE_DIR:', settings.BASE_DIR)
creds_path = os.path.join(settings.BASE_DIR, 'firebase-credentials.json')
print('Używany plik credentials:', creds_path)
with open(creds_path) as f:
    import json
    creds = json.load(f)
    print('project_id z credentials:', creds.get('project_id'))

# Initialize Firebase Admin SDK
cred = credentials.Certificate(creds_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

def verify_firebase_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print('Błąd weryfikacji tokena:', e)
        return None 