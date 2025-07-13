from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Create a Django user from Firebase user data'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to create')
        parser.add_argument('--teacher', action='store_true', help='Set user as teacher')
        parser.add_argument('--student', action='store_true', help='Set user as student')

    def handle(self, *args, **options):
        email = options['email']
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            self.stdout.write(f'User {email} already exists in Django database')
            
            # Update role if specified
            if options['teacher']:
                user.is_teacher = True
                user.is_student = False
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Updated {email} as teacher'))
            elif options['student']:
                user.is_teacher = False
                user.is_student = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Updated {email} as student'))
            
            return
        
        # Create new user
        try:
            username = email.split('@')[0]
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None  # No password since we're using Firebase auth
            )
            
            # Set role
            if options['teacher']:
                user.is_teacher = True
                user.is_student = False
            elif options['student']:
                user.is_teacher = False
                user.is_student = True
            else:
                # Default to student
                user.is_teacher = False
                user.is_student = True
            
            user.save()
            
            role = 'teacher' if user.is_teacher else 'student'
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created {email} as {role}')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating user: {str(e)}')
            ) 