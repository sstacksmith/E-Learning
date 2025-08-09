import firebase_admin
from firebase_admin import auth
from django.utils.functional import SimpleLazyObject
from django.contrib.auth.models import AnonymousUser
import jwt
from django.conf import settings
from api.models import User
from django.http import HttpResponse
from firebase_admin import auth
import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
print("BASE_DIR:", BASE_DIR)

# Ścieżka do pliku credentials
cred_path = os.path.join(BASE_DIR, 'firebase-credentials.json')
print("Używany plik credentials:", cred_path)

# Inicjalizacja Firebase Admin SDK
cred = credentials.Certificate(cred_path)
print("project_id z credentials:", cred.project_id)

try:
    firebase_admin.initialize_app(cred)
except ValueError:
    # App already initialized
    pass

def get_user_from_token(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header:
        return AnonymousUser()

    try:
        # Extract token
        token = auth_header.split(' ')[1]
        
        # First try Firebase token
        try:
            print("Verifying Firebase token...")
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email', '')
            firebase_role = decoded_token.get('role', 'student')  # Get role from Firebase token
            
            # Get or create user
            user, created = User.objects.get_or_create(
                firebase_uid=uid,
                defaults={
                    'email': email,
                    'username': email,
                    'is_teacher': firebase_role == 'teacher',
                    'is_student': firebase_role == 'student'
                }
            )

            # Update user role if it changed in Firebase
            if not created:
                should_update = False
                if firebase_role == 'teacher' and not user.is_teacher:
                    user.is_teacher = True
                    user.is_student = False
                    should_update = True
                elif firebase_role == 'student' and not user.is_student:
                    user.is_teacher = False
                    user.is_student = True
                    should_update = True
                
                if should_update:
                    print(f"Updating user role to {firebase_role}")
                    user.save()

            return user
        except Exception as firebase_error:
            print(f"Firebase verification failed: {str(firebase_error)}")
            
            # If Firebase fails, try JWT token
            try:
                print("Trying JWT token verification...")
                decoded_jwt = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = decoded_jwt.get('user_id')
                if user_id:
                    return User.objects.get(id=user_id)
            except Exception as jwt_error:
                print(f"JWT verification failed: {str(jwt_error)}")
                return AnonymousUser()

    except Exception as e:
        print(f"Authentication error: {str(e)}")
        return AnonymousUser()

    return AnonymousUser()

class FirebaseAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

        # Pomiń uwierzytelnianie dla health check endpointu
        if request.path == '/health/':
            return self.get_response(request)

        # Sprawdź czy request jest do endpointu API
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        # Pomiń uwierzytelnianie dla niektórych endpointów
        if request.path in ['/api/auth/firebase-login/', '/api/test/', '/api/import-courses/']:
            return self.get_response(request)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return self.get_response(request)

        try:
            token = auth_header.split(' ')[1]
            decoded_token = auth.verify_id_token(token)
            request.firebase_user = decoded_token
        except Exception as e:
            print(f"Firebase auth error: {str(e)}")

        return self.get_response(request) 