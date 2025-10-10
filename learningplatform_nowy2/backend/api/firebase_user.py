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
        
        # New instructor roles
        self.is_tutor = kwargs.get('is_tutor', False)
        self.is_wychowawca = kwargs.get('is_wychowawca', False)
        self.is_nauczyciel_wspomagajacy = kwargs.get('is_nauczyciel_wspomagajacy', False)
        
        # Specialist roles
        self.is_psycholog = kwargs.get('is_psycholog', False)
        self.is_pedagog = kwargs.get('is_pedagog', False)
        self.is_logopeda = kwargs.get('is_logopeda', False)
        self.is_terapeuta = kwargs.get('is_terapeuta', False)
        self.is_bibliotekarz = kwargs.get('is_bibliotekarz', False)
        self.is_administrator = kwargs.get('is_administrator', False)
        
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
        elif self.is_tutor:
            return 'tutor'
        elif self.is_wychowawca:
            return 'wychowawca'
        elif self.is_nauczyciel_wspomagajacy:
            return 'nauczyciel_wspomagajacy'
        elif self.is_psycholog:
            return 'psycholog'
        elif self.is_pedagog:
            return 'pedagog'
        elif self.is_logopeda:
            return 'logopeda'
        elif self.is_terapeuta:
            return 'terapeuta'
        elif self.is_bibliotekarz:
            return 'bibliotekarz'
        elif self.is_administrator:
            return 'administrator'
        else:
            return 'student'









