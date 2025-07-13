from django.http import JsonResponse
from .firebase_admin import verify_token
from functools import wraps

class FirebaseAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip authentication for certain paths
        if request.path.startswith('/admin/') or request.path.startswith('/api/auth/'):
            return self.get_response(request)

        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'No token provided'}, status=401)

        token = auth_header.split('Bearer ')[1]
        decoded_token = verify_token(token)

        if not decoded_token:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        # Add user info to request
        request.user_info = decoded_token
        return self.get_response(request)

def teacher_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not hasattr(request, 'user_info'):
            return JsonResponse({'error': 'Authentication required'}, status=401)

        if request.user_info.get('role') != 'teacher':
            return JsonResponse({'error': 'Teacher access required'}, status=403)

        return view_func(request, *args, **kwargs)
    return wrapper 