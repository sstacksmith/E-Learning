from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Check and fix user teacher status'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to check')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"User: {user.email}")
            self.stdout.write(f"Username: {user.username}")
            self.stdout.write(f"is_teacher: {user.is_teacher}")
            self.stdout.write(f"is_student: {user.is_student}")
            self.stdout.write(f"is_superuser: {user.is_superuser}")
            
            # Ask if user wants to set as teacher
            if not user.is_teacher:
                self.stdout.write(self.style.WARNING(f"User {email} is not a teacher"))
                response = input("Do you want to set this user as a teacher? (y/n): ")
                if response.lower() == 'y':
                    user.is_teacher = True
                    user.is_student = False
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f"Successfully set {email} as teacher"))
                else:
                    self.stdout.write("No changes made")
            else:
                self.stdout.write(self.style.SUCCESS(f"User {email} is already a teacher"))
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"User with email {email} does not exist")) 