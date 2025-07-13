from functools import wraps
from django.http import JsonResponse
from firebase_admin import auth

def firebase_auth_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'No token provided'}, status=401)
        
        token = auth_header.split('Bearer ')[1]
        try:
            # Weryfikuj token
            decoded_token = auth.verify_id_token(token)
            # Możesz dodać dodatkowe sprawdzenia tutaj
            return view_func(request, *args, **kwargs)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=401)
    
    return wrapper 