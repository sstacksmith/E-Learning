from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from firebase_utils import auth
from learningplatform.firebase_config import verify_firebase_token

User = get_user_model()

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        print(f"=== AUTHENTICATION ATTEMPT ===")
        print(f"Request path: {request.path}")
        print(f"Request method: {request.method}")
        
        auth_header = request.headers.get('Authorization')
        print(f"Authorization header: {auth_header}")
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print("No Bearer token found")
            return None
        
        token = auth_header.split('Bearer ')[1]
        if not token:
            print("Empty token")
            return None
        
        try:
            print("Verifying Firebase token...")
            # Verify Firebase token
            decoded_token = verify_firebase_token(token)
            if not decoded_token:
                print("Invalid Firebase token")
                raise AuthenticationFailed('Invalid Firebase token')
            
            email = decoded_token.get('email')
            print(f"Token email: {email}")
            
            if not email:
                print("No email in token")
                raise AuthenticationFailed('No email in token')
            
            # Get or create Django user
            try:
                user = User.objects.get(email=email)
                print(f"Found existing user: {user.email}, is_teacher: {user.is_teacher}")
                print(f"SKIPPING Firebase role sync for existing user - preserving Django role")
                
            except User.DoesNotExist:
                print(f"Creating new user for email: {email}")
                # Create new user
                username = email.split('@')[0]
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=None
                )
                print(f"Created new user: {user.email}")
                
                # Only set role from Firebase for new users
                try:
                    firebase_user = auth.get_user(decoded_token['uid'])
                    custom_claims = firebase_user.custom_claims or {}
                    role = custom_claims.get('role', 'student')
                    print(f"Firebase role for new user: {role}")
                    
                    # Update Django user role based on Firebase claims
                    if role == 'teacher':
                        user.is_teacher = True
                        user.is_student = False
                    elif role == 'admin':
                        user.is_superuser = True
                        user.is_teacher = True
                        user.is_student = False
                    else:  # student
                        user.is_teacher = False
                        user.is_student = True
                    
                    user.save()
                    print(f"Set new user role - is_teacher: {user.is_teacher}")
                    
                except Exception as e:
                    print(f"Error syncing user role for new user: {e}")
                    # Default to student for new users
                    user.is_student = True
                    user.save()
            
            print(f"Authentication successful for user: {user.email}, is_teacher: {user.is_teacher}")
            return (user, None)
            
        except Exception as e:
            print(f"Authentication failed: {str(e)}")
            raise AuthenticationFailed(f'Authentication failed: {str(e)}') 