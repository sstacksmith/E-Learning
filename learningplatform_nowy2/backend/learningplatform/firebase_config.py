import firebase_admin
from firebase_admin import auth

# Firebase Admin SDK is initialized in firebase_utils.py using environment variables
# This module just provides helper functions that use the already-initialized SDK
# No need to initialize again - firebase_utils.py handles it

def verify_firebase_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print('Token verification error:', e)
        return None 