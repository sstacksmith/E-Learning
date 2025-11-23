#!/usr/bin/env python3
"""
Generate Django SECRET_KEY without requiring Django installation
"""
import secrets
import string

def generate_secret_key():
    """
    Generate a Django-compatible SECRET_KEY
    Django SECRET_KEY uses: letters, digits, and @/./+/-/_ characters
    Length: 50 characters (default)
    """
    chars = string.ascii_letters + string.digits + '@./+-_'
    return ''.join(secrets.choice(chars) for _ in range(50))

if __name__ == '__main__':
    secret_key = generate_secret_key()
    print(secret_key)
    print("\n✅ Skopiuj powyższy klucz i ustaw jako DJANGO_SECRET_KEY na hostingu (Render)")

