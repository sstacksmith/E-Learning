from firebase_utils import auth
from django.contrib.auth import get_user_model
from django.conf import settings
import os

User = get_user_model()

class FirebaseAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ')[1]
            try:
                # Verify Firebase token
                decoded_token = auth.verify_id_token(token)
                firebase_uid = decoded_token['uid']
                email = decoded_token.get('email', '')
                
                # Find or create Django user
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    # If user doesn't exist, create them
                    username = email.split('@')[0] if email else firebase_uid
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=None  # User won't be able to login through Django
                    )
                
                # Set user in request
                request.user = user
                
            except Exception as e:
                print(f"Firebase authentication error: {str(e)}")
                request.user = None
        
        response = self.get_response(request)
        return response 