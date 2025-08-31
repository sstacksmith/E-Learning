from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_utils import auth
from learningplatform.firebase_config import verify_firebase_token
from api.firebase_user import FirebaseUser

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        print(f"=== AUTHENTICATION ATTEMPT ===")
        print(f"Request path: {request.path}")
        print(f"Request method: {request.method}")
        
        # Pomiń uwierzytelnianie dla health check endpointu
        if request.path == '/health/':
            print("Skipping authentication for /health/ endpoint")
            return None
        
        auth_header = request.headers.get('Authorization')
        print(f"Authorization header: {auth_header}")
        
        if not auth_header:
            print("No Authorization header")
            raise AuthenticationFailed('No authorization header')
            
        if not auth_header.startswith('Bearer '):
            print("Invalid Authorization format")
            raise AuthenticationFailed('Invalid authorization header format')
        
        token = auth_header.split('Bearer ')[1]
        if not token:
            print("Empty token")
            raise AuthenticationFailed('Empty token')
        
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
            
            # Create Firebase user object
            print(f"Creating Firebase user for email: {email}")
            
            # Get role from Firebase custom claims
            try:
                firebase_user = auth.get_user(decoded_token['uid'])
                custom_claims = firebase_user.custom_claims or {}
                role = custom_claims.get('role', decoded_token.get('role', 'student'))
                print(f"🔍 Firebase role for user {email}: {role}")
                print(f"🔍 Firebase custom claims: {custom_claims}")
                
                # Set role flags based on Firebase claims
                is_teacher = role == 'teacher'
                is_student = role in ['student', 'user'] or not role
                is_parent = role == 'parent'
                is_superuser = role == 'admin'
                is_staff = role == 'admin'
                
            except Exception as e:
                print(f"❌ Error getting Firebase custom claims: {e}")
                # Default to student if can't get claims
                is_teacher = False
                is_student = True
                is_parent = False
                is_superuser = False
                is_staff = False
            
            # Create Firebase user object
            user = FirebaseUser(
                uid=decoded_token['uid'],
                email=email,
                username=email.split('@')[0],
                is_teacher=is_teacher,
                is_student=is_student,
                is_parent=is_parent,
                is_superuser=is_superuser,
                is_staff=is_staff,
                is_active=True
            )
            
            print(f"✅ Created Firebase user: {user.email}, is_teacher: {user.is_teacher}, is_student: {user.is_student}, is_superuser: {user.is_superuser}")
            return (user, None)
            
        except Exception as e:
            print(f"Authentication failed: {str(e)}")
            raise AuthenticationFailed(f'Authentication failed: {str(e)}') 