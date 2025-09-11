"""
Firebase-based user model that doesn't require Django database
"""
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.backends import ModelBackend

class FirebaseUser:
    """
    A user model that works with Firebase authentication
    without requiring Django database
    """
    def __init__(self, uid, email, username=None, **kwargs):
        self.id = uid
        self.uid = uid
        self.email = email
        self.username = username or email.split('@')[0]
        self.firebase_uid = uid
        
        # Role flags
        self.is_student = kwargs.get('is_student', True)
        self.is_teacher = kwargs.get('is_teacher', False)
        self.is_parent = kwargs.get('is_parent', False)
        self.is_superuser = kwargs.get('is_superuser', False)
        self.is_staff = kwargs.get('is_staff', False)
        self.is_active = kwargs.get('is_active', True)
        
        # Django compatibility
        self.pk = uid
        self._state = None
        
    def __str__(self):
        return self.username
    
    def __repr__(self):
        return f"FirebaseUser({self.email})"
    
    def has_perm(self, perm, obj=None):
        """Check if user has permission"""
        if self.is_superuser:
            return True
        return False
    
    def has_module_perms(self, app_label):
        """Check if user has module permissions"""
        if self.is_superuser:
            return True
        return False
    
    def is_authenticated(self):
        return True
    
    def is_anonymous(self):
        return False
    
    @property
    def role(self):
        if self.is_superuser:
            return 'admin'
        elif self.is_teacher:
            return 'teacher'
        elif self.is_parent:
            return 'parent'
        else:
            return 'student'







